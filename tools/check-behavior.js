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
 *   FAIL 档案回环 —— 每个有数据的 il_* 键都要出现在备份里，并且清库后逐字节回来；
 *        非法输入不得覆盖既有数据，旧版扁平进度备份必须仍然导得进来
 *   FAIL 覆盖率 < --cover=（默认 90%）—— 分母是选择器命中的真控件数，
 *        分子是"确实被点过或确实被键入过"的数量；没点到的模块不算通过，
 *        这一条沿用 Round 18/19 的教训：闸门没量到 ≠ 没问题
 *   自证 内联 handler 收纳率 —— 打包器导回全局的名字里，有多少已经带上
 *        epoch 包装（壳层 guardInlineHandlers 的账）。这个数字是为了让
 *        "把包装删掉"这件事在报表里立刻可见，而不是只体现为泄漏数变多。
 *
 * Round 21 加的是第二件事：闸门自己从没答过一道题。
 * 这道闸门诞生以来，点击口径一直是 `button` / `[role=button]` / 文本框。但本库的测验主体
 * 长这样（实测清点）：
 *   <label class="opt-row"><input type="radio" name="bigo">   —— 题组选项，722 个 radio
 *   <div class="quiz-opt" onclick="answerQuiz(0,1,this)">     —— 手写题库，内联属性
 *   <select> / <input type="checkbox">                        —— 15 / 26 个
 * 没有一种落在旧选择器里。也就是说"读者答完一套题 → 记分 → 写进度 → 壳层判定掌握"
 * 这条**整站最核心的路径**，从未被任何裁判走过一遍。新增口径：
 *   答题 pass：radio 按 name 分组逐组作答（组内每个选项都点，第一支走"作答"，
 *              其余走"已作答被拒"）、checkbox 点一次、select 换值并派 change、
 *              内联 onclick 的非按钮元素全点
 *   提交 pass：题答完之后**再点一遍按钮**，这时"提交/检查答案"才看得见答案；
 *              一次只出一道题的模块（答完才冒出"下一题"）重复扫到 --qrounds= 轮
 *              为止。重置类按钮跳过，否则刚答完的题被自己抹掉，判据变成假阴性
 *   FAIL 答完题没写进度 —— 本轮遍历的**每个**模块都必须在 il_progress 里留下 quiz
 *              记录。分母不靠闸门"认题"：README 声明全库都有判分测验，
 *              那条声明由 tools/check-courses.js 对账过，所以这里没有"跳过"这一档
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
 *   node tools/check-behavior.js --no-quiz        复现 Round 20 口径（不答题、不二次提交）
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
const QMAX = parseInt(opt('qrounds', '6'), 10);    // 答题最多扫几轮（一轮内部已经会把整卷翻完）
const ONLY = opt('keys', '').split(',').map((x) => x.trim()).filter(Boolean);

const CTL_SEL = '#moduleRoot button, #moduleRoot [role="button"]';
const INPUT_SEL = '#moduleRoot input[type=text], #moduleRoot input:not([type]), #moduleRoot textarea';
/* Round 21：读者的输入远不止按钮。这四条把"答题"这条路纳进来（清点见文件头）。 */
const QUIZ = argv.indexOf('--no-quiz') < 0;
const RADIO_SEL = '#moduleRoot input[type=radio]';
const CHECK_SEL = '#moduleRoot input[type=checkbox]';
const SELECT_SEL = '#moduleRoot select';
const ONCLICK_SEL = '#moduleRoot [onclick]';
/* 题选项可能晚一步才出现（分页式测验每答一题重画一组），第二相按这个集合补点。 */
const OPT_SEL = '#moduleRoot [class*="quiz"] button, #moduleRoot [class*="quiz"] [onclick], ' +
  '#moduleRoot [class*="ilq"] label, #moduleRoot .ilq-opt, #moduleRoot .opt-row, ' +
  '#moduleRoot .quiz-option, #moduleRoot .opt';
/* 重置类跳过：否则刚答完的题被自己抹掉，判据自己变成假阴性。 */
const RESETISH = /重置|清空|重做|重来|重新|重试|再来|换一批|随机|Reset|Clear|Retry|Shuffle|New/i;
/* 翻页/交卷类按钮的文案指纹：第二相只认这些，避免把每点一次就重造的导航锚点当成新控件 */
const ANSWERISH = /下一题|下一关|下一步|提交|检查|确认|查看|完成|评分|结果|得分|Next|Submit|Check|Done|Finish/i;

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
    let qp = { groups: 0, options: 0, checks: 0, selects: 0, optrows: 0, clicks: 0, pages: 0, rounds: 0 };
    let rec = { quiz: false, score: null, total: null };
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

    /* ── Round 21：答题 pass ──
       上面两趟只走 button 和文本框。题组的真身是 radio / checkbox / select /
       内联 onclick 的 div，读者一天里点得最多的恰恰是它们。
       而且这些流程**不是一趟点完的**：一次只出一道题的模块（docker / compose /
       git 那一族），答完这题"下一题"按钮才存在，所以这里反复扫，直到本模块在
       il_progress 里留下 quiz 记录，或者界面不再有任何变化（静置）。 */
    if (QUIZ) {
      let prevSnap = null;
      for (let round = 0; round < QMAX; round++) {
        const s = await page.evaluate(async ([rad, chk, sel, onec, opt, btn, resetSrc, ansSrc, k]) => {
          const out = { groups: 0, options: 0, checks: 0, selects: 0, optrows: 0, clicks: 0, pages: 0 };
          const RESET = new RegExp(resetSrc, 'i');
          const ANSWER = new RegExp(ansSrc, 'i');
          const nap = (ms) => new Promise((r) => setTimeout(r, ms));
          const text = (el) => (el.textContent || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '');
          const clickable = (el) => el.disabled !== true && !RESET.test(text(el));
          const seen = new Set();

          /* 第一相：一趟就能点完的。radio 按 name 分组逐组作答——组内每一支都点下去，
             第一支走"作答"分支，其余走模块自己的"已作答就拒绝"分支，两条都是读者真会
             走到的路径。checkbox / select / 内联 onclick 的题选项 / 非重置按钮同相走完。 */
          const byName = new Map();
          document.querySelectorAll(rad).forEach((el) => {
            const kk = el.name || ('__noname_' + byName.size);
            if (!byName.has(kk)) byName.set(kk, []);
            byName.get(kk).push(el);
          });
          byName.forEach((opts) => {
            out.groups++;
            opts.forEach((el) => { seen.add(el); el.click(); out.options++; });
          });
          document.querySelectorAll(chk).forEach((el) => { seen.add(el); el.click(); out.checks++; });
          document.querySelectorAll(sel).forEach((el) => {
            if (el.options.length < 2) return;
            el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
            out.selects++;
          });
          document.querySelectorAll(onec).forEach((el) => {
            const t = el.tagName;
            if (t === 'BUTTON' || t === 'INPUT' || el.getAttribute('role') === 'button') return;
            if (!clickable(el)) return;
            seen.add(el); el.click(); out.optrows++;
          });
          document.querySelectorAll(btn).forEach((el) => {
            if (!clickable(el)) return;
            seen.add(el); el.click(); out.clicks++;
          });

          /* 第二相：翻页流。答完这一题，"下一题"这个按钮才存在；八题答完才有分数、
             才有 IL.record。这一相只追两类**新出现**的元素：测验容器里的选项，
             以及文案是"提交 / 下一题 / 查看结果"的按钮。
             为什么要把范围圈死：第一版写成"任何新出现的可点元素都点"，实测 docker
             一轮 240 步的预算被导航锚点"↓"吃光（每点一次就重造一个新节点），
             一道题都没答完。范围必须由测验语义圈出来，不能由 DOM 变化圈出来。 */
          for (let step = 0; step < 40; step++) {
            let moved = false;
            document.querySelectorAll(opt).forEach((el) => {
              if (seen.has(el) || !clickable(el)) return;
              seen.add(el); el.click(); moved = true; out.optrows++;
            });
            if (moved) await nap(90);
            document.querySelectorAll(btn).forEach((el) => {
              if (seen.has(el) || !clickable(el) || !ANSWER.test(text(el))) return;
              seen.add(el); el.click(); moved = true; out.pages++;
            });
            if (!moved) break;
            await nap(90);
          }

          let store = {};
          try { store = JSON.parse(localStorage.getItem('il_progress') || '{}'); } catch (e) { store = {}; }
          const g = store[k] || {};
          out.quiz = !!(g.quiz && typeof g.quiz.total === 'number');
          out.score = g.quiz && typeof g.quiz.score === 'number' ? g.quiz.score : null;
          out.total = g.quiz && typeof g.quiz.total === 'number' ? g.quiz.total : null;
          const r = document.getElementById('moduleRoot');
          out.sig = r ? (r.innerHTML.length + ':' + r.querySelectorAll('*').length) : 'none';
          out.snap = out.sig + '|' + JSON.stringify(g);
          return out;
        }, [RADIO_SEL, CHECK_SEL, SELECT_SEL, ONCLICK_SEL, OPT_SEL, CTL_SEL, RESETISH.source, ANSWERISH.source, c.key]);

        qp.groups += s.groups; qp.options += s.options; qp.checks += s.checks;
        qp.selects += s.selects; qp.optrows += s.optrows; qp.clicks += s.clicks; qp.pages += s.pages;
        qp.rounds++;
        rec = { quiz: s.quiz, score: s.score, total: s.total };
        if (rec.quiz) break;                                   /* 记录到手，收工 */
        if (s.snap === prevSnap) break;                        /* 界面和进度都不动了：静置 */
        prevSnap = s.snap;
        await page.waitForTimeout(260);
      }
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
      responded: respMod, quiz: qp, rec: rec });

    /* 归属：mark..mark2 是模块内，mark2..end 是离开后 */
    rows[rows.length - 1].onModMsgs = pool.slice(mark, mark2).map((x) => x.msg);
    rows[rows.length - 1].leakMsgs = pool.slice(mark2).map((x) => x.msg);
    rows[rows.length - 1].onModStacks = pool.slice(mark, mark2).map((x) => x.stack);
    rows[rows.length - 1].leakStacks = pool.slice(mark2).map((x) => x.stack);
    if (onMod || leaked) console.log('  !! ' + c.key.padEnd(13) + '模块内 ' + onMod + ' / 离开后 ' + leaked);
  }

  /* ── 壳层闭环：整份学习档案导出 → 清库 → 导入 ──
   * Round 20 钉住的是"别把进度搞丢"（任意一份合法 JSON 都会整库覆盖 il_progress，
   * 而 README 写着"含校验"）。Round 21 补另一头：那份备份只装了一种数据——收藏 /
   * 成就 / 今日目标 / 主题全不在里面，按钮却写着"导出进度"，读者以为自己有保障。
   * 于是这里量三件事：
   *   覆盖 本地每个有数据的 il_* 键都必须出现在 envelope.data 里（少一个 FAIL）
   *   回环 清库再导入，每个键逐字节回来；旧版扁平进度文件也照样要能导进来
   *   守卫 非法输入一个字节都不许动既有数据（对话框 dismiss 当"取消"同样不动） */
  const BACKUP_KEYS = ['il_progress', 'il_star', 'il_badges', 'il_goal', 'il_theme',
    'website-simulation-progress'];
  const ioProblems = [];
  const readAll = () => page.evaluate((ks) => {
    const out = {};
    ks.forEach((k) => { out[k] = localStorage.getItem(k); });
    return out;
  }, BACKUP_KEYS);
  const restore = (snap) => page.evaluate((s) => {
    Object.keys(s).forEach((k) => { if (s[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, s[k]); });
    location.hash = '#/';
  }, snap);
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
      localStorage.setItem('il_star', JSON.stringify([list[0].key, list[3].key, list[7].key]));
      localStorage.setItem('il_goal', JSON.stringify({ date: '2026-01-01', target: 7 }));
      localStorage.setItem('il_theme', 'dark');
      /* 建站仿真进度只有 web 模块自己会写，这里直接种一份，量的是"备份带不带得走它" */
      localStorage.setItem('website-simulation-progress',
        JSON.stringify({ domain: 'example.com', completedSteps: ['dns', 'ssl'], step: 3 }));
      location.hash = '#/';
    });
    /* 等壳层自己把 il_badges 算出来并写下去：成就是被 renderBadges 落盘的，
       闸门不许自己伪造一份——那样"备份覆盖到成就没有"这条判据就没人证过了。 */
    await page.waitForTimeout(900);
    const stateBefore = await readAll();
    const filled = BACKUP_KEYS.filter((k) => stateBefore[k] !== null && stateBefore[k] !== '');

    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#btnExport')]);
    const dump = path.join(os.tmpdir(), 'il-behavior-export.json');
    await dl.saveAs(dump);
    const exported = fs.readFileSync(dump, 'utf8');

    let env = null;
    try { env = JSON.parse(exported); } catch (e) { env = null; }
    if (!env) {
      ioProblems.push('导出的文件不是合法 JSON');
    } else {
      if (env.app !== 'interactive-learning' || env.kind !== 'backup') {
        ioProblems.push('导出文件没有自报家门（缺 app / kind 字段），导入侧无法区分它和别家的 JSON');
      }
      const dataKeys = Object.keys(env.data || {});
      if (dataKeys.indexOf('il_progress') < 0) ioProblems.push('导出文件里没有 il_progress');
      filled.forEach((k) => {
        if (dataKeys.indexOf(k) < 0) ioProblems.push('备份漏了 ' + k + '：本地有数据，导出文件里却没有');
      });
    }

    const putAndImport = async (body) => {
      fs.writeFileSync(dump, body);
      await (await page.$('#importFile')).setInputFiles(dump);
      await page.waitForTimeout(1400);
    };

    /* 1) 合法备份：清库后导入，每个键必须逐字节回来 */
    await page.evaluate(() => { localStorage.clear(); location.hash = '#/'; });
    await page.waitForTimeout(400);
    await putAndImport(exported);
    const stateAfter = await readAll();
    filled.forEach((k) => {
      if (stateAfter[k] !== stateBefore[k]) {
        ioProblems.push('合法备份导入后 ' + k + ' 与导出不一致（' +
          (stateAfter[k] || '').length + ' 字节 vs ' + stateBefore[k].length + ' 字节）');
      }
    });

    /* 2) 不像备份的输入：一个字节都不许动 */
    const junk = [
      ['数组', '[1,2,3]'],
      ['坏 JSON', '{not json'],
      ['陌生对象', '{"totally":"unknown","n":1}'],
      ['脏条目', '{"git":{"steps":"nope","quiz":{"score":"x"}}}'],
      ['空 envelope', '{"app":"interactive-learning","kind":"backup","version":1,"data":{}}'],
      ['假成就清单', '{"il_progress":{},"il_badges":["not-a-badge-id"]}'],
    ];
    for (const j of junk) {
      await restore(stateBefore);
      await page.waitForTimeout(400);
      await putAndImport(j[1]);
      const now = await readAll();
      filled.forEach((k) => {
        if (now[k] !== stateBefore[k]) {
          ioProblems.push(j[0] + '：导入后 ' + k + ' 被改写（判据：非法输入不得覆盖既有数据）');
        }
      });
    }

    /* 3) Round 20 的扁平文件（顶层就是 {模块key: {...}}）必须还能导进来：
          读者手里的旧备份不是垃圾，这条兼容性不-test 就没人知道它什么时候断的 */
    await page.evaluate(() => { localStorage.clear(); location.hash = '#/'; });
    await page.waitForTimeout(400);
    await putAndImport(stateBefore['il_progress']);
    const flatBack = await readAll();
    if (flatBack['il_progress'] !== stateBefore['il_progress']) {
      ioProblems.push('旧版扁平进度备份导不进来了（导入后 ' + (flatBack['il_progress'] || '').length +
        ' 字节 vs 原本 ' + stateBefore['il_progress'].length + ' 字节）');
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
  console.log('档案回环（每个 il_* 键逐字节回来 / 六类非法输入不得覆盖 / 旧版扁平文件仍可导入）: ' +
    (ioProblems.length ? ioProblems.length + ' 项不合格' : 'OK'));
  ioProblems.forEach((m) => console.log('  FAIL ' + m));
  console.log('点击覆盖率（点过的控件 / 命中的真控件）: ' + totalClicked + '/' + totalCtl + ' = ' + cov + '% / 下限 ' + COVER + '%');
  /* ── Round 21：答题这一维以前根本不在判据里 ──
     "答完题必须留下 quiz 记录"量的不是模块有没有病，而是**读者的主路径有没有被走通过**：
     题组答完 → 记分 → 写 il_progress → 壳层据此判定掌握 / 错题本 / 复习提醒。
     中间任何一环断（比如 IL.record 换了个 key、handler 挂在被回收的节点上），
     读者的表现是"我明明做完了题，进度条还是 0"。 */
  const totGroups = rows.reduce((s, r) => s + r.quiz.groups, 0);
  const totOptions = rows.reduce((s, r) => s + r.quiz.options, 0);
  const totOptrows = rows.reduce((s, r) => s + r.quiz.optrows, 0);
  const totChecks = rows.reduce((s, r) => s + r.quiz.checks, 0);
  const totSelects = rows.reduce((s, r) => s + r.quiz.selects, 0);
  const totClicks = rows.reduce((s, r) => s + r.quiz.clicks, 0);
  const totPages = rows.reduce((s, r) => s + r.quiz.pages, 0);
  const totRounds = rows.reduce((s, r) => s + r.quiz.rounds, 0);
  const noRecord = rows.filter((r) => !r.rec.quiz);
  console.log('答题覆盖: ' + totGroups + ' 个 radio 题组（点过 ' + totOptions + ' 个选项） + ' +
    totOptrows + ' 个题选项（内联 onclick / 翻页后新出现的）；checkbox ' + totChecks + ' 个、select ' +
    totSelects + ' 个换值；答后提交 ' + totClicks + ' 次 + 翻页/交卷 ' + totPages +
    ' 次（扫 ' + totRounds + ' 轮，上限 ' + QMAX + '/模块）' + (QUIZ ? '' : '（--no-quiz：本趟未执行）'));
  /* 分母是**本轮遍历的模块数**，不是"闸门认出来的有题模块数"：README 的
     "全部模块都有判分测验"由 check-courses 对账过（自带 + 挂载 = 全库），
     所以答完一遍还没写记录的，要么这条声明对它是假的，要么这条路径走不通。
     两种都是缺陷，没有"跳过"这一档。 */
  console.log('做完测验并在 il_progress 留下 quiz 记录: ' + (rows.length - noRecord.length) + '/' + rows.length);
  noRecord.forEach((r) => {
    console.log('  FAIL ' + r.key + '  点了 ' + r.quiz.groups + ' 组 radio / ' + r.quiz.options +
      ' 个选项 / ' + r.quiz.optrows + ' 个 onclick 题选项 / 翻页 ' + r.quiz.pages +
      ' 次（扫 ' + r.quiz.rounds + ' 轮），壳层却没有收到 quiz 记录');
  });
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
    (wholeLib && respPct < RESPOND) || silent.length > 0 || (QUIZ && noRecord.length > 0);
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
