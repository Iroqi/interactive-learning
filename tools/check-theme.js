#!/usr/bin/env node
/*
 * Static guard for the theme token system (Round 17).
 *
 * The shell promises two things in its own comments ("下面每个值按 WCAG 反推，
 * 对所处面底 ≥4.5（tools/check-theme.js 把关）") that nothing used to check:
 *   1. every --sk-* / --ilq-* token used anywhere is defined in BOTH themes,
 *      otherwise switching themes leaves a hole (dark value on a light page);
 *   2. the skin sheet contains no literal colors outside its token blocks,
 *      because a hardcoded dark value there is exactly what broke light mode;
 *   3. module-invented variable names (--text-muted etc.) are all mapped,
 *      since an unmapped name silently keeps the module's own hardcoded value.
 *
 * These are text checks, no browser needed — fast enough to run on every push.
 * Usage: node tools/check-theme.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const problems = [];
const note = (m) => problems.push(m);

const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ilquiz = fs.readFileSync(path.join(ROOT, 'ilquiz.js'), 'utf8');

/* ── 1. skin: token definitions per theme ── */
const skinMatch = shell.match(/<style id="courseSkin">([\s\S]*?)<\/style>/);
if (!skinMatch) {
  note('index.html: 找不到 <style id="courseSkin">');
} else {
  const skin = skinMatch[1];
  const block = (re) => {
    const m = re.exec(skin);
    return m ? m[0] : '';
  };
  const darkTok = block(/#moduleRoot\s*\{[^}]*--sk-page[^}]*\}/);
  const lightTok = block(/html\[data-theme="light"\]\s*#moduleRoot\s*\{[^}]*--sk-page[^}]*\}/);
  const names = (txt) => new Set([...txt.matchAll(/(--sk-[\w-]+)\s*:/g)].map((m) => m[1]));
  const d = names(darkTok), l = names(lightTok);
  if (!d.size) note('courseSkin: 没解析到暗色 --sk-* 定义块');
  if (!l.size) note('courseSkin: 没解析到亮色 --sk-* 定义块');
  for (const t of d) if (!l.has(t)) note(`courseSkin: ${t} 只有暗色定义，亮色下会残留暗值`);
  for (const t of l) if (!d.has(t)) note(`courseSkin: ${t} 只有亮色定义，暗色下未定义（var() 取空值）`);

  /* used tokens must be defined */
  const used = new Set([...skin.matchAll(/var\((--sk-[\w-]+)/g)].map((m) => m[1]));
  for (const t of used) if (!d.has(t) && !l.has(t)) note(`courseSkin: 使用了未定义的 ${t}`);

  /* skin 里"写死颜色"的分寸（Round 17 之后）：
     过去一刀切禁止，但恒定深色孤岛（代码面板、.quiz-q、.clab、吸顶导航…）
     必须写死一组深色 token —— 它们不随主题翻转，这正是它们成立的前提。
     于是规则改成三条：
       a) 自定义属性声明（--sk-* / 模块别名）允许字面色：那是调色板本身；
       b) 选择器带 html[data-theme="…"] 或 #moduleRoot[data-mod="…"] 的允许：
          那是"只在这个主题/这个模块"的显式配对（git 圆章压深、plc 孤岛…）；
       c) 其余任何"真属性"（color/background/border-color…）写字面色 = 报错，
          因为它会漏进另一个主题。 */
  const stripComments = (txt) => txt.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...stripComments(skin).matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const [, rawSel, body] of rules) {
    const sel = rawSel.replace(/\s+/g, ' ').trim();
    if (/^@/.test(sel)) continue;
    const qualified = /html\[data-theme=|#moduleRoot\[data-mod=/.test(sel);
    for (const decl of body.split(';')) {
      const m = /^\s*(--[\w-]+|[\w-]+)\s*:\s*(.*)$/s.exec(decl);
      if (!m) continue;
      const [, prop, val] = m;
      if (prop.startsWith('--') || qualified) continue;
      if (!/^(color|background|background-color|border-color|border|fill|stroke|outline-color|box-shadow|text-shadow)$/.test(prop)) continue;
      if (/(#[0-9a-fA-F]{3,8}|rgba?\()/.test(val)) {
        note(`courseSkin: ${sel.slice(0, 46)} 的 ${prop} 写死了颜色 → ${val.replace(/\s+/g, ' ').slice(0, 40)}（应改用 var(--sk-*)，否则亮色模式破功）`);
      }
    }
  }

  /* 孤岛调色板必须"整套"覆盖：少写一个 token，孤岛里那条属性就退回主题值，
     于是深底压深字（本轮实测 285 个源头失败簇里绝大多数是这一类）。
     拿暗色主题块当"完整集合"，凡是重定义 --sk-page 的块都要有同一批名字。 */
  const skNames = (txt) => new Set([...txt.matchAll(/(--sk-[\w-]+)\s*:/g)].map((m) => m[1]));
  const base = skNames(darkTok);
  for (const [, rawSel, body] of rules) {
    const sel = rawSel.replace(/\s+/g, ' ').trim();
    if (!/--sk-page\s*:/.test(body)) continue;
    const have = skNames(body);
    const miss = [...base].filter((t) => !have.has(t));
    /* --sk-code-* / --sk-tint-* / --sk-nav-bg 在孤岛里没意义（面板就是深色、
       tint 由 accent 现算），只要求"文字系"那批必须齐。 */
    const critical = miss.filter((t) => !/^(--sk-code|--sk-tint|--sk-nav-bg|--sk-head|--sk-elev|--sk-hover|--sk-faint|--sk-ok|--sk-err-fg|--sk-on-accent|--sk-bar)/.test(t));
    if (critical.length) {
      note(`courseSkin: 孤岛块 ${sel.slice(0, 50)} 少覆盖 ${critical.join(', ')}（这些属性会退回主题值，深底压深字）`);
    }
  }
}

/* ── 2. shell :root vs html[data-theme="light"] ── */
const styleBlocks = [...shell.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
const shellCss = styleBlocks[0] || '';
const rootBlock = (/:root\s*\{([\s\S]*?)\}/.exec(shellCss) || ['', ''])[1];
const lightBlock = (/html\[data-theme="light"\]\s*\{([\s\S]*?)\n    \}/.exec(shellCss) || ['', ''])[1];
const defined = (txt) => new Set([...txt.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const r = defined(rootBlock), lt = defined(lightBlock);
if (!r.size) note('index.html: 没解析到 :root 变量块');
for (const t of r) {
  if (lt.has(t)) continue;
  /* 只有"颜色类"变量必须在亮色里有对应值，字体/尺寸/圆角等跳过 */
  if (!/color|bg|border|text|accent|gold|focus|shadow|tint|selection|inset|ambient|hairline|panel|bar|badge|muted|dim|danger|amber|teal|hm-l/.test(t)) continue;
  const v = new RegExp('--' + t.slice(2).replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&') + '\\s*:\\s*([^;]*)').exec(rootBlock);
  if (v && /(#[0-9a-fA-F]{3,8}|rgba?\()/.test(v[1])) note(`index.html: ${t} 在亮色块没有覆盖，且值是颜色（暗色会漏进亮色）`);
}

/* ── 3. ilquiz tokens: both themes ── */
const ilqDark = new Set([...ilquiz.matchAll(/(--ilq-[\w-]+)\s*:/g)].map((m) => m[1]));
const usedIlq = new Set([...ilquiz.matchAll(/var\((--ilq-[\w-]+)/g)].map((m) => m[1]));
for (const t of usedIlq) if (!ilqDark.has(t)) note(`ilquiz.js: 使用了未定义的 ${t}`);
const darkLine = /--ilq-card:[^']*/g;
const sets = [...ilquiz.matchAll(darkLine)].length;
if (sets < 2) note(`ilquiz.js: --ilq-* 只找到 ${sets} 组定义，应为亮/暗各一组`);

/* ── 4. module-invented names must be mapped by the skin ── */
/* 模块 :root 里发明的"颜色"变量，若 skin 不接管，切主题时它保持模块原值。
   这里列出使用量最大的一批，缺一即报错——新增模块用了新名字就要来补映射。 */
/* 映射块 = skin 里把模块自造名指回 --sk-* token 的那一段。
   按内容特征找（--bg: var(--sk-page)），不依赖缩进/选择器换行方式。 */
const skinSrc = shell.match(/<style id="courseSkin">([\s\S]*?)<\/style>/) || ['', ''];
const mapCands = [...skinSrc[1].matchAll(/\{([^{}]*--bg:\s*var\(--sk-page\)[^{}]*)\}/g)].map((m) => m[1]);
const mappingBlock = mapCands[0] || '';
if (!mappingBlock) note('courseSkin: 找不到模块变量映射块（--bg: var(--sk-page)）');
const mapped = new Set([...mappingBlock.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const SRC = path.join(ROOT, 'src');
const usage = new Map();
fs.readdirSync(SRC).filter((f) => f.endsWith('-interactive.html')).forEach((f) => {
  const css = fs.readFileSync(path.join(SRC, f), 'utf8');
  const roots = [...css.matchAll(/(?::root|html|body|\[data-theme="dark"\])\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  [...roots.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\()[^;]*/g)].forEach((m) => {
    usage.set(m[1], (usage.get(m[1]) || 0) + 1);
  });
});
const COLORISH = /^(--(?:bg|card|raise|line|border|text|dim|muted|surface|accent|primary|secondary|success|error|warning|info|green|red|blue|k8s|redis|prompt|tf|nginx|netsec|async|ts|perm|compose|algo|tx|sd|css|sqlidx|rust|helm|prom|jwt|brand|indigo|panel|hover|code|card))/;
[...usage.entries()]
  .filter(([name, n]) => n >= 8 && COLORISH.test(name) && !mapped.has(name))
  .sort((a, b) => b[1] - a[1])
  .forEach(([name, n]) => note(`skin 未映射模块变量 ${name}（${n} 个模块在用它，值为写死的颜色）→ 切主题时这些模块仍用自己的配色`));

if (problems.length) {
  console.log('主题一致性检查失败（%d 项）:', problems.length);
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
console.log('OK: 主题 token 一致（--sk-*/--ilq-* 双主题齐备、skin 无写死颜色、壳层亮色块覆盖完整、模块变量均已映射）');
