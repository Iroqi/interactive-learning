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
 * 关键教训：类名不是语义。第一版探针把 `#moduleRoot .key` 当控件扫，捞到 137 个
 * <pre> 里的语法高亮 span（redis/vscode/tmux 的 `pre .key` 是"命令名着色"），
 * 虚报成小触控目标；把类名族（.btn/.chip/.pill/.tab/.key）放进选择器就等于让
 * 探针去猜模块的本意。这里只认**真实可点/可输入的元素**，外加"确实包着控件的
 * label"。所以模块想加交互元素请用 <button>，用 <span onclick> 会被这条漏掉——
 * 那种写法本来也该改。
 *
 * 用法：
 *   node tools/check-tap.js                    全部模块（出厂阈值 24px，--budget=0）
 *   node tools/check-tap.js --keys=git,bash    分片排查
 *   node tools/check-tap.js --budget=3         容忍少量既有欠账（回归时仍会报）
 *   node tools/check-tap.js --warn=0           连 24–31px 的 WARN 也当失败（当前不为 0）
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

    const res = await page.evaluate(([HARD, SOFT]) => {
      /* 只认真实可点/可输入的元素；类名族一律不猜 */
      const SEL = '#moduleRoot button, #moduleRoot [role="button"], #moduleRoot a[href], ' +
                  '#moduleRoot select, #moduleRoot textarea, #moduleRoot input, #moduleRoot label';
      const hard = [], soft = [];
      document.querySelectorAll(SEL).forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.disabled) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const t = el.tagName.toLowerCase(), ty = (el.type || '').toLowerCase();
        if (t === 'label') {
          const wraps = !!el.querySelector('input,select,textarea');
          const forCtl = el.htmlFor ? document.getElementById(el.htmlFor) : null;
          if (!wraps && !forCtl) return;                       /* 图注 label：不是热区 */
        }
        if (t === 'input') {
          if (ty === 'hidden' || ty === 'range' || ty === 'color' || ty === 'file') return;
          if (ty === 'radio' || ty === 'checkbox') {
            const w = el.closest('label');                     /* 热区由 label 承担 */
            if (w && w.getBoundingClientRect().height >= 32) return;
          }
        }
        if (cs.display === 'inline') {                          /* 2.5.8 Inline 例外 */
          const par = el.parentElement;
          const sibText = par && Array.from(par.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
          if (sibText) return;
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
        if (h < HARD || w < HARD) hard.push(row);
        else if (h < SOFT) soft.push(row);
      });
      return { hard, soft };
    }, [HARD, SOFT]);

    hardTotal += res.hard.length;
    softTotal += res.soft.length;
    res.hard.forEach((row) => hardRows.push(c.key + '  ' + row.sig + '  "' + row.txt + '"  ← ' + row.path));
    if (res.soft.length) console.log('  warn  ' + c.key.padEnd(12) + res.soft.length + ' 个热区在 24–31px');
  }

  await browser.close();

  console.log('');
  hardRows.slice(0, 25).forEach((x) => console.log('  FAIL ' + x));
  if (hardRows.length > 25) console.log('  … 另有 ' + (hardRows.length - 25) + ' 条');
  console.log('硬失败(< ' + HARD + 'px，WCAG 2.5.8 AA): ' + hardTotal + ' 个 / 预算 ' + BUDGET);
  console.log('软警告(24–' + (SOFT - 1) + 'px，平台建议值): ' + softTotal + ' 个');
  if (errs.length) {
    console.log('pageerror: ' + errs.length);
    errs.slice(0, 5).forEach((e) => console.log('  ' + e));
  }

  const bad = hardTotal > BUDGET || errs.length > 0 || (WARN_FAIL && softTotal > 0);
  if (bad) { console.log('\n触控热区闸门未通过'); process.exit(1); }
  console.log('\nOK: 触控热区闸门通过（' + targets.length + ' 模块 × 390×844 触屏视口，硬失败 0）');
})().catch((e) => {
  console.log('SKIP/ERROR: ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n'));
  process.exit(0);
});
