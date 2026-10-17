/* ============================================================
 * ilcontrast.js — 文本对比度底线（运行时）
 *
 * 为什么需要它：
 *   skin（index.html 的 #courseSkin）负责把 45 个模块统一成一套配色，但它只能
 *   改写"变量"和"它认识的选择器"。模块里还有大量**写死的前景色**，例如
 *     .key { color: #f0a04b }        —— 为暗色底写的琥珀色
 *     .q-title { color: #e6edf3 }    —— 为暗色底写的近白
 *     .txt { color: var(--muted) }   —— 模块自己的 #64748b
 *   切到亮色后底变成白色，这些颜色留在原地：实测整站 light 模式 332 处文本
 *   低于 WCAG AA 4.5:1（最低 1.00:1，即霓虹绿压霓虹绿）。逐个改造 45 个模块
 *   源文件需要几十轮，且每轮新增模块都会重犯。
 *
 * 这一层做的事很窄：注入后扫描"直接含文本的元素"，沿祖先链合成真实背景，
 *   算出对比度；不足就把前景色沿 HSL 亮度轴往可读方向推（保持色相），
 *   用 inline !important 写回——只有"确实不达标"的元素才会被改，
 *   达标的模块原样保留，所以视觉冲击集中在本来就读不出字的区块上。
 *
 * SVG 图示（<text>）单独处理：图示里的文字用 fill 上色，改 color 完全没效果。
 *   这类文字遍布流程图/架构图/关系图，是模块里最难读的一层，所以前景读 cs.fill、
 *   写回也写 fill；底色除了祖先链，还要认同一 <g> 里压在它身上的 <rect>——
 *   图示的节点底板是 SVG 属性（fill="#2d323d"），computed backgroundColor
 *   对它永远是 transparent。审计脚本 /tmp 侧用同一套规则，两边才会同判。
 *
 * 它是底线不是主机制：主题变量（--sk-* / --ilq-*）仍是首选，模块作者想让
 *   某个区块换主题，应当用 token，而不是指望这里兜底。
 *
 * 用法：
 *   ILContrast.watch(el)          观察某容器（增删节点后自动重跑）
 *   ILContrast.run(el)            立即跑一遍，返回修正列表（测试用）
 *   ILContrast.unwatch(el)
 * ============================================================ */
(function (global) {
  'use strict';

  /* 阈值刻意比 AA 高一点（4.58 / 3.06）：审计脚本与这里的合成链会有
     零点几的差异（四舍五入、层级顺序），留一点余量才不会"看起来改过了但
     审计仍报 4.46"。 */
  var TARGET = 4.58;
  var TARGET_LARGE = 3.06;
  var DELAY = 120;         // 节点变动后的防抖窗口
  var SCROLL_DELAY = 140;    // 滚动停止后的防抖窗口

  /* 彩色 emoji / 箭头一类字形不吃 CSS color，对比度算的是伪命题。
     注意只在"整段文字都是符号"时跳过：helm 题库的 .q-title 是
     「模板 image: {{ .Values.x }} → 渲染结果」这种混合文本，早期版本
     只要含一个 → 就整条放过，审计（截断前 24 字）却照样判它 1.11:1。 */
  var SYMBOL_ONLY = /^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2000}-\u{206F}\u{00B7}\u{2022}]+$/u;

  function parseRGB(str) {
    var m = /rgba?\(([^)]+)\)/.exec(str || '');
    if (!m) return null;
    var p = m[1].split(/[\s,\/]+/).filter(function (x) { return x !== ''; }).map(parseFloat);
    if (p.length < 3 || p.some(function (v) { return isNaN(v); })) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }

  function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b); }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  /* src 压在 dst 上（dst 必须不透明） */
  function over(src, dst) {
    return {
      r: src.r * src.a + dst.r * (1 - src.a),
      g: src.g * src.a + dst.g * (1 - src.a),
      b: src.b * src.a + dst.b * (1 - src.a),
      a: 1,
    };
  }
  function fmt(c) {
    return 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')';
  }

  function rgbToHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d > 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: h, s: s, l: l };
  }

  function hue(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(h) {
    var hh = h.h, ss = h.s, ll = h.l;
    if (ss === 0) { var v = ll * 255; return { r: v, g: v, b: v, a: 1 }; }
    var q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    var p = 2 * ll - q;
    return { r: hue(p, q, hh + 1 / 3) * 255, g: hue(p, q, hh) * 255, b: hue(p, q, hh - 1 / 3) * 255, a: 1 };
  }

  /* 保持色相与饱和度，沿亮度轴**双向**搜索刚好达标的颜色；
     都不达标就退回中性墨色。之前只朝"背景亮/暗"的一个方向走，遇到
     中等明度的底（如 pid 的 #9b5de5 紫标签）两个方向都能达标却选了
     更远的白字，白字本身只有 4.04 → 判定失败干脆不改（实测残留）。 */
  var INK_DARK = { r: 17, g: 21, b: 28, a: 1 };
  var INK_LIGHT = { r: 255, g: 255, b: 255, a: 1 };

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function accessible(fg, bg, need) {
    var h = rgbToHsl(fg);
    var found = [];
    [-1, 1].forEach(function (dir) {
      for (var i = 1; i <= 100; i++) {
        var L = clamp01(h.l + (dir * i) / 100);
        var c = hslToRgb({ h: h.h, s: h.s, l: L });
        if (ratio(c, bg) >= need) { found.push(c); return; }
        if (L === 0 || L === 1) return;
      }
    });
    [INK_DARK, INK_LIGHT].forEach(function (c) {
      if (ratio(c, bg) >= need) found.push(c);
    });
    if (!found.length) return null;
    /* 取亮度移动最小的：保留模块自己的视觉身份，只把它推到能读 */
    found.sort(function (a, b2) {
      return Math.abs(lum(a) - lum(fg)) - Math.abs(lum(b2) - lum(fg));
    });
    return found[0];
  }

  /* 沿祖先链合成背景：把每一层 background-color（含半透明）依次压到底色上。
     刻意**忽略 background-image**（渐变/图案）：这类底算不出确切像素，
     但 audits（tools/check-contrast.js）与本页算法必须给出同一个数，
     否则会出现"审计说 1.11、运行时说 4.62"这种谁也说服不了谁的僵局——
     Round 17 实测就卡在这里（n8n 的 .nav a、helm 的 .q-title）。
     忽略图案后两边都以"纯色垫底"为准，运行时改完的颜色一定满足审计；
     代价是个别渐变装饰区被多改深一点，读起来仍没问题。 */
  /* SVG 文字的"真实垫底色"：图示普遍写成
         <g><rect x=20 y=110 width=140 height=60 fill="#2d323d"/><text x=90 y=135 …>
     ——底板是一块 <rect>，颜色来自 **SVG 属性**（fill="#hex"），不是 CSS。
     在它的父级里找包围住这个 text 锚点、且面积最小的那一块（父级常是 <g>，
     也可能是 <svg> 根——直接挂在根上的 text 没有 ownerSVGElement，别拿它当判据）。
     坐标是用户坐标（viewBox 空间），text 的 x/y 是基线，所以纵向允许 y-h ~ y+6 的容差。 */
  function svgBackdrop(el) {
    var g = el.parentElement;
    if (!g || !g.getElementsByTagName) return null;
    var x = parseFloat(el.getAttribute('x')) || 0;
    var y = parseFloat(el.getAttribute('y')) || 0;
    var shapes = g.getElementsByTagName('*');
    var best = null, bestArea = Infinity;
    for (var i = 0; i < shapes.length; i++) {
      var sh = shapes[i];
      if (sh === el || sh.namespaceURI !== 'http://www.w3.org/2000/svg') continue;
      var tag = sh.tagName.toLowerCase();
      if (tag !== 'rect' && tag !== 'circle' && tag !== 'path') continue;
      var rx, ry, rw, rh;
      if (tag === 'circle') {
        var cr = parseFloat(sh.getAttribute('r')) || 0;
        if (!cr) continue;
        rx = (parseFloat(sh.getAttribute('cx')) || 0) - cr; ry = (parseFloat(sh.getAttribute('cy')) || 0) - cr; rw = rh = cr * 2;
      } else {
        rx = parseFloat(sh.getAttribute('x')) || 0; ry = parseFloat(sh.getAttribute('y')) || 0;
        rw = parseFloat(sh.getAttribute('width')) || 0; rh = parseFloat(sh.getAttribute('height')) || 0;
        if (tag === 'path' || !(rw > 0 && rh > 0)) {
          /* path / 无显式宽高的图形：用几何包围盒（用户坐标，不受屏幕缩放影响） */
          if (!sh.getBBox) continue;
          var bb = null;
          try { bb = sh.getBBox(); } catch (e) { continue; }
          if (!bb || !(bb.width > 0 && bb.height > 0)) continue;
          rx = bb.x; ry = bb.y; rw = bb.width; rh = bb.height;
        }
      }
      if (x < rx - 4 || x > rx + rw + 4 || y < ry - 6 || y > ry + rh + 6) continue;
      var area = rw * rh;
      var c = parseRGB(sh.getAttribute('fill') || '') || parseHex(sh.getAttribute('fill'));
      if (!c) c = parseRGB(global.getComputedStyle(sh).fill);
      if (!c || c.a <= 0) continue;
      if (area < bestArea) { bestArea = area; best = c; }
    }
    return best;
  }

  function parseHex(str) {
    var m = /^\s*#([0-9a-f]{6}|[0-9a-f]{3})\s*$/i.exec(String(str == null ? '' : str));
    if (!m) return null;
    var h = m[1].length === 3 ? m[1].replace(/./g, function (c) { return c + c; }) : m[1];
    return { r: parseInt(h.substr(0, 2), 16), g: parseInt(h.substr(2, 2), 16), b: parseInt(h.substr(4, 2), 16), a: 1 };
  }

  function backgroundOf(el, cache) {
    var layers = [], n = el, guard = 0;
    /* SVG 里的祖先（<g>/<svg>/…）没有盒子：backgroundColor 恒为 transparent，
       祖先链一路穿到外层 div（常常是主题浅底）——于是"深 rect + 浅字"被误算成
       "浅底 + 浅字"，运行时把本来好好的图示标签改深，反而糊在深底板上。
       先认同一 <g> 里压在它身上的那块板（rect/circle/path 的 fill 属性），
       找不到再退回外层 HTML 祖先。 */
    if (el.ownerSVGElement && el.ownerSVGElement.getElementsByTagName) {
      var svgBg = svgBackdrop(el);
      n = el;
      while (n && n.ownerSVGElement) n = n.parentElement;   /* 跳出 SVG 子树 */
      if (svgBg) {
        /* 底板常常是**半透明**色晕（n8n 概念图就是 rect fill=rgba(46,204,113,.15)
           压在深色页面上）。直接把这块颜色当成"最终底色"返回，等于假装它是不透明
           的亮绿 —— 于是 #2ecc71 的标签被判定 1.x:1，运行时把它改成近黑的
           rgb(0,76,19)，屏幕上原本清清楚楚的字反而糊了（Round 17 实测 5 处）。
           正确做法：色晕只是最上面一层，继续往下的 HTML 祖先合成。 */
        if (svgBg.a >= 1) return svgBg;
        layers.push(svgBg);
      }
      if (!n) {
        var only = layers.length ? layers[0] : null;
        if (!only) return null;
        var canvas = { r: 255, g: 255, b: 255, a: 1 };
        return over(only, canvas);
      }
    }
    while (n && n.nodeType === 1 && guard++ < 40) {
      /* 祖先的图案层同样忽略：模块常见的 .reveal/.insight 色晕是
         装饰性渐变，去掉它之后按纯色垫底判断，两边一致。 */
      var cached = cache && cache.get(n);
      if (cached !== undefined) {
        if (cached) { layers.push(cached); if (cached.a >= 1) break; }
        n = n.parentElement;
        continue;
      }
      var c = parseRGB(global.getComputedStyle(n).backgroundColor);
      if (cache) cache.set(n, c);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      n = n.parentElement;
    }
    var base = { r: 255, g: 255, b: 255, a: 1 };   /* 浏览器默认画布 */
    if (layers.length && layers[layers.length - 1].a >= 1) base = layers.pop();
    var acc = { r: base.r, g: base.g, b: base.b, a: 1 };
    for (var i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  }

  function ownText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return String(el.value || el.getAttribute('placeholder') || el.textContent || '').replace(/\s+/g, ' ').trim();
    }
    var t = '';
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) t += c.nodeValue;
    }
    return t.replace(/\s+/g, ' ').trim();
  }

  function isLarge(cs) {
    var size = parseFloat(cs.fontSize) || 16;
    var weight = parseInt(cs.fontWeight, 10) || 400;
    return size >= 24 || (size >= 18.66 && weight >= 700);
  }

  /* 只扫描"自己挂了文本节点"的元素：先收集，再算样式。
     用 TreeWalker 遍历文本节点比 querySelectorAll('*') 再筛便宜得多。 */
  function textHosts(root) {
    var out = [], seen = new global.Set();
    var w = global.document.createTreeWalker(root, 4 /* SHOW_TEXT */, null, false);
    for (var t = w.nextNode(); t; t = w.nextNode()) {
      if (!t.nodeValue || !t.nodeValue.trim()) continue;
      var p = t.parentElement;
      if (!p || p.tagName === 'SCRIPT' || p.tagName === 'STYLE') continue;
      if (!seen.has(p)) { seen.add(p); out.push(p); }
    }
    /* 输入控件里的文字不是子节点，是 value/placeholder —— 练习用的 Dockerfile
       编辑器、nginx 配置框、YAML 沙盘全靠它，漏掉就等于没查（残留 2 处）。 */
    var inputs = root.querySelectorAll(
      'textarea, input[type=text], input:not([type]), input[type=search], input[type=number]');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.type === 'range' || el.type === 'color') continue;   /* 值不显示成文字 */
      var v = (el.value || el.getAttribute('placeholder') || '');
      if (!v.trim()) continue;
      if (!seen.has(el)) { seen.add(el); out.push(el); }
    }
    return out;
  }

  function run(root) {
    if (!root || !root.querySelectorAll) return [];
    var fixed = [];
    var cache = new global.WeakMap();
    var nodes = textHosts(root);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var cs = global.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      /* 不看 opacity：.step 那类滚动淡入区块在扫描瞬间是 0，稍后才 1，
         而"能不能读"取决于最终状态。之前的 <0.98 跳过让 24 个模块的
         reveal 区块全部躲过检查（审计脚本同样只看自身 opacity，两边一起改）。 */
      var txt = ownText(el);
      if (!txt || SYMBOL_ONLY.test(txt)) continue;
      /* 元素自己印了渐变/背景图：文字实际压在图案上，纯色合成算出的
         比例不可信（审计也按同一条规则跳过，两边才会同判不改）。 */
      if (cs.backgroundImage && cs.backgroundImage !== 'none') continue;
      var bg = backgroundOf(el, cache);
      if (!bg) continue;
      /* SVG 的 <text> 用 fill 上色：cs.color 往往是从外层继承来的主题色，
         跟屏幕上真正看到的那个颜色无关。读错颜色就会"把本来清清楚楚的图示
         标签改深/改浅"，所以这里按元素类型选前景属性，写回也写同一个。 */
      var isSvg = !!el.ownerSVGElement;
      var fg = parseRGB(isSvg ? cs.fill : cs.color) || (isSvg ? parseHex(el.getAttribute('fill')) : null);
      if (!fg) continue;
      var fgo = over(fg, bg);
      var need = isLarge(cs) ? TARGET_LARGE : TARGET;
      if (ratio(fgo, bg) >= need) continue;
      var next = accessible(fgo, bg, need);
      if (!next || ratio(next, bg) < need) continue;
      /* inline !important 才能压过 skin 与模块的 !important 规则 */
      el.style.setProperty(isSvg ? 'fill' : 'color', fmt(next), 'important');
      el.setAttribute('data-ilc', isSvg ? 'fill' : '1');
      fixed.push({ sel: el.tagName.toLowerCase() + (el.className && String(el.className).trim ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''), from: fmt(fgo), to: fmt(next), ratio: ratio(fgo, bg) });
    }
    return fixed;
  }

  function clear(root) {
    if (!root || !root.querySelectorAll) return;
    var old = root.querySelectorAll('[data-ilc]');
    for (var i = 0; i < old.length; i++) {
      /* 当初写的是哪个属性，这里就撤哪个：撤错会把图示标签的 fill 留在原地，
         或者把本来没动过的 color 一起抹掉。 */
      old[i].style.removeProperty(old[i].getAttribute('data-ilc') === 'fill' ? 'fill' : 'color');
      old[i].removeAttribute('data-ilc');
    }
  }

  /* 补一刀 trailing pass：模块普遍写了 transition: all .3s / 滚动进度改
     background，防抖时刻读到的往往是过渡中的中间色（n8n/makefile 的吸顶导航
     实测就停在 0.075 透明度上），几毫秒后再算会拿到另一个底色，审计又读到
     第三个。延迟 140ms 先响应，再隔 SETTLE 补算一次，等过渡走完。 */
  var SETTLE = 620;

  function reschedule(state, delay) {
    clearTimeout(state.timer);
    state.timer = setTimeout(function () {
      clear(state.root);
      run(state.root);
      clearTimeout(state.timer2);
      state.timer2 = setTimeout(function () { clear(state.root); run(state.root); }, SETTLE);
    }, delay);
  }

  /* 只观察 childList：我们自己写的是 style 属性，若同时观察 attributes
     就会"改一次→重算→又改一次"永久循环。
     另外还要跟着滚动重算：makefile/n8n 的吸顶导航把 rgba(15,23,42,.95) 按滚动
     进度淡成 .42（模块自己的 scroll listener），底色变了、前景就必须重推；
     只算一次会在用户滚下去之后留下 1.30:1 的链接（Round 17 实测）。 */
  function watch(root) {
    if (!root || root.__ilcObs) return;
    var state = { root: root, timer: null, timer2: null };
    var obs = new MutationObserver(function () { reschedule(state, DELAY); });
    /* childList 之外还要听 class：reveal-on-scroll 的模块（helm 的 .step）在
       渲染那一刻还是 display:none，扫描时整片被跳过；之后它只是加上 .visible
       变可见，没有任何节点增删——不监听属性的话这些区块就永远漏网（实测 1.11:1）。
       attributeFilter 只放行 class：我们自己的写入是 style，不会自激。 */
    obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    /* 滚动一律走防抖：节流分支会在"最后一次滚动事件刚过就立刻算"的时机
       拿到过渡中的底色（n8n/makefile 的吸顶导航按滚动进度改 background，
       实测审计停在 0.075 透明度时 runtime 刚按 0.95 推过色 → 2.52:1）。 */
    var onScroll = function () { reschedule(state, SCROLL_DELAY); };
    global.addEventListener('scroll', onScroll, { passive: true });
    root.__ilcObs = obs;
    root.__ilcScroll = onScroll;
    root.__ilcState = state;
    clear(root);
    run(root);
  }

  function unwatch(root) {
    if (root && root.__ilcObs) { root.__ilcObs.disconnect(); root.__ilcObs = null; }
    if (root && root.__ilcScroll) { global.removeEventListener('scroll', root.__ilcScroll); root.__ilcScroll = null; }
    if (root && root.__ilcState) { clearTimeout(root.__ilcState.timer); clearTimeout(root.__ilcState.timer2); root.__ilcState = null; }
  }

  /* check(el)：把内部判断摊开给测试和调试用——为什么这个元素改/不改，
     一眼能看出来，不用在页面上猜。 */
  function check(el) {
    var cs = global.getComputedStyle(el);
    var t0 = ownText(el);
    if (!t0 || SYMBOL_ONLY.test(t0)) return { skip: 'symbol-only', own: t0.slice(0, 16) };
    if (cs.display === 'none' || cs.visibility === 'hidden') return { skip: 'not-rendered' };
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return { skip: 'own-background-image' };
    var bg = backgroundOf(el, new global.WeakMap());
    var fg = parseRGB(cs.color);
    if (!bg || !fg) return { skip: !bg ? 'background-unknown' : 'color-unknown', fg: cs.color };
    var fgo = over(fg, bg);
    var need = isLarge(cs) ? TARGET_LARGE : TARGET;
    var rc = ratio(fgo, bg);
    var next = rc >= need ? null : accessible(fgo, bg, need);
    return {
      fg: fmt(fgo), bg: fmt(bg), ratio: Math.round(rc * 100) / 100, need: need,
      ok: rc >= need, fixedTo: next ? fmt(next) : null,
      fixedRatio: next ? Math.round(ratio(next, bg) * 100) / 100 : null,
      own: ownText(el).slice(0, 16),
    };
  }

  global.ILContrast = {
    run: run, clear: clear, watch: watch, unwatch: unwatch, check: check,
    ratio: function (fg, bg) { return ratio(parseRGB(fg) || fg, parseRGB(bg) || bg); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
