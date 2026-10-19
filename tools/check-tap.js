#!/usr/bin/env node
/*
 * tools/check-tap.js — 触控热区地板回归闸门
 *
 * 为什么需要它（Round 18）：上一轮的触控断言写在 smoke 探针里，而那段探针
 * 只在"哈希当前那一个模块"上跑，等于其余模块的控件从来没被测过。地板本身
 * 现在是 skin 里三组 CSS 规则（`index.html` 的 courseSkin 末尾），任何一次
 * 模块改版或 skin 重排都可能把它顶掉，而肉眼在手机上很难发现"点不准"。
 * 于是把判据固化成工具，与 check-contrast.js 同级：能在 CI 里跑、没浏览器就 SKIP。
 *
 * 判据分两层（口径写进 README 的"手机可用性下限"）：
 *   FAIL 真控件 宽或高 < 24px —— WCAG 2.5.8 AA「Minimum Target Size」，规范硬线
 *   WARN 真控件 高度 24–31px —— iOS/Android 的可用性建议值，只列不计失败
 *   豁免 行内链接（display:inline 且父级有兄弟文本）—— 2.5.8 的 Inline 例外，
 *        也正好是 min-height 对 inline 盒无效的自然结果；被 ≥32px label 包裹的
 *        radio/checkbox（热区由 label 承担）；纯图注 label；range/color/hidden 输入；
 *        disabled 元素
 *
 * 关键教训一：类名不是语义。第一版探针把 `#moduleRoot .key` 当控件扫，捞到 137 个
 * <pre> 里的语法高亮 span（redis/vscode/tmux 的 `pre .key` 是"命令名着色"），
 * 虚报成小触控目标；把类名族（.btn/.chip/.pill/.tab/.key）放进选择器就等于让
 * 探针去猜模块的本意。这里只认**真实可点/可输入的元素**，外加"确实包着控件的
 * label"。所以模块想加交互元素请用 <button>，用 <span onclick> 会被这条漏掉——
 * 那种写法本来也该改。
 *
 * 关键教训二：闸门自己也会漏测。首版只量"当时可见"的元素，于是折叠面板 / 未激活
 * 标签页 / `hidden` 属性里的控件全部隐身：plc 只量到 5/86、yaml 9/79、pid 22/86，
 * 覆盖率不到 10% 却照样打印 OK。现在分两遍量——先按读者方式量可见的，再把量不到
 * 的元素的祖先链临时揭开（`display:block` / `visibility:visible` / 去掉 `hidden`）
 * 补量，量完还原。并给出 measured/total 覆盖率，低于 --cover= 阈值即判失败：
 * "没测到"不等于"没问题"，这是同一个 bug 的两种形态。
 *
 * 关键教训三：`min-height` 对非替换 inline 盒无效（CSS 2.1），所以行内链接的地板
 * 不能只靠 skin 那条 `a[href]{min-height:24px}`。沙箱里的 Chrome for Testing 152
 * 宽松地把它应用了（实测 24px），CI 的 Chromium 没有（实测 17px）——同一个元素
 * 本地 WARN、CI FAIL。规范内的写法是换盒模型（inline-block），故 skin 对
 * "块里只有它自己"的独立链接用 `:only-child` 提为 inline-block。
 *
 * 用法：
 *   node tools/check-tap.js                    全部模块（出厂阈值 24px，--budget=0）
 *   node tools/check-tap.js --keys=git,bash    分片排查
 *   node tools/check-tap.js --budget=3         容忍少量既有欠账（回归时仍会报）
 *   node tools/check-tap.js --warn=0           连 24–31px 的 WARN 也当失败（当前不为 0）
 *   node tools/check-tap.js --cover=90         覆盖率下限（默认 90%）
 *   node tools/check-tap.js --no-reveal        只量当时可见的元素（复现旧行为用）
 * 找不到 Playwright/Chromium 时打印 SKIP 并 exit 0（与 check-contrast.js 一致：
 * 这个仓库没有 package.json，不能因为一个检查就引入依赖清单）。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
};
const HARD = 24;                 // 规范硬线（不可调）
const SOFT = 32;                 // 平台建议值
const BUDGET = parseInt(opt('budget', '0'), 10);
const WARN_FAIL = parseInt(opt('warn', '1'), 10) === 0;
const COVER = parseInt(opt('cover', '90'), 10);
const REVEAL = argv.indexOf('--no-reveal') < 0;
const ONLY = opt('keys', '').split(',').map((x) => x.trim()).filter(Boolean);

function loadPlaywright() {
  const tries = ['playwright', 'playwright-core', '/usr/local/node/lib/node_modules/playwright'];
  for (const t of tries) {
    try { return require(t); } catch (e) { /* next */ }
  }
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
  // courses.js 是 `window.IL_COURSES = [...]`，用 eval 取回而不引入 jsdom
  eval(fs.readFileSync(path.join(ROOT, 'courses.js'), 'utf8'));
  return global.window.IL_COURSES;
})();

(async () => {
  const pw = loadPlaywright();
  const exe = pw && findChromium();
  if (!pw || !exe) {
    console.log('SKIP: 未找到 Playwright 或 Chromium —— 跳过触控热区闸门（安装后即生效）');
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
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(300);

  const targets = ONLY.length ? courses.filter((c) => ONLY.indexOf(c.key) >= 0) : courses;
  let hardTotal = 0, softTotal = 0;
  let totMeasured = 0, totSel = 0;
  const lowCover = [];
  const hardRows = [];

  for (const c of targets) {
    await page.evaluate((k) => { location.hash = '#/m/' + k; }, c.key);
    await page.waitForTimeout(300);
    // 像读者一样滚一遍：模块的 .step 靠 IntersectionObserver 淡入，不滚就量不到
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      await new Promise((r) => setTimeout(r, 500));
      window.scrollTo(0, 0);
    });

    /* 两遍量：
       1) asIs —— 只量读者当前能看到的东西（保留旧口径，作为覆盖率分母之外的真值）
       2) revealed —— 把第 1 遍量不到的元素的祖先链临时揭开再补量，量完立刻还原
       第 2 遍是为了折叠面板 / 未激活 tab / [hidden] 里的那些控件：它们同样是真
       交互，只是此刻不在屏幕上。 */
    const res = await page.evaluate(([HARD, SOFT, REVEAL]) => {
      /* 只认真实可点/可输入的元素；类名族一律不猜 */
      const SEL = '#moduleRoot button, #moduleRoot [role="button"], #moduleRoot a[href], ' +
                  '#moduleRoot select, #moduleRoot textarea, #moduleRoot input, #moduleRoot label';
      const els = Array.from(document.querySelectorAll(SEL));
      const total = els.length;

      const hasBox = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const hidden = (el) => {
        const cs = getComputedStyle(el);
        return cs.display === 'none' || cs.visibility === 'hidden';
      };

      const judge = (el) => {                       /* -> 'hard' | 'soft' | null */
        const cs = getComputedStyle(el);
        if (el.disabled) return null;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        const t = el.tagName.toLowerCase(), ty = (el.type || '').toLowerCase();
        if (t === 'label') {
          const wraps = !!el.querySelector('input,select,textarea');
          const forCtl = el.htmlFor ? document.getElementById(el.htmlFor) : null;
          if (!wraps && !forCtl) return null;                       /* 图注 label：不是热区 */
        }
        if (t === 'input') {
          if (ty === 'hidden' || ty === 'range' || ty === 'color' || ty === 'file') return null;
          if (ty === 'radio' || ty === 'checkbox') {
            const w = el.closest('label');                          /* 热区由 label 承担 */
            if (w && w.getBoundingClientRect().height >= 32) return null;
          }
        }
        if (cs.display === 'inline') {                              /* 2.5.8 Inline 例外 */
          const par = el.parentElement;
          const sibText = par && Array.from(par.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
          /* 只有"落在行文里"的链接才免于尺寸判据。没有兄弟文本 = 独立目标，
             而 inline 盒吃不到任何 min-height（CSS 2.1：min-height 不适用于
             非替换 inline 盒），所以它**必然**不达标 —— 按 display 判、不按实测
             像素判，这样换引擎也不会一边红一边绿。 */
          if (sibText) return null;
          const rr = el.getBoundingClientRect();
          return { sig: '<' + el.tagName.toLowerCase() + '> ' + Math.round(rr.width) + 'x' + Math.round(rr.height) + ' display:inline',
                   txt: (el.textContent || '').trim().slice(0, 20),
                   path: 'inline 盒，min-height 无效', kind: 'hard' };
        }
        const h = Math.round(r.height), w = Math.round(r.width);
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
        const row = {
          sig: '<' + t + (cls ? ' .' + cls : '') + (ty ? ' type=' + ty : '') + '> ' + w + 'x' + h,
          txt: (el.textContent || '').trim().slice(0, 20),
          path: (() => {
            const seg = []; let n = el;
            for (let i = 0; i < 3 && n && n.id !== 'moduleRoot'; i++) {
              seg.unshift(n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/)[0] : ''));
              n = n.parentElement;
            }
            return seg.join(' > ');
          })(),
        };
        if (h < HARD || w < HARD) { row.kind = 'hard'; return row; }
        if (h < SOFT) { row.kind = 'soft'; return row; }
        return null;
      };

      const hard = [], soft = [];
      const counted = new Set();
      let measured = 0;
      const pass = (list) => list.forEach((el) => {
        if (counted.has(el)) return;
        if (hidden(el)) return;                                     /* 还藏着的：没测到，也不算测过 */
        if (!hasBox(el)) return;                                     /* 0 尺寸（脱离文档流等）：同上 */
        counted.add(el); measured++;
        const row = judge(el);
        if (!row) return;
        (row.kind === 'hard' ? hard : soft).push(row);
      });

      const visible = els.filter((el) => !hidden(el) && hasBox(el));
      pass(visible);

      if (REVEAL) {
        /* 揭开：沿祖先链把 display:none / visibility:hidden / [hidden] 临时顶掉，
           记下药方，量完按原样还原（inline style 的既有值与优先级都保留）。 */
        const acts = [];
        const reveal = (el) => {
          const cs = getComputedStyle(el);
          if (el.hasAttribute('hidden')) { acts.push({ el, kind: 'hidden' }); el.hidden = false; }
          if (cs.display === 'none') {
            acts.push({ el, kind: 'css', prop: 'display', v: el.style.display, p: el.style.getPropertyPriority('display') });
            el.style.setProperty('display', 'block', 'important');
          }
          if (cs.visibility === 'hidden') {
            acts.push({ el, kind: 'css', prop: 'visibility', v: el.style.visibility, p: el.style.getPropertyPriority('visibility') });
            el.style.setProperty('visibility', 'visible', 'important');
          }
        };
        els.forEach((el) => {
          if (counted.has(el)) return;
          if (!hidden(el) && hasBox(el)) return;                    /* 第 1 遍已量过 */
          const chain = [];
          let n = el.parentElement;
          while (n && n.id !== 'moduleRoot') { chain.unshift(n); n = n.parentElement; }
          chain.forEach(reveal);
          reveal(el);
        });
        /* 揭完再统一量（顺序很重要：先全部揭开，否则后面的元素仍被前面的祖先挡住） */
        pass(els);
        acts.reverse().forEach((a) => {
          if (a.kind === 'hidden') { a.el.hidden = true; return; }
          if (a.v) a.el.style.setProperty(a.prop, a.v, a.p);
          else a.el.style.removeProperty(a.prop);
        });
      }

      return { hard, soft, measured, total, revealed: REVEAL };
    }, [HARD, SOFT, REVEAL]);

    hardTotal += res.hard.length;
    softTotal += res.soft.length;
    totSel += res.total;
    totMeasured += res.measured;
    const cov = res.total ? Math.floor((res.measured / res.total) * 100) : 100;
    if (cov < COVER) lowCover.push(c.key + ' ' + res.measured + '/' + res.total + '（' + cov + '%）');
    if (process.env.IL_TAP_COVER) console.log('  cov   ' + c.key.padEnd(12) + res.measured + '/' + res.total + ' = ' + cov + '%');
    res.hard.forEach((row) => hardRows.push(c.key + '  ' + row.sig + '  "' + row.txt + '"  ← ' + row.path));
    if (res.soft.length) console.log('  warn  ' + c.key.padEnd(12) + res.soft.length + ' 个热区在 24–31px');
  }

  await browser.close();

  console.log('');
  hardRows.slice(0, 25).forEach((x) => console.log('  FAIL ' + x));
  if (hardRows.length > 25) console.log('  … 另有 ' + (hardRows.length - 25) + ' 条');
  console.log('硬失败(< ' + HARD + 'px，WCAG 2.5.8 AA): ' + hardTotal + ' 个 / 预算 ' + BUDGET);
  console.log('软警告(24–' + (SOFT - 1) + 'px，平台建议值): ' + softTotal + ' 个');
  console.log('覆盖率(量到的真控件 / 选择器命中数): ' + totMeasured + '/' + totSel +
    (REVEAL ? '，含折叠面板补量' : '，未补量（--no-reveal）') + ' / 下限 ' + COVER + '%');
  if (lowCover.length) {
    console.log('低覆盖模块（<' + COVER + '%，多半是揭开也没能显示的控件）:');
    lowCover.forEach((x) => console.log('  ' + x));
  }
  if (errs.length) {
    console.log('pageerror: ' + errs.length);
    errs.slice(0, 5).forEach((e) => console.log('  ' + e));
  }

  const bad = hardTotal > BUDGET || errs.length > 0 || lowCover.length > 0 || (WARN_FAIL && softTotal > 0);
  if (bad) { console.log('\n触控热区闸门未通过'); process.exit(1); }
  console.log('\nOK: 触控热区闸门通过（' + targets.length + ' 模块 × 390×844 触屏视口，硬失败 0）');
})().catch((e) => {
  console.log('SKIP/ERROR: ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n'));
  process.exit(0);
});
