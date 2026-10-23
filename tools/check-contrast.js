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
 *   --cover=90          minimum share of text elements that must actually be measured
 *   --no-reveal         reader state only (reproduces the pre-Round-19 behaviour)
 *   --no-nav            skip the shell navigation page
 *
 * Round 19 — coverage, because "0 failures" used to mean "0 measurements".
 * The collector dropped every element with a zero-size box or display:none and
 * never reported how many it had dropped. Content that only appears after the
 * reader interacts — a collapsed `<details>` hint, an inactive tab panel, the
 * `display:none` reveal makefile writes eight times — was therefore invisible
 * to the gate: plc measured 64 of 332 text elements (19%). That is the same
 * shape Round 18 caught in tools/check-tap.js (plc 5/86 there), so the fix is
 * the same shape: measure twice, reveal the ancestor chain in between, and make
 * the coverage number a hard gate. `#navView` was an even blinder hole: the
 * collector queried it, but the loop only ever ran with the module view open,
 * so the navigation page had never been audited at all.
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
const COVER = parseInt(opt('cover', '90'), 10);
const REVEAL = argv.indexOf('--no-reveal') < 0;
const NAV = argv.indexOf('--no-nav') < 0;

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
const COLLECT = (scope) => {
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
    const inNav = el.closest && el.closest('#navView') ? '#navView ' : (el.closest && el.closest('#moduleRoot') ? '#moduleRoot ' : '');
    const all = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    return inNav + el.tagName.toLowerCase() + all + (el.id ? '#' + el.id : '');
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

  /* scope: 'nav' | 'mod'. The two views are mutually exclusive ([hidden]), so a
     single pass over both selectors can only ever measure whichever is open —
     that is exactly how the navigation page slipped through for two rounds. */
  const out = [];
  const root = document.getElementById(scope === 'nav' ? 'navView' : 'moduleRoot');
  if (!root) return out;
  root.querySelectorAll('*').forEach((el) => {
    const form = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'radio' && el.type !== 'checkbox');
    const txt = form
      ? String(el.value || el.placeholder || '').trim()
      : Array.from(el.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).filter(Boolean).join(' ');
    if (!txt || SYM.test(txt)) return;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'TEMPLATE') return;
    if (el.type === 'range' || el.type === 'color') return;
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    /* 不再"量不到就丢掉"：先记下来，由驱动层决定补量还是计入未覆盖 */
    const hidden = c.display === 'none' || c.visibility === 'hidden' || !r.width || !r.height;
    if (c.backgroundImage && c.backgroundImage !== 'none') return;   /* text on a pattern: not computable */
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
      hidden,
      why: hidden ? (c.display === 'none' ? 'display:none' : (c.visibility === 'hidden' ? 'visibility' : 'no-box')) : '',
      txt: txt.slice(0, 28),
    });
  });
  return out;
};

/* 揭开之后必须给运行时一次"读者刚刚点开"的信号。运行时看不见 style 写入
   （clear() 自己也在写 style，进 attributeFilter 会自激），它信的是交互事件——
   Round 19 在 ilcontrast.js 里补了 click/keydown/toggle 通道，这里就按同一条通道
   派发一次合成点击，让"闸门揭开的东西"和"读者点开的东西"走同一个重扫入口。
   没有这一步，出厂模式会去判那些运行时从来没见过第二次的行——那不是缺陷，是量法不对。 */
const PING = (scope) => {
  const root = document.getElementById(scope === 'nav' ? 'navView' : 'moduleRoot');
  if (root) root.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
};

/* ── in-page reveal: open what the reader has not opened yet ── */
const REVEAL_FN = (scope) => {
  const root = document.getElementById(scope === 'nav' ? 'navView' : 'moduleRoot');
  if (!root) return 0;
  const acts = [];
  const bump = (el) => {
    if (!el || el.nodeType !== 1) return;
    /* <details> 不是靠 display/visibility 藏起来的：未展开时内容是"没有盒子"。
       三条揭开路径必须都在：open 属性、[hidden]、CSS display/visibility。 */
    if (el.tagName === 'DETAILS' && !el.open) { acts.push({ el, kind: 'open' }); el.open = true; }
    if (el.hasAttribute('hidden')) { acts.push({ el, kind: 'hidden', v: el.getAttribute('hidden') }); el.hidden = false; }
    const cs = getComputedStyle(el);
    if (cs.display === 'none') {
      acts.push({ el, kind: 'css', prop: 'display', v: el.style.display, p: el.style.getPropertyPriority('display') });
      el.style.setProperty('display', 'block', 'important');
    }
    if (cs.visibility === 'hidden') {
      acts.push({ el, kind: 'css', prop: 'visibility', v: el.style.visibility, p: el.style.getPropertyPriority('visibility') });
      el.style.setProperty('visibility', 'visible', 'important');
    }
  };
  root.querySelectorAll('*').forEach((el) => {
    if (el.closest('details') || el.matches('details')) { let n = el; while (n && n !== root) { bump(n); n = n.parentElement; } }
    if (el.hasAttribute('hidden') || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') {
      let n = el; while (n && n !== root) { bump(n); n = n.parentElement; }
      bump(el);
    }
  });
  window.__ilcUndo = () => {
    acts.reverse().forEach((a) => {
      if (a.kind === 'open') { a.el.open = false; return; }
      if (a.kind === 'hidden') { a.el.hidden = true; return; }
      if (a.v) a.el.style.setProperty(a.prop, a.v, a.p || ''); else a.el.style.removeProperty(a.prop);
    });
    return acts.length;
  };
  return acts.length;
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
  const all = ONLY ? ONLY.split(',').map((s) => s.trim()) : courses.map((c) => c.key);
  const themes = THEME === 'both' ? ['light', 'dark'] : [THEME];
  /* 一份确定的合成进度。导航页的卡片进度条、徽章、错题本、成绩趋势、热力图全部
     只在 store 非空时渲染：空 store 下导航页只有 323 个文本元素，种了进度是 563。
     不种进度就等于"量了壳层但没量壳层真正会显示的东西"。 */
  const DAY = 86400000;
  const seed = (key) => {
    const c = courses.find((x) => x.key === key) || { total: 9 };
    const i = courses.indexOf(c);
    const total = c.total || 9;
    const done = i % 3 === 0;
    const started = i % 5 !== 0;
    const n = done ? total : (started ? Math.max(1, i % total) : 0);
    return {
      steps: Array.from({ length: n }, (_, k) => k),
      quiz: started ? { score: done ? 8 : Math.max(4, Math.round(total * 0.6)), total: 8, wrongs: [1, 3] } : {},
      last: Date.now() - (i % 12) * DAY,
      done,
    };
  };

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
  let covTotal = 0, covMeasured = 0, covRevealed = 0;

  /* 一行文本被"量到"= 它在读者当前状态下有盒子。absorb 把判分结果并进 fails，
     用 path+txt 去重，所以第二遍（揭开后）只会补进第一遍没见过的行。 */
  const freshKey = (r) => `${r.path}||${r.txt}`;
  const absorb = (rows, scope, theme, fresh) => {
    compose(rows.filter((r) => !r.hidden)).forEach((f) => {
      const dedup = SOURCE ? `${f.path}|${f.fg}` : `${scope}|${theme}|${f.sel}|${f.fg}|${f.size}`;
      if (seen.has(dedup)) return;
      seen.add(dedup);
      fails.push({ key: scope, theme, revealed: !!fresh, ...f });
    });
  };

  for (const theme of themes) {
    const store = {};
    all.forEach((k) => { store[k] = seed(k); });
    await page.addInitScript(([t, json]) => {
      try {
        localStorage.setItem('il_theme', t);
        localStorage.setItem('il_progress', json);
      } catch (e) { /* storage unavailable */ }
    }, [theme, JSON.stringify(store)]);
    await page.goto(url);
    await page.waitForTimeout(400);
    const applied = await page.evaluate(() => document.documentElement.dataset.theme);
    if (applied !== theme) console.log(`!! 主题未生效：期望 ${theme}，实际 ${applied}`);

    /* ── 壳层导航页：Round 19 之前从来没有被量过 ── */
    if (NAV) {
      await page.evaluate(() => { location.hash = '#/'; });
      await page.waitForTimeout(500);
      const r1 = await page.evaluate(COLLECT, 'nav');
      covTotal += r1.length;
      covMeasured += r1.filter((r) => !r.hidden).length;
      absorb(r1, '(导航页)', theme, false);
      if (REVEAL) {
        await page.evaluate(REVEAL_FN, 'nav');
        await page.evaluate(PING, 'nav');
        /* 重扫发生在 DELAY(120) + SETTLE(620) 之后，还要给 CSS transition 留时间：
           .pill 这类规则写着 transition: all .25s，量早了拿到的是过渡中间色。 */
        await page.waitForTimeout(1200);
        const r2 = await page.evaluate(COLLECT, 'nav');
        const known = new Set(r1.filter((r) => !r.hidden).map(freshKey));
        const fresh = r2.filter((r) => !r.hidden && !known.has(freshKey(r)));
        covRevealed += fresh.length;
        covMeasured += fresh.length;
        absorb(fresh, '(导航页)', theme, true);
        await page.evaluate(() => { if (window.__ilcUndo) window.__ilcUndo(); });
      }
    }

    for (const key of all) {
      await page.evaluate(() => { location.hash = '#/'; });
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
      const rows = await page.evaluate(COLLECT, 'mod');
      covTotal += rows.length;
      const meas = rows.filter((r) => !r.hidden);
      covMeasured += meas.length;
      absorb(rows, key, theme, false);
      if (REVEAL) {
        await page.evaluate(REVEAL_FN, 'mod');
        await page.evaluate(PING, 'mod');
        /* DELAY 120 + SETTLE 620 + transition .25s：等运行时重算完、颜色落定再量 */
        await page.waitForTimeout(1200);
        const rows2 = await page.evaluate(COLLECT, 'mod');
        const known = new Set(meas.map(freshKey));
        const fresh = rows2.filter((r) => !r.hidden && !known.has(freshKey(r)));
        covRevealed += fresh.length;
        covMeasured += fresh.length;
        absorb(fresh, key, theme, true);
        await page.evaluate(() => { if (window.__ilcUndo) window.__ilcUndo(); });
      }
    }
    console.log(`${theme} pass done, fails=${fails.length} 累计覆盖率=${covMeasured}/${covTotal} (${(covMeasured / covTotal * 100).toFixed(1)}%) 累计补量=${covRevealed}`);
  }
  await browser.close();

  const covPct = covTotal ? covMeasured / covTotal * 100 : 0;
  console.log(`\n文本元素 ${covTotal} / 量到 ${covMeasured} (${covPct.toFixed(1)}%) / 揭开补量 ${covRevealed} / 覆盖率下限 ${COVER}%`);

  fails.sort((a, b) => a.rc - b.rc);

  if (SOURCE) {
    const agg = new Map();
    fails.forEach((f) => {
      const k = `${f.path}  ${f.fg}`;
      const e = agg.get(k);
      if (e) { e.n++; e.mods[f.key] = (e.mods[f.key] || 0) + 1; } else {
        agg.set(k, { n: 1, mods: { [f.key]: 1 }, rc: f.rc, size: f.size, acc: f.acc, txt: f.txt, revealed: !!f.revealed });
      }
    });
    console.log(`\n== 源头簇（--source：未启用运行时兜底，按 路径 + 前景色 聚合）`);
    Array.from(agg.entries())
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, TOP)
      .forEach(([k, v]) => {
        const mods = Object.entries(v.mods).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m, n]) => `${m}:${n}`).join(' ');
        console.log(`${String(v.n).padStart(4)}  ${v.revealed ? '[展开后] ' : ''}${k}\n        ratio ${v.rc.toFixed(2)}  size ${v.size}  bg ${v.acc.join(',')}\n        例 ${JSON.stringify(v.txt)}\n        模块 ${mods}`);
      });
    const rev = fails.filter((f) => f.revealed).length;
    console.log(`TOTAL clusters: ${agg.size}  (rows: ${fails.length}，其中 ${rev} 行来自"揭开后才露面"的内容)`);
    console.log('（--source 仅供参考：这些簇由 ilcontrast.js 在运行时兜底，不作为 CI 判据）');
    process.exit(covPct >= COVER ? 0 : 1);
  }

  if (covPct < COVER) {
    console.log(`\n覆盖率闸门失败：${covPct.toFixed(1)}% < ${COVER}%。`);
    console.log('   闸门没量到 ≠ 没问题——Round 18 的 tap 闸门与本轮的对比度闸门都是先栽在这里。');
    process.exit(1);
  }

  if (fails.length > BUDGET) {
    console.log(`\n对比度审计失败：${fails.length} 行（预算 ${BUDGET}）`);
    fails.forEach((f) => {
      console.log(`  ${f.rc.toFixed(2).padStart(5)} (需 ${f.need}) ${f.theme.padEnd(5)} ${f.key.padEnd(12)} ${(f.revealed ? '展开后' : '读者态').padEnd(8)} ${f.sel.slice(0, 52).padEnd(52)} ${f.size}px ${f.fg} bg=${f.acc.join(',')} ex=${JSON.stringify(f.txt)}`);
    });
    console.log('\n提示：先用 `node tools/check-contrast.js --source --keys=<key>` 找到源头规则，');
    console.log('     再按 skin 的暗色孤岛约定补 token（见 index.html courseSkin 注释）。');
    process.exit(1);
  }
  console.log(`OK: 对比度审计通过（${all.length} 模块 + 导航页 × ${themes.length} 主题，${themes.join('/')}，失败 ${fails.length} ≤ 预算 ${BUDGET}）`);
})().catch((e) => {
  console.log('SKIP: 浏览器审计无法运行 — ' + (e && e.message ? e.message.split('\n')[0] : e));
  process.exit(0);
});
