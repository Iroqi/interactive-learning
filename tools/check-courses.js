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
  if (Math.abs(claim - real) > 1) note(`${c.key}: size 标 ${c.size}，实际 modules/${c.key}.js 是 ${real} KB`);
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

if (problems.length) {
  console.log('courses.js 校验失败（%d 项）:', problems.length);
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
console.log('OK: courses.js 一致（%d 个模块：key 唯一、src/modules 齐备、size 标签属实、tags 均可在源码中验证、progress/total 配对）', courses.length);
