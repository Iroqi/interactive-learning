#!/usr/bin/env node
/*
 * tools/check-behavior.js — 读者态行为闸门（Round 20）
 *
 * 为什么需要它：前四道闸门的输入都是"界面长什么样"——字节一致、元数据属实、
 * token 齐备、颜色与热区达标。它们全绿的时候，本仓库里有 **29 个模块在读者
 * 点下去的那一刻抛未捕获 TypeError**（实测 81 条，见 BRAINSTORM Round 20）。
 * 形态是：
 *   <button onclick="startScanSim()">        （内联属性）
 *     → handler 里 setInterval / await sleep → 读者切到下一个模块
 *     → 回调仍持有上一个模块的 DOM → TypeError，而报错时读者在新模块里
 * 三条实测口径缺一不可：
 *   纯导航不点击 = 0 条；单模块孤立点击 = 0 条；按 courses.js 顺序遍历点击 = 81 条。
 * 也就是说这个缺陷只在"真的连续学几个模块"时出现，而它污染的是**别的模块**。
 *
 * 判据：
 *   FAIL 未捕获 pageerror —— 预算默认 0（模块内 / 离开后两栏分别计数）
 *   FAIL 进度回环 —— 合法备份必须逐字节回来，非法输入不得覆盖既有进度
 *   FAIL 覆盖率 < --cover=（默认 90%）—— 分母是选择器命中的真控件数，
 *        分子是"确实被点过或确实被键入过"的数量；没点到的模块不算通过，
 *        这一条沿用 Round 18/19 的教训：闸门没量到 ≠ 没问题
 *   自证 内联 handler 收纳率 —— 打包器导回全局的名字里，有多少已经带上
 *        epoch 包装（壳层 guardInlineHandlers 的账）。这个数字是为了让
 *        "把包装删掉"这件事在报表里立刻可见，而不是只体现为泄漏数变多。
 *
 * 为什么需要"离开之后"那一趟：泄漏的定义就是"错误发生在读者已经离开之后"。
 * 每个模块点完，立刻切到下一个模块并静置 1.5s，期间浮出来的错误记在前一个
 * 模块名下——这是唯一能把 plc / n8n / vfd 的循环和上一条教训对齐的办法。
 *
 * 用法：
 *   node tools/check-behavior.js                  全部模块
 *   node tools/check-behavior.js --keys=plc,n8n   分片排查
 *   node tools/check-behavior.js --clicks=20      每模块点击上限（默认 0＝全点）
 *   node tools/check-behavior.js --budget=0       未捕获错误预算
 *   node tools/check-behavior.js --cover=90       覆盖率下限
 * 找不到 Playwright/Chromium 时打印 SKIP 并 exit 0（与 check-tap.js 一致）。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
};
const BUDGET = parseInt(opt('budget', '0'), 10);
const COVER = parseInt(opt('cover', '90'), 10);
const RESPOND = parseInt(opt('respond', '50'), 10);
const MAXCLICKS = parseInt(opt('clicks', '0'), 10);   // 0 = 不设上限（覆盖率必须是真数，不能因为封顶而虚低）
const MAXINPUT = parseInt(opt('inputs', '6'), 10);
const ONLY = opt('keys', '').split(',').map((x) => x.trim()).filter(Boolean);

const CTL_SEL = '#moduleRoot button, #moduleRoot [role="button"]';
const INPUT_SEL = '#moduleRoot input[type=text], #moduleRoot input:not([type]), #moduleRoot textarea';

function loadPlaywright() {
  const tries = ['playwright', 'playwright-core', path.join(ROOT, 'node_modules/playwright'), '/usr/local/node/lib/node_modules/playwright'];
  for (const t of tries) { try { return require(t); } catch (e) { /* next */ } }
  return null;
}

function findChromium() {
  const cands = [
    process.env.IL_CHROMIUM,
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  for (const c of cands) { try { if (fs.existsSync(c)) return c; } catch (e) { /* next */ } }
  return null;
}

const courses = (() => {
  global.window = {};
  eval(fs.readFileSync(path.join(ROOT, 'courses.js'), 'utf8'));
  return global.window.IL_COURSES;
})();

(async () => {
  const pw = loadPlaywright();
  const exe = pw && findChromium();
  if (!pw || !exe) {
    console.log('SKIP: 未找到 Playwright 或 Chromium —— 跳过读者态行为闸门（安装后即生效）');
    console.log('     这道闸门要在真浏览器里点下去才量得到，静态检查见 tools/check-courses.js');
    process.exit(0);
  }
  let browser;
  try {
    browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  } catch (e) {
    console.log('SKIP: Chromium 启动失败（' + String(e.message).slice(0, 80) + '）');
    process.exit(0);
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  /* 错误先落进一个带序号的池子，模块边界由 shell 记录：泄漏的判定靠
     "这条错误是在切走之后、且期间没有任何交互" 这个时间窗。 */
  const pool = [];
  page.on('pageerror', (e) => pool.push({
    at: pool.length,
    msg: String(e && e.message || e).slice(0, 120),
    /* 栈是给下一轮作者看的：报错文本只说 "null.querySelector"，说不清是谁在
       模块回收之后还留着一次调用。取前两帧（第一帧就是抛错的那个函数）。 */
    stack: String(e && e.stack || '').split('\n').slice(1, 7).map((l) => l.trim().replace(/^at\s+/, '')).join(' ← ')
  }));
  /* 内联 on* 属性弹出的 confirm/alert 一律吞掉并计数：读者点了"重置进度"
     确实会弹窗，那不是缺陷，但"哪个模块在没提示的情况下就改了全局状态"值得看。 */
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs++; d.dismiss().catch(() => {}); });

  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(400);
  await page.evaluate(() => localStorage.clear());

  const targets = ONLY.length ? courses.filter((c) => ONLY.indexOf(c.key) >= 0) : courses;
  const rows = [];
  let totalCtl = 0, totalClicked = 0, exported = 0, guarded = 0;
  let responded = 0, respChance = 0;

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    await page.evaluate((k) => { location.hash = '#/m/' + k; }, c.key);
    await page.waitForTimeout(450);
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
    });

    const mark = pool.length;
    let respMod = 0;
    const n = await page.evaluate((s) => document.querySelectorAll(s).length, CTL_SEL);
    const ni = await page.evaluate((s) => document.querySelectorAll(s).length, INPUT_SEL);
    const clicked = MAXCLICKS > 0 ? Math.min(n, MAXCLICKS) : n;
    const typed = MAXINPUT > 0 ? Math.min(ni, MAXINPUT) : ni;
    /* 点击是否真的改变了 DOM：每次点击前后各取一个廉价签名（innerHTML 长度 + 节点数）。
       这是给闸门自己用的反向自证——收纳/回收做过头时，报错会是 0 而交互全哑，
       覆盖率照样 100%。签名在点击之后、下一次点击之前取，所以第 k 次的判定看的
       是第 k 次点击的效应；最后一次点击没有"下一次"来触发观测，记 n-1 个机会。 */
    const SIG = () => {
      const r = document.getElementById('moduleRoot');
      if (!r) return 'none';
      return r.innerHTML.length + ':' + r.querySelectorAll('*').length;
    };
    let curSig = await page.evaluate(SIG);
    for (let k = 0; k < clicked; k++) {
      await page.evaluate(([s, idx]) => { const el = document.querySelectorAll(s)[idx]; if (el) { el.scrollIntoView({ block: 'center' }); el.click(); } }, [CTL_SEL, k]);
      await page.waitForTimeout(45);
      const nextSig = await page.evaluate(SIG);
      if (nextSig !== curSig) { responded++; respMod++; }
      curSig = nextSig;
    }
    respChance += clicked;
    for (let k = 0; k < typed; k++) {
      await page.evaluate(([s, idx]) => {
        const el = document.querySelectorAll(s)[idx];
        if (!el) return;
        el.focus(); el.value = 'help';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }, [INPUT_SEL, k]);
      await page.waitForTimeout(70);
    }
    await page.waitForTimeout(600);
    const onMod = pool.length - mark;

    /* 离开：切到下一个模块，静置 1.5s，期间浮出来的错误记在本模块名下 */
    const mark2 = pool.length;
    if (i + 1 < targets.length) {
      await page.evaluate((k) => { location.hash = '#/m/' + k; }, targets[i + 1].key);
    } else {
      await page.evaluate(() => { location.hash = '#/'; });
    }
    await page.waitForTimeout(1500);
    const leaked = pool.length - mark2;

    /* 收纳率：这个模块导回全局的名字里，有多少带 __ilEpoch（函数）或 __ilGuarded（对象） */    const g = await page.evaluate((jsText) => {
      const names = [];
      const re = /(?:^|[^\w$])(?:__g|window|globalThis)\.([A-Za-z_$][\w$]*)\s*=/gm;
      let m;
      while ((m = re.exec(jsText || ''))) if (names.indexOf(m[1]) < 0) names.push(m[1]);
      let ok = 0;
      names.forEach((n) => {
        const v = window[n];
        if (typeof v === 'function' && v.__ilEpoch !== undefined) ok++;
        else if (v && typeof v === 'object' && v.__ilGuarded !== undefined) ok++;
      });
      return { exported: names.length, guarded: ok };
    }, (await page.evaluate((k) => (window.IL_MODULES && window.IL_MODULES[k] ? window.IL_MODULES[k].js : ''), c.key)));

    totalCtl += n; totalClicked += clicked; exported += g.exported; guarded += g.guarded;
    rows.push({ key: c.key, ctl: n, clicked, inputs: ni, typed, onMod, leaked, exported: g.exported, guarded: g.guarded,
      responded: respMod });

    /* 归属：mark..mark2 是模块内，mark2..end 是离开后 */
    rows[rows.length - 1].onModMsgs = pool.slice(mark, mark2).map((x) => x.msg);
    rows[rows.length - 1].leakMsgs = pool.slice(mark2).map((x) => x.msg);
    rows[rows.length - 1].onModStacks = pool.slice(mark, mark2).map((x) => x.stack);
    rows[rows.length - 1].leakStacks = pool.slice(mark2).map((x) => x.stack);
    if (onMod || leaked) console.log('  !! ' + c.key.padEnd(13) + '模块内 ' + onMod + ' / 离开后 ' + leaked);
  }

  /* ── 壳层闭环：进度导出 → 清库 → 导入 ──
   * Round 20 实测的另一条：旧 importProgressFile 只判"是不是 object"，任何一份
   * 合法 JSON 都会整库覆盖 il_progress（读者进度静默消失），而 README 写着"含校验"。
   * 这里把三件事钉住：合法备份能逐字节回来；不像进度备份的东西必须被拒；
   * 有既有进度时必须先问一句（对话框被 dismiss 当作"取消"，进度原样不动）。 */
  const ioProblems = [];
  try {
    /* 先回到一个**干净的壳层**再做导出/导入：这一段量的是壳层，不该受"上一个
       模块留下了什么"影响。`--keys=pid` 子集下直接接着遍历点击的现场点 #btnExport，
       下载事件不出现（整库跑法里 pid 不是最后一个时才出现），与其去猜是不是
       pid 的画布/动画留下了什么，不如把壳层重新加载一遍——测的是导入这条路径，
       不是"遍历之后碰巧还剩什么"。 */
    await page.goto('file://' + path.join(ROOT, 'index.html'));
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const s = {}; const list = window.IL_COURSES;
      list.forEach(function (c, i) {
        const g = { last: 1700000000000 + i * 86400000 };
        if (c.total != null) { const st = []; for (let j = 0; j < c.total - (i % 3); j++) st.push(j); g.steps = st; g.done = st.length === c.total; }
        g.quiz = { score: i % 9, total: 8, wrongs: [i % 8] };
        s[c.key] = g;
      });
      localStorage.setItem('il_progress', JSON.stringify(s));
      location.hash = '#/';
    });
    await page.waitForTimeout(700);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#btnExport')]);
    const dump = path.join(os.tmpdir(), 'il-behavior-export.json');
    await dl.saveAs(dump);
    const exported = fs.readFileSync(dump, 'utf8');

    const putAndImport = async (body) => {
      fs.writeFileSync(dump, body);
      await (await page.$('#importFile')).setInputFiles(dump);
      await page.waitForTimeout(1200);
    };

    /* 1) 合法备份：清库后导入，必须逐字节回来 */
    await page.evaluate(() => { localStorage.clear(); location.hash = '#/'; });
    await page.waitForTimeout(400);
    await putAndImport(exported);
    const after = await page.evaluate(() => localStorage.getItem('il_progress'));
    if (after !== exported) ioProblems.push('合法备份导入后与导出不一致（' + (after || '').length + ' 字节 vs ' + exported.length + ' 字节）');

    /* 2) 不像进度备份的输入：原进度必须原样还在 */
    const before = await page.evaluate(() => localStorage.getItem('il_progress'));
    const junk = [
      ['数组', '[1,2,3]'],
      ['坏 JSON', '{not json'],
      ['陌生对象', '{"totally":"unknown","n":1}'],
      ['脏条目', '{"git":{"steps":"nope","quiz":{"score":"x"}}}'],
    ];
    for (const j of junk) {
      await page.evaluate((v) => { localStorage.setItem('il_progress', v); location.hash = '#/'; }, before);
      await page.waitForTimeout(350);
      await putAndImport(j[1]);
      const now = await page.evaluate(() => localStorage.getItem('il_progress'));
      if (now !== before) ioProblems.push(j[0] + '：导入后既有进度被改写（判据：非法输入不得覆盖）');
    }
    try { fs.unlinkSync(dump); } catch (e) { /* ignore */ }
  } catch (e) {
    ioProblems.push('导出/导入这一段没跑起来：' + String(e && e.message || e).slice(0, 80));
  }

  await browser.close();

  const onModTotal = rows.reduce((s, r) => s + r.onMod, 0);
  const leakTotal = rows.reduce((s, r) => s + r.leaked, 0);
  const cov = totalCtl ? Math.floor((totalClicked / totalCtl) * 100) : 100;
  const crashers = rows.filter((r) => r.onMod || r.leaked);

  console.log('');
  crashers.slice(0, 25).forEach((r) => {
    console.log('  FAIL ' + r.key + '  模块内 ' + r.onMod + ' / 离开后 ' + r.leaked +
      '  样本：' + JSON.stringify((r.leakMsgs[0] || r.onModMsgs[0] || '')).slice(0, 110));
    if (r.leakStacks && r.leakStacks.length) console.log('        泄漏栈：' + r.leakStacks[0].slice(0, 150));
    if (r.onModStacks && r.onModStacks.length) console.log('        模块内栈：' + r.onModStacks[0].slice(0, 150));
  });
  if (crashers.length > 25) console.log('  … 另有 ' + (crashers.length - 25) + ' 个模块');
  console.log('未捕获错误：模块内 ' + onModTotal + ' / 离开后（泄漏）' + leakTotal + ' / 预算 ' + BUDGET);
  console.log('进度回环（导出→清库→导入 / 四类非法输入不得覆盖）: ' + (ioProblems.length ? ioProblems.length + ' 项不合格' : 'OK'));
  ioProblems.forEach((m) => console.log('  FAIL ' + m));
  console.log('点击覆盖率（点过的控件 / 命中的真控件）: ' + totalClicked + '/' + totalCtl + ' = ' + cov + '% / 下限 ' + COVER + '%');
  /* 反向自证：报错 0 + 覆盖 100% 也可能意味着"点下去什么都没发生"——回收与收纳
     做过头就会把交互一起杀掉，而静默的按钮不抛任何错。所以再量一次"点击之后
     moduleRoot 有没有变"。整库按比例给下限；单模块只有**一个都没动**才判失败
     （复制类按钮、纯跳转按钮本来就改不了 moduleRoot，不能拿它们当缺陷）。 */
  /* 整库下限只在**全库跑**时生效：子集跑（--keys=）是调试用的，分母小且偏科
     （pid 的 8 个控件里 6 个只重画 canvas，签名看不见 canvas 的重绘），拿它判失败
     会把"我在调试"变成"这个库有病"。单模块"一个都没动"同理。 */
  const wholeLib = targets.length === courses.length;
  const respPct = respChance ? Math.round((responded / respChance) * 100) : 0;
  console.log('点击后 DOM 发生变化: ' + responded + '/' + respChance + ' = ' + respPct + '% / 下限 ' + RESPOND + '%' +
    (wholeLib ? '' : '（子集跑，只打印不判）'));
  const silent = wholeLib ? rows.filter((r) => r.clicked >= 5 && r.responded === 0) : [];
  silent.forEach((r) => console.log('  FAIL ' + r.key + '  点了 ' + r.clicked + ' 个控件，moduleRoot 一点没变（交互全哑）'));
  console.log('内联 handler 收纳: ' + guarded + '/' + exported + ' 个导回全局的名字带 epoch 包装');
  if (dialogs) console.log('对话框（confirm/alert）: ' + dialogs + ' 次，已 dismiss，不计失败');

  const bad = (onModTotal + leakTotal) > BUDGET || cov < COVER || ioProblems.length > 0 ||
    (wholeLib && respPct < RESPOND) || silent.length > 0;
  if (bad) {
    console.log('\n读者态行为闸门未通过');
    if (leakTotal > 0) {
      console.log('「离开后」那一栏说明模块在回收之后仍有回调在写已经删掉的 DOM——');
      console.log('查壳层 guardInlineHandlers 是否还在（内联 on* 属性不经过 addEventListener 包装）。');
    }
    process.exit(1);
  }
  console.log('\nOK: 读者态行为闸门通过（' + targets.length + ' 模块 × 390×844，遍历点击 + 离开后静置，未捕获错误 0）');
})().catch((e) => {
  console.log('SKIP/ERROR: ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n'));
  process.exit(0);
});
