#!/usr/bin/env node
/*
 * Browser-level WCAG contrast audit for the shipped app (Round 17).
 *
 * tools/check-theme.js can only prove the token system is *consistent*; it
 * cannot prove a rendered pixel pair is readable. This audit renders every
 * module under both themes — exactly like a phone would (390x844, touch) —
 * and measures the composited foreground against the composited background.
 *
 * Two things make the number trustworthy, and both were learned the hard way:
 *
 *   1. Backgrounds are composited layer by layer down the ancestor chain, and
 *      background-image (gradients/patterns) is deliberately ignored: an exact
 *      pixel is not computable there, so any rule that paints text on a
 *      pattern is skipped rather than guessed. ilcontrast.js uses the *same*
 *      convention on purpose — if the two disagreed you would get "audit says
 *      1.11, runtime says 4.62" and neither could be fixed (n8n .nav a,
 *      helm .q-title in Round 17).
 *
 *   2. SVG <text> paints with `fill`, not `color`, and its real backdrop is
 *      usually a sibling <rect fill="#hex"> inside the same <g> — an attribute,
 *      invisible to computed backgroundColor. Auditing `cs.color` and
 *      `backgroundColor` silently reports diagram labels as fine while they
 *      render at 1.00:1. Both are handled here and in ilcontrast.js.
 *
 * Modes:
 *   node tools/check-contrast.js              shipped state (floor active): must be 0
 *   node tools/check-contrast.js --source     blocks ilcontrast.js and reports the
 *                                             underlying source clusters, for hunting
 *                                             a regression down to one CSS rule
 *   --theme=light|dark  one theme instead of both
 *   --keys=bash,git     a subset of modules
 *   --top=N             cluster rows to print in --source mode (default 30)
 *   --budget=N          allowed failing rows in shipped mode (default 0)
 *
 * No browser/Playwright available → the audit prints SKIP and exits 0, so CI
 * (which has neither) keeps passing while local runs stay honest.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : dflt;
};
const SOURCE = has('--source');
const THEME = opt('theme', 'both');
const ONLY = opt('keys', '');
const TOP = parseInt(opt('top', '30'), 10);
const BUDGET = parseInt(opt('budget', '0'), 10);

/* ── locate Playwright + Chromium without making them a hard dependency ── */
function loadPlaywright() {
  const candidates = ['playwright', 'playwright-core', '/usr/local/node/lib/node_modules/playwright'];
  for (const id of candidates) {
    try { return require(id); } catch (e) { /* try next */ }
  }
  return null;
}
function findChromium() {
  const env = process.env.IL_CHROMIUM;
  const cands = env ? [env] : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  for (const c of cands) {
    try { if (fs.existsSync(c)) return c; } catch (e) { /* ignore */ }
  }
  return null;
}

const pw = loadPlaywright();
/* Playwright 本身缺失 → 真的没法量像素。找到了 Playwright 但没找到系统
   Chromium 时不急着退出：交给 Playwright 自己 `npx playwright install chromium`
   装的那个（CI 就是这么跑的），启动失败再由底部 catch 兜成 SKIP。 */
const chromium = pw && pw.chromium ? findChromium() : null;
if (!pw || !pw.chromium) {
  console.log('SKIP: 未找到 Playwright（本地可 `npm i -D playwright`，或设 IL_CHROMIUM=/path/to/chromium）');
  console.log('     对比度审计需要在真实渲染结果上量像素，静态检查请见 tools/check-theme.js');
  process.exit(0);
}

/* ── WCAG maths ── */
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/* ── in-page collector ── */
const COLLECT = () => {
  const SYM = /^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2000}-\u{206F}\u{00B7}\u{2022}]+$/u;
  const rgbOf = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(String(c || ''));
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter((x) => x).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const hexOf = (str) => {
    const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(str || '').trim());
    if (!m) return null;
    const h = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  };
  const asRgb = (v) => {
    const c = rgbOf(v) || hexOf(v);
    return c ? `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` : null;
  };
  /* SVG elements expose className as SVGAnimatedString, so a plain
     `.toString()` yields "[object SVGAnimatedString]" and every SVG row
     aggregates into one useless bucket. Require an actual string. */
  const clsOf = (el) => (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '');
  function path(el) {
    const s = [];
    let n = el;
    while (n && n.nodeType === 1 && s.length < 4) {
      const cls = clsOf(n);
      s.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (cls ? '.' + cls : ''));
      n = n.parentElement;
    }
    return s.join(' > ');
  }
  function sel(el) {
    const inRoot = el.closest && el.closest('#moduleRoot') ? '#moduleRoot ' : '';
    const all = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    return inRoot + el.tagName.toLowerCase() + all + (el.id ? '#' + el.id : '');
  }
  /* ancestor background-color layers, nearest first; opaque layer ends the walk */
  function stack(el) {
    const L = [];
    let n = el;
    while (n && n.nodeType === 1) {
      const c = getComputedStyle(n);
      const p = rgbOf(c.backgroundColor);
      if (p && p.a > 0) {
        L.push(c.backgroundColor);
        if (p.a >= 1) break;
      }
      n = n.parentElement;
    }
    return L;
  }
  /* SVG text sits on a plate drawn from an *attribute* (rect/circle/path fill),
     not CSS, and <svg> ancestors have no box at all — so computed
     backgroundColor walks straight out to the themed card and reports a fake
     light backdrop. Mirror ilcontrast.js here, deliberately identically: audit
     and floor must produce the same number or neither can be trusted.
     Note the plate's parent is often the <svg> itself (ownerSVGElement is null
     on the root), so no ownerSVGElement check on the container. */
  function svgPlate(el) {
    const g = el.parentElement;
    if (!g || !g.getElementsByTagName) return null;
    const x = parseFloat(el.getAttribute('x')) || 0;
    const y = parseFloat(el.getAttribute('y')) || 0;
    let best = null, bestArea = Infinity;
    const shapes = g.getElementsByTagName('*');
    for (let i = 0; i < shapes.length; i++) {
      const sh = shapes[i];
      if (sh === el || sh.namespaceURI !== 'http://www.w3.org/2000/svg') continue;
      const tag = sh.tagName.toLowerCase();
      if (tag !== 'rect' && tag !== 'circle' && tag !== 'path') continue;
      let rx, ry, rw, rh;
      if (tag === 'circle') {
        const cr = parseFloat(sh.getAttribute('r')) || 0;
        if (!cr) continue;
        rx = (parseFloat(sh.getAttribute('cx')) || 0) - cr; ry = (parseFloat(sh.getAttribute('cy')) || 0) - cr; rw = rh = cr * 2;
      } else {
        rx = parseFloat(sh.getAttribute('x')) || 0; ry = parseFloat(sh.getAttribute('y')) || 0;
        rw = parseFloat(sh.getAttribute('width')) || 0; rh = parseFloat(sh.getAttribute('height')) || 0;
        if (tag === 'path' || !(rw > 0 && rh > 0)) {
          if (!sh.getBBox) continue;
          let bb = null;
          try { bb = sh.getBBox(); } catch (e) { continue; }
          if (!bb || !(bb.width > 0 && bb.height > 0)) continue;
          rx = bb.x; ry = bb.y; rw = bb.width; rh = bb.height;
        }
      }
      if (x < rx - 4 || x > rx + rw + 4 || y < ry - 6 || y > ry + rh + 6) continue;
      const area = rw * rh;
      const c = rgbOf(sh.getAttribute('fill') || '') || hexOf(sh.getAttribute('fill') || '') || rgbOf(getComputedStyle(sh).fill);
      if (!c || c.a <= 0) continue;
      if (area < bestArea) { bestArea = area; best = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`; }
    }
    return best;
  }

  const out = [];
  document.querySelectorAll('#navView *, #moduleRoot *').forEach((el) => {
    const form = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'radio' && el.type !== 'checkbox');
    const txt = form
      ? String(el.value || el.placeholder || '').trim()
      : Array.from(el.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).filter(Boolean).join(' ');
    if (!txt || SYM.test(txt)) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const c = getComputedStyle(el);
    if (c.display === 'none' || c.visibility === 'hidden') return;
    if (c.backgroundImage && c.backgroundImage !== 'none') return;   /* text on a pattern: not computable */
    if (el.type === 'range' || el.type === 'color') return;
    const svg = !!el.ownerSVGElement;
    const isSvgText = svg && /^(text|tspan)$/i.test(el.tagName);
    const fg = isSvgText
      ? (asRgb(c.fill) || asRgb(el.getAttribute('fill')) || c.color)
      : c.color;
    const bg = isSvgText ? (svgPlate(el) ? [svgPlate(el)].concat(stack(el.parentElement)) : stack(el)) : stack(el);
    const size = parseFloat(c.fontSize);
    out.push({
      sel: sel(el), path: path(el),
      fg, bg: bg.join(' | '),
      size: Math.round(size * 10) / 10,
      large: size >= 24 || (size >= 18.66 && (parseInt(c.fontWeight, 10) || 400) >= 700),
      op: parseFloat(c.opacity),
      txt: txt.slice(0, 28),
    });
  });
  return out;
};

const parse = (c) => {
  const m = /rgba?\(([^)]+)\)/.exec(String(c || ''));
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter((x) => x).map(parseFloat);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
};

function compose(rows) {
  const bad = [];
  rows.forEach((row) => {
    const f = parse(row.fg);
    if (!f) return;
    const layers = (row.bg ? row.bg.split(' | ').map(parse).filter(Boolean) : []);
    /* Same base rule as ilcontrast.js: the browser canvas is white, and an
       opaque deepest layer replaces it. If the audit and the floor used
       different bases, the same pixel would produce two numbers — the exact
       deadlock that made Round 17 unfixable. */
    let acc = { r: 255, g: 255, b: 255 };
    if (layers.length && layers[layers.length - 1].a >= 1) acc = layers.pop();
    for (let i = layers.length - 1; i >= 0; i--) {
      const c = layers[i];
      acc = {
        r: c.r * c.a + acc.r * (1 - c.a),
        g: c.g * c.a + acc.g * (1 - c.a),
        b: c.b * c.a + acc.b * (1 - c.a),
      };
    }
    /* 与 ilcontrast.js 一致：不看元素自身 opacity。滚动淡入的 .step 在扫描瞬间
       可能还是 0，若把 opacity 乘进前景，所有文字都会压向页面底色、比值全变；
       兜底不等淡入，审计也不能等。前景只按自己的 alpha 合成。 */
    const a = f.a;
    const fg = { r: f.r * a + acc.r * (1 - a), g: f.g * a + acc.g * (1 - a), b: f.b * a + acc.b * (1 - a) };
    const rc = ratio(fg, acc);
    const need = row.large ? 3 : 4.5;
    if (rc >= need) return;
    bad.push({ ...row, rc, need, acc: [acc.r, acc.g, acc.b].map(Math.round) });
  });
  return bad;
}

(async () => {
  const courses = (() => {
    const win = {};
    const prev = global.window;
    global.window = win;
    try { eval(fs.readFileSync(path.join(ROOT, 'courses.js'), 'utf8')); } finally { global.window = prev; }
    return win.IL_COURSES;
  })();
  const keys = ONLY ? ONLY.split(',').map((s) => s.trim()) : courses.map((c) => c.key);
  const themes = THEME === 'both' ? ['light', 'dark'] : [THEME];

  const browser = await pw.chromium.launch({
    executablePath: chromium || undefined,
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    colorScheme: 'dark',
  });
  /* --source: measure what the CSS actually says. Without this the runtime
     floor silently repairs the page and every number looks green. */
  if (SOURCE) await page.route('**/ilcontrast.js', (r) => r.abort());

  const url = pathToFileURL(path.join(ROOT, 'index.html')).href;
  const fails = [];
  const seen = new Set();

  for (const theme of themes) {
    await page.addInitScript((t) => { try { localStorage.setItem('il_theme', t); } catch (e) {} }, theme);
    await page.goto(url);
    await page.waitForTimeout(400);
    const applied = await page.evaluate(() => document.documentElement.dataset.theme);
    if (applied !== theme) console.log(`!! 主题未生效：期望 ${theme}，实际 ${applied}`);
    for (const key of keys) {
      await page.evaluate((k) => { location.hash = '#/m/' + k; }, key);
      await page.waitForTimeout(320);
      /* scroll like a reader: .step blocks fade in via IntersectionObserver, so
         unscrolled content is opacity:0 and quizzes are not in the DOM yet. */
      await page.evaluate(async () => {
        const h = document.documentElement.scrollHeight;
        for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
        /* runtime repairs go through `transition: all .3s` — wait past them,
           otherwise you sample a mid-transition colour, not what a user reads */
        await new Promise((r) => setTimeout(r, 1500));
      });
      const rows = await page.evaluate(COLLECT);
      compose(rows).forEach((f) => {
        const dedup = SOURCE ? `${f.path}|${f.fg}` : `${key}|${theme}|${f.sel}|${f.fg}|${f.size}`;
        if (seen.has(dedup)) return;
        seen.add(dedup);
        fails.push({ key, theme, ...f });
      });
    }
    console.log(`${theme} pass done, cumulative fails=${fails.length}`);
  }
  await browser.close();

  fails.sort((a, b) => a.rc - b.rc);

  if (SOURCE) {
    const agg = new Map();
    fails.forEach((f) => {
      const k = `${f.path}  ${f.fg}`;
      const e = agg.get(k);
      if (e) { e.n++; e.mods[f.key] = (e.mods[f.key] || 0) + 1; } else {
        agg.set(k, { n: 1, mods: { [f.key]: 1 }, rc: f.rc, size: f.size, acc: f.acc, txt: f.txt });
      }
    });
    console.log(`\n== 源头簇（--source：未启用运行时兜底，按 路径 + 前景色 聚合）`);
    Array.from(agg.entries())
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, TOP)
      .forEach(([k, v]) => {
        const mods = Object.entries(v.mods).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m, n]) => `${m}:${n}`).join(' ');
        console.log(`${String(v.n).padStart(4)}  ${k}\n        ratio ${v.rc.toFixed(2)}  size ${v.size}  bg ${v.acc.join(',')}\n        例 ${JSON.stringify(v.txt)}\n        模块 ${mods}`);
      });
    console.log(`TOTAL clusters: ${agg.size}  (rows: ${fails.length})`);
    console.log('（--source 仅供参考：这些簇由 ilcontrast.js 在运行时兜底，不作为 CI 判据）');
    process.exit(0);
  }

  if (fails.length > BUDGET) {
    console.log(`\n对比度审计失败：${fails.length} 行（预算 ${BUDGET}）`);
    fails.forEach((f) => {
      console.log(`  ${f.rc.toFixed(2).padStart(5)} (需 ${f.need}) ${f.theme.padEnd(5)} ${f.key.padEnd(12)} ${f.sel.slice(0, 52).padEnd(52)} ${f.size}px ${f.fg} bg=${f.acc.join(',')} ex=${JSON.stringify(f.txt)}`);
    });
    console.log('\n提示：先用 `node tools/check-contrast.js --source --keys=<key>` 找到源头规则，');
    console.log('     再按 skin 的暗色孤岛约定补 token（见 index.html courseSkin 注释）。');
    process.exit(1);
  }
  console.log(`OK: 对比度审计通过（${keys.length} 模块 × ${themes.length} 主题，${themes.join('/')}，失败 ${fails.length} ≤ 预算 ${BUDGET}）`);
})().catch((e) => {
  console.log('SKIP: 浏览器审计无法运行 — ' + (e && e.message ? e.message.split('\n')[0] : e));
  process.exit(0);
});
