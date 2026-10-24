#!/usr/bin/env node
/*
 * Validate courses.js against the rest of the repo.
 *
 * courses.js is the single source of truth for cards, counts and the footer,
 * but nothing used to check it, and three classes of drift piled up:
 *   - `size` labels are hand-typed and 44/45 had drifted from the real file
 *     size (vfd claimed 75 KB, modules/vfd.js is 114 KB)
 *   - the search box only matched title+desc, so 15/45 modules could not be
 *     found by their own key; `tags` fix that, but a tag that does not appear
 *     in the module is a promise the module does not keep
 *   - `progress`/`total` must stay paired, and a declared `total` must be
 *     backed by a module that actually writes steps
 *   - ids must be unique inside a module and must not shadow a shell id
 *     (Round 19: web shipped a nested `id="test-results"` duplicate — a node
 *     no script could ever reach)
 *
 * Usage: node tools/check-courses.js
 * Exit 0 = clean, 1 = problems listed on stdout.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATS = ['devops', 'cs', 'automation', 'tools'];

function loadCourses() {
  const code = fs.readFileSync(path.join(ROOT, 'courses.js'), 'utf8');
  const win = {};
  const prev = global.window;
  global.window = win;
  try {
    // eslint-disable-next-line no-eval
    eval(code);
  } finally {
    global.window = prev;
  }
  return win.IL_COURSES;
}

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; }
}

const courses = loadCourses();
const problems = [];
const note = (m) => problems.push(m);

/* ── 1. shape and uniqueness ── */
const keys = courses.map((c) => c.key);
keys.forEach((k, i) => {
  if (!k) note(`courses[${i}] 缺少 key`);
  if (k && keys.indexOf(k) !== i) note(`重复 key: ${k}`);
});
courses.forEach((c) => {
  if (CATS.indexOf(c.cat) === -1) note(`${c.key}: 未知分类 ${c.cat}`);
  if (!c.title) note(`${c.key}: 缺少 title`);
  if (!c.desc) note(`${c.key}: 缺少 desc`);
});

/* ── 2. files referenced actually exist ── */
courses.forEach((c) => {
  if (!c.key) return;
  if (!fs.existsSync(path.join(ROOT, 'src', c.key + '-interactive.html'))) note(`${c.key}: src/${c.key}-interactive.html 不存在`);
  if (!fs.existsSync(path.join(ROOT, 'modules', c.key + '.js'))) note(`${c.key}: modules/${c.key}.js 不存在（忘了跑 pack-modules.py？）`);
});
fs.readdirSync(path.join(ROOT, 'src'))
  .filter((f) => f.endsWith('-interactive.html'))
  .map((f) => f.replace(/-interactive\.html$/, ''))
  .filter((k) => keys.indexOf(k) === -1)
  .forEach((k) => note(`src/${k}-interactive.html 存在但未登记进 courses.js`));
fs.readdirSync(path.join(ROOT, 'modules'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => f.replace(/\.js$/, ''))
  .filter((k) => keys.indexOf(k) === -1)
  .forEach((k) => note(`modules/${k}.js 存在但未登记进 courses.js`));

/* ── 3. size labels must match the packed module ── */
courses.forEach((c) => {
  if (!c.key) return;
  const p = path.join(ROOT, 'modules', c.key + '.js');
  if (!fs.existsSync(p)) return;
  const real = Math.round(fs.statSync(p).size / 1024);
  const claim = parseInt(String(c.size || '').replace(/[^\d]/g, ''), 10);
  if (!c.size) { note(`${c.key}: 缺少 size`); return; }
  if (isNaN(claim)) { note(`${c.key}: size 无法解析（${c.size}）`); return; }
  /* 判据收紧为"精确相等"：±1 的容差与 smoke 里那条 exact 检查互相矛盾，
     于是 CI 绿、本地红（yaml 46 vs 47、plc 83 vs 84 就是这么溜过去的）。
     size 本来就是脚本自动同步的，没有必须手写的理由，容差只会掩盖漂移。 */
  if (claim !== real) note(`${c.key}: size 标 ${c.size}，实际 modules/${c.key}.js 是 ${real} KB`);
});

/* ── 4. progress / total pairing, and total must be backed by steps ── */
courses.forEach((c) => {
  if (c.progress && !c.total) note(`${c.key}: 声明了 progress 但没有 total`);
  if (c.total && !c.progress) note(`${c.key}: 声明了 total 但没有 progress`);
  if (c.total && c.progress && c.progress !== c.key) note(`${c.key}: progress(${c.progress}) 与 key 不一致`);
  if (c.total && !/IL\.mount\(|\.steps\s*=|steps:\s*steps|steps:\s*[A-Za-z_$\[]/.test(read(path.join(ROOT, 'src', c.key + '-interactive.html')) || '')) {
    note(`${c.key}: 声明 total=${c.total} 但源码里找不到写 steps 的路径（该模块将永远无法判定为掌握）`);
  }
});

/* ── 5. tags: every one must appear in the module source ── */
courses.forEach((c) => {
  if (!c.key) return;
  const src = read(path.join(ROOT, 'src', c.key + '-interactive.html'));
  if (!Array.isArray(c.tags)) { note(`${c.key}: 缺少 tags 数组`); return; }
  if (c.tags.length < 3) note(`${c.key}: tags 只有 ${c.tags.length} 个（至少 3 个，否则别名覆盖不住常见搜索词）`);
  if (c.tags.length > 6) note(`${c.key}: tags 有 ${c.tags.length} 个，超过 6 个只会稀释搜索`);
  const low = (src || '').toLowerCase();
  const seen = new Set();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /* 裸 substring 会造出假标签：nginx 的 "SPA" 只是命中了 ui-monospace /
   * space-between 里的三个字母。ASCII 标签必须按词边界出现，中文标签没有
   * 词边界可言，退回 substring。 */
  const appears = (s) => {
    if (/[^\x00-\x7f]/.test(s)) return low.indexOf(s.toLowerCase()) !== -1;
    const re = new RegExp('(^|[^a-z0-9])' + esc(s.toLowerCase()) + '([^a-z0-9]|$)', 'm');
    return re.test(low);
  };
  c.tags.forEach((t) => {
    if (typeof t !== 'string' || !t.trim()) { note(`${c.key}: 非法标签 ${JSON.stringify(t)}`); return; }
    const s = String(t).trim();
    if (seen.has(s)) { note(`${c.key}: 标签重复 ${s}`); return; }
    seen.add(s);
    if (s.length < 2) note(`${c.key}: 标签过短 ${JSON.stringify(s)}`);
    if (/^(学习|课程|教程|入门|交互|仿真|迷你|基础|实战)$/.test(s)) note(`${c.key}: 标签无区分度 ${s}`);
    if (s.toLowerCase() === c.key.toLowerCase()) note(`${c.key}: 标签「${s}」与 key 相同（搜索文本已含 key，白占额度）`);
    if (src !== null && !appears(s)) {
      note(`${c.key}: 标签「${s}」未出现在 src/${c.key}-interactive.html 里（不能承诺模块不教的内容）`);
    }
  });
});

/* ── 6. the shell must actually search what courses.js declares ──
 * Static checks cannot run the matcher, but they can catch someone reverting
 * it: the bug this guards is filter() reading only h3 + .card-desc, which made
 * 15/45 modules unfindable by their own key. If dataset.tags / dataset.key stop
 * being consulted in index.html, tags added here buy nothing. */
const shell = read(path.join(ROOT, 'index.html')) || '';
const filterBody = (shell.match(/function filter\(\)[\s\S]*?\n      \}/) || [''])[0];
if (!filterBody) {
  note('index.html: 找不到 filter() 函数体，无法校验搜索接线');
} else {
  if (!/searchBlob\(/.test(filterBody)) note('index.html: filter() 不再调用 searchBlob()，tags 会失效');
  if (!/dataset\.tags/.test(shell)) note('index.html: 卡片未导出 dataset.tags，courses.js 的 tags 搜不到');
  if (!/dataset\.key/.test(shell)) note('index.html: 搜索文本未包含卡片 key');
}
CATS.forEach((cat) => {
  if (!courses.some((c) => c.cat === cat)) note(`分类 ${cat} 下没有模块`);
});

/* ── 7. id 唯一性（Round 19）──
 * 起因：web 模块把「测试结果」卡片写成
 *   <div id="test-results"><div id="test-results"></div></div>
 * `getElementById` 只返回第一个，里层那个 div 是一段永远为空的死标记。
 *
 * 为什么不做成浏览器检查（本轮真试过，写在这是为了让下一个人别再走一遍）：
 * 把判据挂在 check-tap 的遍历上跑全库，报 **0 处重复**——而 web 那个缺陷就在那儿。
 * 原因是那些 DOM 是**点击之后才建**的（`go-test` 的 handler 才拼这段 HTML），
 * 渲染态普查看不见没被点开过的分支。"闸门量不到"又一次伪装成"闸门通过"，
 * 与上一轮 tap 覆盖率、本轮对比度覆盖率是同一个形态。
 * 静态按文件查反而覆盖更全：JS 字符串里的模板也一并扫到（web 的缺陷正是这么发现的）。
 *
 * 正则要点：必须带 `(?<![-\w])`。第一版没带，把 `data-id="a"`、`aria-labelledby`
 * 之类当成 id，一次虚报 30 个模块——虚报会把人引去改本来正确的代码。
 *
 * 顺带查模块 id 与壳层 id 同名：文档顺序里 `#navView` 在前，模块里的
 * `document.getElementById('search')` 拿到的是导航页那个节点，模块自己的
 * 同名节点永远够不着。 */
const shellForIds = read(path.join(ROOT, 'index.html')) || '';
const ID_RE = /(?<![-\w])id=["']([^\s"'<>]+)["']/g;
const shellIds = new Set([...shellForIds.matchAll(ID_RE)].map((m) => m[1]));
courses.forEach((c) => {
  if (!c.key) return;
  const src = read(path.join(ROOT, 'src', c.key + '-interactive.html'));
  if (src === null) return;
  const seen = new Map();
  const dups = [];
  for (const m of src.matchAll(ID_RE)) {
    const v = m[1];
    if (seen.has(v)) { if (seen.get(v) === 1) dups.push(v); seen.set(v, 2); }
    else seen.set(v, 1);
  }
  dups.forEach((v) => note(`${c.key}: id="${v}" 出现两次（getElementById 只返回第一个，后一个是死节点）`));
  [...seen.keys()].filter((v) => shellIds.has(v)).forEach((v) => note(`${c.key}: id="${v}" 与壳层同名（模块拿不到自己那个节点）`));
});

/* ── 8. 文案里的"模块数"只能来自 courses.js（Round 20）──
 * 起因：徽章写着「掌握全部 45 个模块」，而库里有 46 个。判据本身是对的
 * （`doneCount >= tracked`，动态），假的是那句给人读的文案——它是导航页上读者
 * 判断"我还差几个"的唯一读数，而每加一个模块它就再假一点。同批对账还翻出
 * README 的掌握口径表写 milestone 32 / assess 13（相加 45 ≠ 46，实际 33 / 13）。
 * 这正是上一轮遗留第 5 条说的"README 计数校准那一轮"。
 *
 * 判据分两种强度：
 *   - 代码侧（index.html / ilquiz.js / ilcontrast.js / ilquizzes.js）：剥掉注释后，
 *     「全部 / 全站 / 共 + N + 个模块」这类**总量声明**必须等于 courses.length。
 *     另加一条接线检查：finisher 的 req 必须由 `courses.length` 拼出来。少了这条，
 *     把文案改回硬编码 46 也能过关，然后下一次加模块时又变假——和 `size` 是同一个病。
 *   - README 侧：散文跑不起来，但表格里的数字可以逐条对账（专题总数、四个分类
 *     小节数、milestone/assess 两行、目录树里的"共 N 个"、测验覆盖声明）。
 *
 * 注释不参与检查，这是有意的：注释里的 "15/45"、"实测（45 个模块逐个访问…）"
 * 是某一轮的测量记录，把它们改成 46 等于篡改历史。所以判据的第一步是剥注释。
 *
 * 但剥 JS 注释的正则不能照搬去读 Markdown：README 里的通配符（`modules/` 后面
 * 跟星号再跟 `.js`）恰好就是"斜杠紧跟星号"，会被当成块注释的起点。它平时找不到
 * 终点所以没事，一旦散文里出现"星号紧跟斜杠"（两个粗体之间夹一个斜杠写作强调），
 * 中间那两张表就被当成注释吞掉了。第一版因此报"找不到 milestone 锚点"——判据失效
 * 比计数过期更难查，因为它伪装成"这一行不存在"。所以 README 只剥 HTML 注释。
 * （同一个坑在这段注释里也踩过一次：注释正文里写不出那两个字符的序列。） */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\'"])\/\/[^\n]*/g, '$1');
}
function stripDocComments(src) {
  return src.replace(/<!--[\s\S]*?-->/g, ' ');
}
const COUNT_FILES = ['index.html', 'ilquiz.js', 'ilcontrast.js', 'ilquizzes.js'];
const TOTAL_CLAIM = /(全部|全站|共)[^0-9\n]{0,10}(\d{1,4})\s*个\s*(模块|专题|课程)/g;
COUNT_FILES.forEach((f) => {
  const body = stripComments(read(path.join(ROOT, f)) || '');
  for (const m of body.matchAll(TOTAL_CLAIM)) {
    if (+m[2] !== courses.length) {
      note(`${f}: 文案声明「${m[0].trim()}」，但 courses.js 实际有 ${courses.length} 个（总数只能来自 courses.js）`);
    }
  }
});
/* 接线检查：全站通关那句必须拼 courses.length，不许写字面量 */
if (!/req:\s*'掌握全部\s*'\s*\+\s*courses\.length/.test(shell)) {
  note('index.html: finisher 徽章的「掌握全部 N 个模块」没有从 courses.length 派生（硬编码必然过期）');
}

const readme = stripDocComments(read(path.join(ROOT, 'README.md')) || '');
const claim = (re, want, where) => {
  const m = readme.match(re);
  if (!m) { note(`README: 找不到${where}的计数锚点（判据失效，请恢复该行）`); return; }
  if (+m[1] !== want) note(`README: ${where} 写 ${m[1]}，实际 ${want}`);
};
claim(/学习专题\s*\|\s*(\d+)\s*个/, courses.length, '学习专题总数');
claim(/共 (\d+) 个源码页/, courses.length, 'src/ 源码页数');
claim(/共 (\d+) 个模块/, courses.length, 'modules/ 模块数');
claim(/\| milestone（有 `total`）[^|]*\|[^|]*\| (\d+) \|/, courses.filter((c) => c.total != null).length, 'milestone 型数量');
claim(/\| assess（无 `total`）[^|]*\|[^|]*\| (\d+) \|/, courses.filter((c) => c.total == null).length, 'assess 型数量');
const CAT_HEAD = { devops: 'DevOps', cs: 'CS 基础', automation: '自动化', tools: '开发工具' };
Object.keys(CAT_HEAD).forEach((cat) => {
  const n = courses.filter((c) => c.cat === cat).length;
  const m = readme.match(new RegExp('### ' + CAT_HEAD[cat].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '（(\\d+) 个）'));
  if (!m) note(`README: 找不到「${CAT_HEAD[cat]}」小节的小节数锚点`);
  else if (+m[1] !== n) note(`README: ${CAT_HEAD[cat]} 小节写 ${m[1]} 个，courses.js 里该分类有 ${n} 个`);
});
/* 「46 个模块全部有判分测验（41 自带 + 5 挂载）」：三个数必须自洽，且挂载数
   要能在 ilquizzes.js 里数出来——否则这句话只是在给一个不存在的题库背书。 */
const quizClaim = readme.match(/(\d+) 个模块全部有判分测验（(\d+) 个模块自带 \+ (\d+) 个壳层挂载）/);
if (!quizClaim) note('README: 找不到「模块全部有判分测验」那条声明的锚点');
else {
  const [total, own, mounted] = [1, 2, 3].map((i) => +quizClaim[i]);
  if (total !== courses.length) note(`README: 判分测验声明覆盖 ${total} 个模块，实际 ${courses.length} 个`);
  if (own + mounted !== total) note(`README: 判分测验声明 ${own} 自带 + ${mounted} 挂载 ≠ ${total}`);
  const bank = read(path.join(ROOT, 'ilquizzes.js')) || '';
  const bankKeys = new Set([...stripComments(bank).matchAll(/^\s{2}'?([a-z0-9-]+)'?:\s*\[/gm)].map((m) => m[1]));
  if (bankKeys.size !== mounted) note(`README: 声明 ${mounted} 个由壳层挂载，ilquizzes.js 实际登记 ${bankKeys.size} 个（${[...bankKeys].join('/')}）`);
}

if (problems.length) {
  console.log('courses.js 校验失败（%d 项）:', problems.length);
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
console.log('OK: courses.js 一致（%d 个模块：key 唯一、src/modules 齐备、size 标签属实、tags 均可在源码中验证、progress/total 配对、id 不与壳层撞名且模块内唯一）', courses.length);
