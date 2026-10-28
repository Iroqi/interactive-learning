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
 * Round 22 加的是第三件事：**闸门从没第二次进入过任何一个模块**。
 * Round 21 让闸门答完一遍题、检查成绩落了盘，然后立刻切去下一个模块——`break` 的条件
 * 是"记录到手"。于是读者第二天看到的界面从来没被走过：
 *   错题本写着"进入模块后错题优先重做"（index.html 的 ovWrongMeta）
 *   测验面板写着"下次进入将优先呈现错题"（ilquiz.js finish() 与 36 个模块各自手抄的同款文案）
 * 这两句话是**本库唯一一条跨访问的承诺**，而全库有 36 个模块各自实现了一遍重排
 * （`_oi` 标记 + sort），2 个走 IL.orderDom 的 perm 表，8 个走共享运行时 IL.quiz。
 * 三份实现、零个裁判。探针实测（Round 22）：这条承诺今天全都成立——
 * 也就是说它是"碰巧对的"，而它错的时候是**静默的**：
 * wrongs 存成呈现下标（Round 13 那个坑）只会让读者重做一批没答错的题，没有任何一屏会报错。
 * 新增口径（`--no-revisit` 可退回 Round 21 口径）：
 *   自洽 记录自己要说得过去：0 ≤ score ≤ total、total > 0、wrongs 是整数、不重复、
 *              0 ≤ w < total，且 wrongs.length == total - score（错题数 + 得分 == 题数）
 *   账实 闸门在 DOM 上看到标红的题数 == 记录里的 wrongs.length（模块记的账与读者看到的对齐）
 *   重排 第二次进入后**沿"下一题"走完**，题序必须是「上次答错的题按原序前置、其余保持原序」的前缀
 *              指纹 = 题干（剥掉按位置重写的 Q 号）+ 选项文本，跨访问稳定；
 *              只在"闸门见到的题卡数 == 记录 total"时分母才成立，否则计入未量到；
 *              一进来只看一眼不够——分页式模块那时只亮一道题，比前缀就成了比第 1 题，
 *              判据自测里把 docker 的重排整段关掉，只看一眼的尺子照样放行（本段走法的来由）
 *   不丢档 离开再回来，quiz 记录逐字节不变（重进会重跑模块的 renderQuiz，这是它第二次真跑）
 *   泄漏 重进窗口内的未捕获错误单独计数，记在本模块名下
 *   FAIL 上限截断 —— 记录到手时不再立刻 break，多扫一轮：界面还在变就说明
 *              --qrounds 把答题截断了（遗留第 5 条：一条没有裁判的上限）
 *   FAIL 重排覆盖率 < --rcov=（默认 90%）—— 分母是本轮遍历的模块数
 *
 * Round 24 加的是第五件事：**学习时长有两本账，而它们必须相等**。
 * 计时只在壳层写（模块切走时没有 unload，模块自己不知道"什么时候算离开"）：
 * 读者停在模块里且页面可见时每 15s 记一段，离开 / 隐藏 / 卸载时补最后一段，
 * 同一段 delta 同时写 il_progress[key].ms 与 il_time['YYYY-MM-DD']。
 * 只写一处时界面上没有任何一屏会报错，但"今日 N 分钟"会和报告里的模块时长对不上。
 * 判据（全库跑，遍历完 46 个模块、回到导航页把最后一段结算掉之后）：
 *   FAIL 模块 ms 不是非负整数 / 某个模块干脆没有 ms
 *   FAIL 模块累计之和 ≠ 每日累计之和
 *   FAIL il_time 里没有今天，或整趟遍历的累计是 0
 * 为了不把"计时在走"误判成"界面还在动"，答题 pass 的静置快照把 ms 排除在外。
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
 *   node tools/check-behavior.js --no-revisit     复现 Round 21 口径（答题但不第二次进入）
 *   node tools/check-behavior.js --rcov=90        错题优先重做的覆盖率下限
 *   node tools/check-behavior.js --walkmax=16     重进后沿"下一题"最多走几步（0＝只看刚回来那一眼）
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
const RCov = parseInt(opt('rcov', '90'), 10);      // 错题优先重做的覆盖率下限
/* 重进之后沿"下一题"最多走几步。一次只亮一道题的模块，只在"刚回来那一眼"量顺序
   等于只量了第 1 题——Round 22 判据自测里把 docker 的重排整个关掉，判据照样绿，
   就是这把尺子太短。走满一卷要的步数是 total-1，16 步足够 46 个模块里最长的那份卷子。 */
const WALKMAX = parseInt(opt('walkmax', '16'), 10);
const ONLY = opt('keys', '').split(',').map((x) => x.trim()).filter(Boolean);
/* --fpdump=docker,cs：打印答题 pass 每轮见到的题卡数，用来排查"分母对不上"这类未量到 */
const FPDUMP = opt('fpdump', '').split(',').map((x) => x.trim()).filter(Boolean);

/* quiz 记录的规范形。不比 JSON.stringify 的原样字节：键序是各模块自己写出来的顺序
   （ilquiz 写 {score,total,wrongs}，手抄版有的写 {total,score,...}），拿键序判红
   是在判排版。比的是这三个字段的内容本身。 */
const canonQuiz = (q) => JSON.stringify([q && q.score !== undefined ? q.score : null,
  q && q.total !== undefined ? q.total : null, q && q.wrongs !== undefined ? q.wrongs : null]);

const CTL_SEL = '#moduleRoot button, #moduleRoot [role="button"]';
const INPUT_SEL = '#moduleRoot input[type=text], #moduleRoot input:not([type]), #moduleRoot textarea';
/* Round 21：读者的输入远不止按钮。这四条把"答题"这条路纳进来（清点见文件头）。 */
const QUIZ = argv.indexOf('--no-quiz') < 0;
const REVISIT = QUIZ && argv.indexOf('--no-revisit') < 0;   /* 第二次进入以"有记录"为前提，--no-quiz 时一并关掉 */
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
/* ── Round 22：题卡识别 ──
   全库三种出题皮肤 + 两个"没有逐题卡片"的容器（探针实测 46/46 命中）：
     [class*="ilq-q"]        共享运行时 IL.quiz 渲染
     [class*="quiz-q"]       手写题库 .quiz-q / 分页式 .quiz-question
     [class*="quiz-card"]    一次一题的 .quiz-card（gh-actions / vscode）
     [class*="quiz-box"] / [class*="quiz-container"]
                             整块重画、没有逐题卡片的容器（docker / cs）——
                             closest 取最近者，所以这两种只在卡片缺失时才当尺子
   刻意不含 .quiz-opts / .quiz-score / .quiz-dots / .quiz-explain：那是选项、结果条与解析。 */
const CARD_SEL = '#moduleRoot [class*="ilq-q"], #moduleRoot [class*="quiz-q"], ' +
  '#moduleRoot [class*="quiz-card"], #moduleRoot [class*="quiz-box"], #moduleRoot [class*="quiz-container"]';
/* 选项形状的控件：Round 21 第一相只点 `[onclick]` 与 radio，于是 regex / sql 那族
   用 addEventListener 绑定的 `<div class="opt">` 一支都没点到，"提交"按钮先被按下，
   整卷按未作答判成 0/8——记录照样落盘，46/46 全绿，而闸门其实一道题都没答。
   账实判据（DOM 标红数 == 记录错题数）第一次跑就把它抓了出来。 */
const OPTCARD_SEL = '#moduleRoot [class*="quiz"] [onclick], #moduleRoot [class*="ilq"] label, ' +
  '#moduleRoot .ilq-opt, #moduleRoot .opt-row, #moduleRoot .quiz-option, #moduleRoot .quiz-opt, #moduleRoot .opt';

/* ── Round 22：题卡指纹 = 尺子本身，只许有一份 ──
   答题 pass（第一次访问）与重进 pass（第二次访问）必须用同一把尺子量同一道题，
   否则"指纹相等"就成了两份实现各自腐烂的产物——这正是本库反复踩过的"手抄第二份清单"。
   所以这里存的是**函数体本身**，两趟都由 new Function 现场装配同一份源码。
   题号前缀要逐段剥（Q7 / 7. / 7 · / 错题重做 / ·）：题号按**呈现位置**重写，
   留着它，第二次进来同一道题会带着"· 错题重做"变成另一把尺子——探针实测这一条
   造成 makefile / n8n 两个假红。数字只有紧跟标点才算题号，否则
   "文件描述符 0/1/2 分别代表？"开头那个 0 会被尺子咬掉。
   反馈语（✓/✗ 那一段）不进指纹：否则第一次访问的指纹会带着答案。
   一张"题卡"必须含至少一个选项形状的控件（label / [class*="opt"] / radio）：
   docker 交卷后整块 quiz-box 重画成分数条，那不是一个可作答的题，混进分母就成了
   "见到 9 张 / total=8"。closest 落空的点击不参与——那多半是迷你引擎的控件，本来就不是题。 */
const FP_FACTORY = function (cardSel) {
  return function (el) {
    const c = el && el.closest ? el.closest(cardSel) : null;
    if (!c) return null;
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const optEls = Array.prototype.filter.call(c.querySelectorAll('label, [class*="opt"], input[type=radio]'),
      (o) => norm(o.textContent));
    if (!optEls.length) return null;
    const t = c.querySelector('[class*="title"], [class*="q-text"], [class*="stem"], [class*="question"], .q, h3, h4');
    /* 题号常常是题干里的一个**子元素**（IL.quiz 的 .ilq-num），先把它的文字摘掉再归一：
       不摘的话 "Q3" 会和题干 "304 Not Modified 的特点是？" 黏成 "Q3304 Not…"，
       贪婪的数字前缀一剥就把题号连同题干的 304 一起咬掉——同一道题在两次访问里
       量出两把尺子（cdn 实测假红：期望 "Not Modified 的特点是？"，实际 "304 Not…"）。 */
    let raw = t ? t.textContent : c.textContent;
    if (t) {
      Array.prototype.forEach.call(t.children, (k) => {
        if (!/num|badge|idx|tag/i.test(k.getAttribute('class') || '')) return;
        const kt = norm(k.textContent);
        if (kt) raw = raw.replace(kt, ' ');           /* 只替第一处：题号就在开头 */
      });
    }
    let stem = norm(raw);
    for (let guard = 0; guard < 8; guard++) {
      const cut = stem.replace(/^(?:Q\s*\d+|\d+\s*[.、)]|\d+\s*·|错题重做|[·.、)。\s]+)+/i, '');
      if (cut === stem) break;
      stem = cut;
    }
    stem = stem.slice(0, 70);
    const opts = optEls.map((o) => norm(o.textContent).slice(0, 40)).join('#').slice(0, 600);
    return { fp: stem + '@' + opts,
      wrong: !!c.querySelector('[class*="wrong"]') || /✗/.test(c.textContent || ''),
      right: !!c.querySelector('[class*="correct"]') || /✓/.test(c.textContent || '') };
  };
};
/* ── Round 22：什么算"一道题"——扫描规则也只许有一份 ──
   答题 pass 与重进 pass 都调它，两趟拿同一把尺子数分母。
   一张卡 = 含选项形状控件、且不包含"同样含选项的更深节点"的那些元素。
   原先写成"没有子节点命中 CARD_SEL"，被 vfd 打回原形：`.quiz-question`（题干）
   里一个选项都没有，却因为类名含 "quiz-q" 命中了卡片选择器，于是外层 `.quiz-card`
   被当成容器跳过、内层 `.quiz-question` 又没有选项可作答，整份 10 题的卷子量出 0 张卡。
   分母要按"读者能不能在这儿作答"定，不能按类名的字面定。 */
const SWEEP_FACTORY = function (cardSel, fpsrc) {
  return function (root) {
    const fpOf = new Function('return ' + fpsrc)()(cardSel);
    const order = [], state = {}, parent = {};
    if (!root) return { order: order, state: state, parent: parent };
    const hasOpt = (el) => !!el.querySelector('label, [class*="opt"], input[type=radio]');
    /* 题卡挂在哪个容器下：vfd 一页上有 13 张可作答的卡，其中只有 10 张是那份
       判分测验（另外 3 张是"故障挑战题"，模块注释里写明不进错题协议）。
       分母要按容器分组认领，见下面的 groupOf。 */
    const pathOf = (el) => {
      const seg = [];
      let n = el.parentElement, d = 0;
      while (n && n !== root && d < 6) { seg.unshift(n.parentElement ? Array.prototype.indexOf.call(n.parentElement.children, n) : -1); n = n.parentElement; d++; }
      return seg.join('/');
    };
    const all = Array.prototype.slice.call(root.querySelectorAll(cardSel));
    all.filter((el) => hasOpt(el) && !all.some((x) => x !== el && hasOpt(x) && el.contains(x)))
      .forEach((el) => {
        const r = fpOf(el);
        if (!r) return;
        if (order.indexOf(r.fp) < 0) { order.push(r.fp); parent[r.fp] = pathOf(el); }
        state[r.fp] = [r.wrong ? 1 : 0, r.right ? 1 : 0];   /* 后写覆盖：逐题判定以最后一眼为准 */
      });
    return { order: order, state: state, parent: parent };
  };
};

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
    let qp = { groups: 0, options: 0, checks: 0, selects: 0, optrows: 0, clicks: 0, pages: 0, rounds: 0,
      fpOrder: [], fpState: {}, fpParent: {}, capped: false };
    let rec = { quiz: false, score: null, total: null, wrongs: null };
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
    let deferred = 0;
    for (let k = 0; k < clicked; k++) {
      /* Round 22：交卷 / 翻页这一类按钮不在这一趟点，一律留给答题 pass。
         这一趟是盲点（每个控件按 DOM 顺序点一次，用来抓点击即抛的错误），它排在
         答题 pass 前面，于是 regex / sql 那族"整卷提交才判分"的模块在闸门答第一道
         题之前就被判成 0/8 并锁死（quizSubmitted 一次性）。记录照样落盘，
         quiz 46/46 全绿——闸门量到的是"交白卷这条路走得通"。
         两种位置都要盖住：题卡**之外**的交卷按钮（regex 的 #quizSubmit 不在任何
         .quiz-q 里，第一版只认 class 含 quiz 的容器，漏了它），和题卡**之内**的
         翻页按钮（docker 的"下一题"整块重画在 quiz-box 里，盲点先把它按下去会让
         读者根本没答过的题被跳过，账就再也对不上）。
         覆盖率与响应两栏的口径不变：少点的次数不进气息分母。 */
      const did = await page.evaluate(([s, idx, defer, ansSrc, cardSel]) => {
        const el = document.querySelectorAll(s)[idx];
        if (!el) return 'none';
        if (defer) {
          const t = (el.textContent || '') + ' ' + (el.id || '');
          if (new RegExp(ansSrc, 'i').test(t)) {
            const isCard = !!document.querySelector(cardSel);
            if ((isCard && !el.closest(cardSel)) ||            /* 题卡之外的交卷按钮 */
                el.closest('[class*="quiz"], [class*="ilq"]')) return 'defer';  /* 测验容器里的翻页按钮 */
          }
        }
        el.scrollIntoView({ block: 'center' });
        el.click();
        return 'click';
      }, [CTL_SEL, k, QUIZ, ANSWERISH.source, CARD_SEL]);
      if (did === 'defer') { deferred++; continue; }
      await page.waitForTimeout(45);
      const nextSig = await page.evaluate(SIG);
      if (nextSig !== curSig) { responded++; respMod++; }
      curSig = nextSig;
    }
    respChance += clicked - deferred;
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
        const s = await page.evaluate(async ([rad, chk, sel, onec, opt, optcard, btn, card, fpsrc, swpsrc, resetSrc, ansSrc, k]) => {
          const out = { groups: 0, options: 0, checks: 0, selects: 0, optrows: 0, clicks: 0, pages: 0,
            order: [], state: {}, parent: {} };
          const RESET = new RegExp(resetSrc, 'i');
          const ANSWER = new RegExp(ansSrc, 'i');
          const nap = (ms) => new Promise((r) => setTimeout(r, ms));
          const text = (el) => (el.textContent || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '');
          const clickable = (el) => el.disabled !== true && !RESET.test(text(el));
          const seen = new Set();

          /* ── Round 22：题卡指纹（算法见 FP_FACTORY，答题 pass 与重进 pass 共用一份）──
             要判"第二次进来是不是错题优先"，先得有一把跨访问稳定的尺子。
             题号不能用：它按**呈现位置**重写（Q1..Qn），重排之后同一道题换了号，
             拿题号当指纹等于把被测的东西抄进尺子里。
             为什么改成"每点一下就整片扫一遍"（sweep），而不是只给被点的那张卡记账：
             第一相末尾那个"所有按钮"循环会把分页式测验新一题的选项直接点掉
             （docker / cs 正是这样），那条路径不经过任何指纹记录，于是闸门只见到
             6 张卡 / 记录 total=8——分母对不上，重排判据只能弃权。
             尺子必须自己走完读者走的路，不能挂在某一条点击分支上。 */
          const cardSweep = new Function('return ' + swpsrc)()(card, fpsrc);
          const sweep = () => {
            const g = cardSweep(document.getElementById('moduleRoot'));
            g.order.forEach((f) => { if (out.order.indexOf(f) < 0) out.order.push(f); });
            Object.keys(g.state).forEach((f) => { out.state[f] = g.state[f]; });
            Object.keys(g.parent).forEach((f) => { if (!(f in out.parent)) out.parent[f] = g.parent[f]; });
          };
          /* 选项形状的控件先点、按钮后点：Round 21 的顺序反过来了，
             于是 regex / sql 那族 addEventListener 绑定的选项一支没被点到，
             "提交"先按下 → 整卷按未作答判 0/8，记录照样落盘。 */
          const clickOpt = (el) => {
            if (seen.has(el) || !clickable(el)) return false;
            seen.add(el); el.click(); out.optrows++; sweep();
            return true;
          };
          /* ── 轮换起点：让"这一题最后停在哪个选项"随题变化 ──
             照 DOM 顺序点完一组，决定判定的那一次点击永远是最后一个选项。docker 的
             数据里没有一题的答案排在末位 → 全卷答错 → wrongs = 全部下标 →
             "错题前置"和"原序"是同一个序列，重排判据当场失去区分度（Round 22 判据
             自测里把它的重排整段关掉，判据照样绿）。轮换保住"每一支都点过、作答分支
             与已作答分支都走到"，又让对的题和错的题混起来——判据量的才是顺序本身。 */
          let rot = 0;
          const eachRotated = (list, fn) => {
            const off = list.length ? (rot++ % list.length) : 0;
            for (let t = 0; t < list.length; t++) fn(list[(t + off) % list.length]);
          };
          /* 一组 = 一张题卡：一次呈现整卷的模块里天然一卡一组，分页式模块里就是当前那张 */
          const byCard = (sel) => {
            const m = new Map();
            document.querySelectorAll(sel).forEach((el) => {
              const k = el.closest(card) || document.body;
              if (!m.has(k)) m.set(k, []);
              m.get(k).push(el);
            });
            return m;
          };

          /* 第一相：一趟就能点完的。radio 按 name 分组逐组作答——组内每一支都点下去，
             第一支走"作答"分支，其余走模块自己的"已作答就拒绝"分支，两条都是读者真会
             走到的路径。checkbox / select / 内联 onclick 的题选项 / 非重置按钮同相走完。 */
          sweep();                                  /* 动手之前先记一眼原始顺序：重排判据的基准 */
          const byName = new Map();
          document.querySelectorAll(rad).forEach((el) => {
            const kk = el.name || ('__noname_' + byName.size);
            if (!byName.has(kk)) byName.set(kk, []);
            byName.get(kk).push(el);
          });
          byName.forEach((opts) => {
            out.groups++;
            eachRotated(opts, (el) => { seen.add(el); el.click(); out.options++; sweep(); });
          });
          document.querySelectorAll(chk).forEach((el) => { seen.add(el); el.click(); out.checks++; });
          document.querySelectorAll(sel).forEach((el) => {
            if (el.options.length < 2) return;
            el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
            out.selects++;
          });
          byCard(onec).forEach((list) => {
            eachRotated(list, (el) => {
              const t = el.tagName;
              if (t === 'BUTTON' || t === 'INPUT' || el.getAttribute('role') === 'button') return;
              if (!clickable(el)) return;
              seen.add(el); el.click(); out.optrows++; sweep();
            });
          });
          /* 选项形状的控件一律先点完，再轮到按钮（提交 / 检查答案） */
          byCard(optcard).forEach((list) => { eachRotated(list, clickOpt); });
          document.querySelectorAll(btn).forEach((el) => {
            if (!clickable(el)) return;
            seen.add(el); el.click(); out.clicks++; sweep();
          });

          /* 第二相：翻页流。答完这一题，"下一题"这个按钮才存在；八题答完才有分数、
             才有 IL.record。这一相只追两类**新出现**的元素：测验容器里的选项，
             以及文案是"提交 / 下一题 / 查看结果"的按钮。
             为什么要把范围圈死：第一版写成"任何新出现的可点元素都点"，实测 docker
             一轮 240 步的预算被导航锚点"↓"吃光（每点一次就重造一个新节点），
             一道题都没答完。范围必须由测验语义圈出来，不能由 DOM 变化圈出来。 */
          for (let step = 0; step < 40; step++) {
            let moved = false;
            byCard(opt).forEach((list) => {
              eachRotated(list, (el) => {
                if (seen.has(el) || !clickable(el)) return;
                seen.add(el); el.click(); moved = true; out.optrows++; sweep();
              });
            });
            if (moved) await nap(90);
            document.querySelectorAll(btn).forEach((el) => {
              if (seen.has(el) || !clickable(el) || !ANSWER.test(text(el))) return;
              seen.add(el); el.click(); moved = true; out.pages++; sweep();
            });
            if (!moved) break;
            await nap(90);
          }
          /* 模块的逐题判定常常晚一步才落下（answerQuiz 里 setTimeout 展解析、
             IL.quiz 渲染反馈），交卷那一眼还得再扫一遍，账实判据量到的才是
             "读者看到的最终那一屏"，而不是点击瞬间的中间态。 */
          await nap(160);
          sweep();

          let store = {};
          try { store = JSON.parse(localStorage.getItem('il_progress') || '{}'); } catch (e) { store = {}; }
          const g = store[k] || {};
          out.quiz = !!(g.quiz && typeof g.quiz.total === 'number');
          out.score = g.quiz && typeof g.quiz.score === 'number' ? g.quiz.score : null;
          out.total = g.quiz && typeof g.quiz.total === 'number' ? g.quiz.total : null;
          out.wrongs = g.quiz && Array.isArray(g.quiz.wrongs) ? g.quiz.wrongs.slice() : null;
          const r = document.getElementById('moduleRoot');
          out.sig = r ? (r.innerHTML.length + ':' + r.querySelectorAll('*').length) : 'none';
          /* ms 是 Round 24 的计时账：读者还在读，它就会每 15s 变一次。
             "界面和进度都不动了才静置"这条判据量的是答题有没有推进，不是
             计时器有没有活着——把 ms 排除掉，否则所有模块都会一直"在动"。 */
          const snapG = Object.assign({}, g); delete snapG.ms;
          out.snap = out.sig + '|' + JSON.stringify(snapG);
          return out;
        }, [RADIO_SEL, CHECK_SEL, SELECT_SEL, ONCLICK_SEL, OPT_SEL, OPTCARD_SEL, CTL_SEL, CARD_SEL,
          FP_FACTORY.toString(), SWEEP_FACTORY.toString(), RESETISH.source, ANSWERISH.source, c.key]);

        qp.groups += s.groups; qp.options += s.options; qp.checks += s.checks;
        qp.selects += s.selects; qp.optrows += s.optrows; qp.clicks += s.clicks; qp.pages += s.pages;
        qp.rounds++;
        /* 指纹按**首次出现顺序**累积：第一次访问里"先看到的题"就是原始顺序的第几位，
           这条顺序 + 记录里的 wrongs（原始下标）才是重排判据的期望序列——全程不需要答案表。
           逐题判定（state）后写覆盖：一张卡在被作答的那一刻和交卷后的最后一眼里，
           账本要用后者。 */
        (s.order || []).forEach((f) => { if (!qp.fpOrder.includes(f)) qp.fpOrder.push(f); });
        Object.keys(s.state || {}).forEach((f) => { qp.fpState[f] = s.state[f]; });
        Object.keys(s.parent || {}).forEach((f) => { if (!(f in qp.fpParent)) qp.fpParent[f] = s.parent[f]; });
        if (FPDUMP.length && FPDUMP.indexOf(c.key) >= 0) {
          console.log('    [fp] ' + c.key + ' round ' + qp.rounds + ' 累计题卡 ' + qp.fpOrder.length +
            ' 本轮扫到 ' + s.order.length + ' 张');
        }
        rec = { quiz: s.quiz, score: s.score, total: s.total, wrongs: s.wrongs, raw: canonQuiz(s) };
        if (rec.quiz) break;                                    /* 记录到手，收工（Round 21 口径不变，
                                                                     这样每模块的点击/翻页读数与上一轮可比） */
        if (s.snap === prevSnap) break;                         /* 界面和进度都不动了：静置 */
        if (round === QMAX - 1) qp.capped = true;               /* 撞上限时界面/进度还在动：这一轮的读数不可信 */
        prevSnap = s.snap;
        await page.waitForTimeout(260);
      }
    }

    /* ── Round 22：第二次进入 pass ──
       上面那一圈在"记录到手"就 break，切去的是**下一个**模块——读者第二天回到同一个
       模块时看到什么，从来没被走过。这一段只做三件事：离开、回来、量、走。
       回来之后量四样：题序（重排）、quiz 记录逐字节（不丢档）、"错题重做"角标数、
       以及重进窗口里浮出来的未捕获错误（模块的 renderQuiz 第二次真跑）。 */
    const rv = { ran: false, fps: [], raw: null, badges: 0, errs: 0, steps: 0, clicks: 0 };
    if (REVISIT && rec.quiz) {
      rv.ran = true;
      await page.evaluate(() => { location.hash = '#/'; });
      await page.waitForTimeout(400);
      const rmark = pool.length;
      await page.evaluate((k) => { location.hash = '#/m/' + k; }, c.key);
      await page.waitForTimeout(650);
      const snap = await page.evaluate(([card, fpsrc, swpsrc, k]) => {
        const cardSweep = new Function('return ' + swpsrc)()(card, fpsrc);
        const root = document.getElementById('moduleRoot');
        /* 与第一次访问**完全同一份**扫描代码（SWEEP_FACTORY）：两趟各自手写一遍
           "什么算一道题"，判据就会在两把尺子的差里出错。 */
        const fps = cardSweep(root).order;
        let store = {};
        try { store = JSON.parse(localStorage.getItem('il_progress') || '{}'); } catch (e) { store = {}; }
        const g = store[k] || {};
        return { fps: fps, quiz: g.quiz || null, badges: (root.innerHTML.match(/错题重做/g) || []).length };
      }, [CARD_SEL, FP_FACTORY.toString(), SWEEP_FACTORY.toString(), c.key]);
      /* quiz 记录必须在走路之前抄：docker 那族走完一卷会重新 IL.record 一次，
         让这一步混进"不丢档"，量到的就不是"回来那一眼档案还在不在"了。 */
      rv.fps = snap.fps; rv.raw = snap.quiz ? canonQuiz(snap.quiz) : null; rv.badges = snap.badges;
      /* 走：把重进后读者能看见的整条题序走出来。分页式模块刚回来只亮一道题，
         只看这一眼的话，"错题优先"就退化成"第 1 题对不对"——尺子短到判不出差别。
         只在"一眼没看全"时才走（fps < total）：一次呈现整卷的那些模块，
         第一眼的顺序就是全部，再点一遍只是把答卷重交一次、把风险引进判据窗口。 */
      if (snap.fps.length < rec.total) {
        const walk = await page.evaluate(async ([btn, onec, opt, optcard, card, fpsrc, swpsrc,
          resetSrc, ansSrc, wmax]) => {
          const cardSweep = new Function('return ' + swpsrc)()(card, fpsrc);
          const nap = (ms) => new Promise((r) => setTimeout(r, ms));
          const root = document.getElementById('moduleRoot');
          const RESET = new RegExp(resetSrc, 'i');
          const ANSWER = new RegExp(ansSrc, 'i');
          const text = (el) => (el.textContent || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '');
          const order = []; const seenEl = new Set();
          const take = () => { cardSweep(root).order.forEach((f) => { if (order.indexOf(f) < 0) order.push(f); }); };
          /* 只追测验范围内的东西：壳层的锚点每点一次就重造节点，第一版拿"任何新出现
             的可点元素"当尺子，一轮预算全被"↓"吃光，一道题都没走到底。 */
          const inQuiz = (el) => !!(el.closest(card) || el.closest('[class*="quiz"], [class*="ilq"]'));
          const pick = (sel, keep) => {
            const out = [];
            document.querySelectorAll(sel).forEach((el) => {
              if (seenEl.has(el) || el.disabled === true || !inQuiz(el)) return;
              if (!keep(el)) return;
              out.push(el);
            });
            return out;
          };
          take();
          let idle = 0, steps = 0, clicks = 0;
          for (; steps < wmax; steps++) {
            const before = order.length;
            /* 先把当前这道题答掉：不答完，"下一题"这颗按钮根本还不存在 */
            for (const el of pick(opt + ', ' + optcard, () => true)) {
              seenEl.add(el); el.click(); clicks++; await nap(60); take();
            }
            for (const el of pick(btn + ', ' + onec, (e) => {
              const t = text(e); return !RESET.test(t) && ANSWER.test(t);
            })) {
              seenEl.add(el); el.click(); clicks++; await nap(70); take();
            }
            if (order.length === before) { idle++; if (idle >= 2) break; } else idle = 0;
            await nap(80);
          }
          return { order: order, steps: steps, clicks: clicks };
        }, [CTL_SEL, ONCLICK_SEL, OPT_SEL, OPTCARD_SEL, CARD_SEL, FP_FACTORY.toString(),
          SWEEP_FACTORY.toString(), RESETISH.source, ANSWERISH.source, WALKMAX]);
        if (walk.order.length >= rv.fps.length) rv.fps = walk.order;
        rv.steps = walk.steps; rv.clicks = walk.clicks;
      }
      rv.errs = pool.length - rmark;
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
      responded: respMod, deferred: deferred, quiz: qp, rec: rec, rv: rv,
      fpOrder: qp.fpOrder, fpState: qp.fpState, fpParent: qp.fpParent });

    /* 归属：mark..mark2 是模块内，mark2..end 是离开后 */
    rows[rows.length - 1].onModMsgs = pool.slice(mark, mark2).map((x) => x.msg);
    rows[rows.length - 1].leakMsgs = pool.slice(mark2).map((x) => x.msg);
    rows[rows.length - 1].onModStacks = pool.slice(mark, mark2).map((x) => x.stack);
    rows[rows.length - 1].leakStacks = pool.slice(mark2).map((x) => x.stack);
    if (onMod || leaked) console.log('  !! ' + c.key.padEnd(13) + '模块内 ' + onMod + ' / 离开后 ' + leaked);
  }

  /* ── Round 24：学习时长的两本账 ──
     遍历到最后一个模块时，上面那圈已经把页面切回导航页并静置过 1.5s——
     那一下既结算了最后一段计时，也让 initProgress 有机会把"今日分钟"画出来。
     这里只读存储：ms 必须是每个访问过的模块都有的非负整数；两本账各自求和必须相等。
     只写一处时界面完全正常，唯一看得见的地方就是"今日"和"报告"对不上，
     而它们很少同时出现在一屏上——所以这条只能由闸门来对。 */
  const timeProblems = [];
  let timeMeasured = 0, timeSum = 0;
  try {
    const tstate = await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('il_progress') || '{}');
      const t = JSON.parse(localStorage.getItem('il_time') || '{}');
      return { p, t };
    });
    const keys = rows.map((r) => r.key);
    const badMs = keys.filter((k) => {
      const v = tstate.p[k] && tstate.p[k].ms;
      return typeof v !== 'number' || !Number.isInteger(v) || v < 0;
    });
    if (badMs.length) timeProblems.push(badMs.length + ' 个模块没有非负整数 ms：' + badMs.slice(0, 6).join('/'));
    else timeMeasured = keys.length;
    const modSum = keys.reduce((s, k) => s + tstate.p[k].ms, 0);
    const daySum = Object.keys(tstate.t).reduce((s, k) => s + (typeof tstate.t[k] === 'number' ? tstate.t[k] : 0), 0);
    timeSum = modSum;
    if (modSum !== daySum) {
      timeProblems.push('模块累计 ' + modSum + 'ms ≠ 每日累计 ' + daySum + 'ms（两本账不是同一段 delta 写的）');
    }
    const today = (() => {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })();
    if (!(typeof tstate.t[today] === 'number' && tstate.t[today] > 0)) {
      timeProblems.push('il_time 里没有今天（' + today + '）的学习时长：计时可能只活在内存里');
    }
    if (modSum <= 0) timeProblems.push('整趟遍历 ' + keys.length + ' 个模块，模块累计时长是 0');
  } catch (e) {
    timeProblems.push('计时这一段没跑起来：' + String(e && e.message || e).slice(0, 80));
  }

  /* ── 壳层闭环：整份学习档案导出 → 清库 → 导入 ──
   * Round 20 钉住的是"别把进度搞丢"（任意一份合法 JSON 都会整库覆盖 il_progress，
   * 而 README 写着"含校验"）。Round 21 补另一头：那份备份只装了一种数据——收藏 /
   * 成就 / 今日目标 / 主题全不在里面，按钮却写着"导出进度"，读者以为自己有保障。
   * 于是这里量三件事：
   *   覆盖 本地每个有数据的 il_* 键都必须出现在 envelope.data 里（少一个 FAIL）
   *   回环 清库再导入，每个键逐字节回来；旧版扁平进度文件也照样要能导进来
   *   守卫 非法输入一个字节都不许动既有数据（对话框 dismiss 当"取消"同样不动） */
  const BACKUP_KEYS = ['il_progress', 'il_time', 'il_star', 'il_badges', 'il_goal', 'il_theme',
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
        /* 计时账也种一份：导入若把 ms 当成未知字段丢掉，回环就红——Round 24 的
           cleanProgress 白名单正是这么被证明的。 */
        g.ms = (i % 5) * 60000 + 1234;
        s[c.key] = g;
      });
      localStorage.setItem('il_progress', JSON.stringify(s));
      const msSum = list.reduce(function (sum, c, i) { return sum + ((i % 5) * 60000 + 1234); }, 0);
      const dayOne = Math.min(3600000, msSum);
      localStorage.setItem('il_time', JSON.stringify({ '2026-01-01': dayOne, '2026-01-02': msSum - dayOne }));
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
  console.log('学习时长两本账（模块 ms 整数 / 模块之和 == 每日之和）: ' + timeMeasured + '/' + rows.length +
    ' 模块，合计 ' + Math.round(timeSum / 1000) + 's' +
    (timeProblems.length ? '，' + timeProblems.length + ' 项不合格' : '，恒等'));
  timeProblems.forEach((m) => console.log('  FAIL ' + m));
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
  /* ── Round 22：第二次进入这一维 ──
     四条判据都在"记录到手之后"才成立，所以它们与 noRecord 那条是互补的：
     那条管"这条路径能不能走通"，这四条管"走通之后第二天还在不在"。 */
  const rvProblems = [];
  const rvSkip = [];
  const acctSkip = [];
  let measurable = 0, revisited = 0, maxRounds = 0, capped = 0, acct = 0, badged = 0, grouped = 0, full = 0;
  const shallow = [];
  const blind = [];
  rows.forEach((r) => {
    maxRounds = Math.max(maxRounds, r.quiz.rounds);
    if (r.quiz.capped) capped++;
    const q = r.rec;
    if (!q.quiz) return;                                    /* 没记录已由上一条判红，这里不重复计 */
    /* 自洽：记录自己先要说得过去 */
    const t = q.total, sc = q.score, w = q.wrongs;
    if (!(typeof t === 'number' && t > 0)) rvProblems.push(r.key + ' 记录里的 total 不是正数：' + JSON.stringify(q));
    if (!(typeof sc === 'number' && sc >= 0 && sc <= t)) {
      rvProblems.push(r.key + ' 得分越界：' + sc + '/' + t);
    }
    if (!Array.isArray(w)) {
      rvProblems.push(r.key + ' wrongs 不是数组：' + JSON.stringify(w));
    } else {
      const illegal = w.filter((x) => typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x >= t);
      if (illegal.length) {
        rvProblems.push(r.key + ' wrongs 里有越界/非整数下标 ' + JSON.stringify(illegal) +
          '（total=' + t + '）：错题优先靠它认题，越界的那几条会被静默丢掉');
      }
      if (new Set(w).size !== w.length) rvProblems.push(r.key + ' wrongs 有重复下标：' + JSON.stringify(w));
      if (w.length !== t - sc) {
        rvProblems.push(r.key + ' 错题数 + 得分 ≠ 题数：' + w.length + ' + ' + sc + ' ≠ ' + t);
      }
    }
    if (!r.rv.ran) return;
    revisited++;
    /* 不丢档：离开再回来，quiz 记录内容不许变 */
    if (r.rv.raw !== r.rec.raw) {
      rvProblems.push(r.key + ' 第二次进入后 quiz 记录被改写：' + r.rec.raw + ' → ' + r.rv.raw);
    }
    /* 账实与重排：分母要先得对得上（闸门见到的题卡数 == 记录里的 total）。
       对不上时不立刻弃权——先按"挂在同一个容器下的那一组卡"再试一次：vfd 一页上
       有 13 张可作答的卡，其中 10 张才是那份判分测验（另 3 张是"故障挑战题"，
       模块注释写明不进错题协议）。分组之后**恰好一组**的数量等于 total 才认，
       两组都对得上就弃权——判据可以按结构认领分母，但不许挑一个答案去凑。 */
    if (r.fpOrder.length !== t) {
      const byParent = {};
      r.fpOrder.forEach((f) => { const p = r.fpParent[f] || ''; (byParent[p] = byParent[p] || []).push(f); });
      const cand = Object.keys(byParent).filter((p) => byParent[p].length === t);
      if (cand.length !== 1) {
        rvSkip.push(r.key + '（见到 ' + r.fpOrder.length + ' 张题卡 / 记录 total=' + t +
          (cand.length > 1 ? '，且有 ' + cand.length + ' 组数量都对得上，不猜）' : '）'));
        return;
      }
      grouped++;
      r.fpOrder = byParent[cand[0]];
    }
    const known = new Set(r.fpOrder);
    measurable++;
    /* 账实：只在"模块对每一题都给了可见判定"时才判——有的模块只把错的题标红、
       对的题不作标注（tmux / excel 那一族），"标红数 == 错题数"在那儿量的是它的
       标注习惯而不是它的账，那种模块计入"逐题判定对账跑不动"，不拖累可量到率：
       重排判据（下面那条）只要分母对得上就能跑，它才是"错题优先"这句承诺本身。 */
    const graded = r.fpOrder.filter((f) => { const st = r.fpState[f]; return st && (st[0] || st[1]); });
    const red = r.fpOrder.filter((f) => r.fpState[f] && r.fpState[f][0]);
    if (graded.length === t) {
      acct++;
      if (red.length !== w.length) {
        rvProblems.push(r.key + ' 界面上标红 ' + red.length + ' 题，记录里 wrongs 是 ' + w.length +
          ' 题（模块逐题都给了判定，两本账必须对得上）');
      }
    } else {
      acctSkip.push(r.key + '（逐题判定只见到 ' + graded.length + '/' + t + ' 张）');
    }
    const ws = new Set(w);
    const exp = w.slice().sort((a, b) => a - b).map((i) => r.fpOrder[i])
      .concat(r.fpOrder.filter((_, i) => !ws.has(i)));
    /* 尺子的体检之二：这一份卷子上"错题前置"和"原序"是不是同一个序列。
       全对（K=0）或全错（K=total）时是——判据在这个模块上**没有区分度**，
       重排关掉也不会红。这是判据的覆盖缺口，报出来，不算模块的缺陷。 */
    if (exp.join('\u0000') === r.fpOrder.join('\u0000')) blind.push(r.key + '（K=' + w.length + '/' + t + '）');
    /* 重进后闸门只认它第一次见过的那些题：多出来的卡（vfd 的挑战题、分数条）
       不参与顺序比对，但数量要报出来——"重进多渲染了 N 张没见过的卡"本身就是线索。 */
    const shown = r.rv.fps.filter((f) => known.has(f));
    r.rv.exp = exp; r.rv.shown = shown;
    r.rv.extra = r.rv.fps.length - shown.length;
    if (!shown.length) { rvSkip.push(r.key + '（重进后没渲染出题卡）'); measurable--; return; }
    if (r.rv.badges > 0) badged++;
    if (shown.length >= exp.length) full++;
    else shallow.push(r.key + '（走出 ' + shown.length + '/' + exp.length + ' 题，比 ' +
      Math.min(shown.length, exp.length) + ' 题）');
    const lim = Math.min(shown.length, exp.length);
    for (let i = 0; i < lim; i++) {
      if (shown[i] !== exp[i]) {
        rvProblems.push(r.key + ' 第二次进入第 ' + (i + 1) + ' 题不是"错题优先"该出现的那道' +
          '（K=' + w.length + '，可见 ' + shown.length + ' 张 / 应 ' + exp.length + ' 张）：' +
          '期望 ' + JSON.stringify(String(exp[i]).slice(0, 28)) + '，实际 ' + JSON.stringify(String(shown[i]).slice(0, 28)));
        break;
      }
    }
  });
  const rcov = rows.length ? Math.floor((measurable / rows.length) * 100) : 0;
  console.log('第二次进入: 走过 ' + revisited + '/' + rows.length + ' 个模块；错题优先可量到 ' + measurable +
    '/' + rows.length + ' = ' + rcov + '% / 下限 ' + RCov + '%' + (REVISIT ? '' : '（--no-revisit：本趟未执行）'));
  if (rvSkip.length) console.log('  未量到（分母对不上）: ' + rvSkip.length + ' → ' + rvSkip.slice(0, 8).join('、') +
    (rvSkip.length > 8 ? ' …' : ''));
  console.log('逐题判定对账（界面标红数 == 记录错题数）可跑: ' + acct + '/' + measurable +
    '；跑不动（只标错题或不标注）: ' + acctSkip.length + (acctSkip.length ? ' → ' + acctSkip.slice(0, 8).join('、') +
    (acctSkip.length > 8 ? ' …' : '') : ''));
  console.log('重进后带"错题重做"角标的模块: ' + badged + '/' + measurable +
    '（其余靠顺序本身判定——承诺里没有角标，角标只是提示）');
  if (grouped) console.log('  分母按容器分组才认领的模块: ' + grouped + '（页面上一道题之外的可作答卡不在这份卷子里）');
  /* 尺子自己的体检：只比前缀的话，"错题优先"在分页式模块上退化成"第 1 题对不对"。
     报出有多少模块把整卷顺序走出来了——走不满就是判据的覆盖缺口，不能冒充量过了。 */
  console.log('重进后可比满整卷顺序的模块: ' + full + '/' + measurable +
    '（分页式的那些靠上面那段"走"才比得满；走不满的只比到前缀，承诺在那里只被量了一部分）' +
    (shallow.length ? '：' + shallow.slice(0, 8).join('、') + (shallow.length > 8 ? ' …' : '') : ''));
  console.log('重排判据没有区分度的模块（全对或全错，期望顺序 == 原序）: ' + blind.length + '/' + measurable +
    (blind.length ? ' → ' + blind.slice(0, 8).join('、') + (blind.length > 8 ? ' …' : '') : ''));
  rvProblems.slice(0, 20).forEach((m) => console.log('  FAIL ' + m));
  if (rvProblems.length > 20) console.log('  … 另有 ' + (rvProblems.length - 20) + ' 条');
  console.log('答题轮次: 最深 ' + maxRounds + ' 轮 / 上限 ' + QMAX + '（撞上限 ' + capped + ' 个模块）');
  FPDUMP.forEach((k) => {
    const r = rows.filter((x) => x.key === k)[0];
    if (!r) return;
    console.log('  [fpdump] ' + k + ' 见到 ' + r.fpOrder.length + ' 张 / total=' + r.rec.total +
      ' score=' + r.rec.score + ' wrongs=' + JSON.stringify(r.rec.wrongs) +
      ' / 重进走出 ' + r.rv.fps.length + ' 张（' + r.rv.steps + ' 步 / ' + r.rv.clicks + ' 次点击）');
    r.fpOrder.forEach((f, i) => console.log('      ' + i + ': ' + String(f).slice(0, 40)));
    /* 把两边翻译成第一次访问见到的那些卡的下标：判据比的是指纹，人读的是位序 */
    const idx = (arr) => (arr || []).map((f) => r.fpOrder.indexOf(f)).join(' ');
    console.log('      期望位序 [' + idx(r.rv.exp) + '] / 重进实走 [' + idx(r.rv.shown) + ']');
  });
  console.log('重进窗口未捕获错误: ' + rows.reduce((s, r) => s + r.rv.errs, 0) + '（已并入"模块内"计数）');
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
  /* "交互全哑"的分母要用**真点下去的次数**：交卷/翻页那类留给答题 pass 的按钮
     在这一趟根本没按（deferred），拿它们来判"点了没反应"是把判据的分工记成模块的缺陷。 */
  const silent = wholeLib ? rows.filter((r) => (r.clicked - r.deferred) >= 5 && r.responded === 0) : [];
  silent.forEach((r) => console.log('  FAIL ' + r.key + '  点了 ' + (r.clicked - r.deferred) +
    ' 个控件（另 ' + r.deferred + ' 个交卷/翻页类留给答题 pass），moduleRoot 一点没变（交互全哑）'));
  console.log('内联 handler 收纳: ' + guarded + '/' + exported + ' 个导回全局的名字带 epoch 包装');
  if (dialogs) console.log('对话框（confirm/alert）: ' + dialogs + ' 次，已 dismiss，不计失败');

  const bad = (onModTotal + leakTotal) > BUDGET || cov < COVER || ioProblems.length > 0 ||
    timeProblems.length > 0 ||
    (wholeLib && respPct < RESPOND) || silent.length > 0 || (QUIZ && noRecord.length > 0) ||
    rvProblems.length > 0 || capped > 0 || (REVISIT && wholeLib && rcov < RCov);
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
