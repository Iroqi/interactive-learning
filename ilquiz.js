/* ============================================================
 * ilquiz.js — 共享测验 / 进度运行时（唯一来源）
 *
 * 存在的原因：Round 1~12 里，测验与进度代码在每个模块内各写一份，
 * 结果 17 个早期模块从未接入 il_progress（不出现在连续学习、热力图、
 * 到期复习、错题本里），wrongs-first 也只能按模板批处理、反复漏模块
 * （Round 12 就漏了 oauth2/tls）。这里把协议收敛成一处：
 *
 *   IL.touch(key)        仅标记“今天学过”，让全部模块都能被壳层看见
 *   IL.mount(key, cfg)   里程碑引擎：解锁进度条 + localStorage 联动
 *   IL.quiz(cfg)         测验引擎：判分 + quiz.wrongs + 错题优先重做
 *   IL.order(key, data)  协议垫片：自带 JS 题库的老模块，错题前置 + 稳定下标
 *   IL.orderDom(key, els) 同上，但题库写死在 HTML 里（regex/sql）
 *   IL.record(key, ...)  协议垫片：写 quiz { score,total,wrongs,at } + last
 *                        （at 是交卷时间：复习队列的时钟，不用访问时间冒充）
 *
 * 使用方式（二选一）：
 *   - 独立页面（src/*.html）：<script src="../ilquiz.js"></script>
 *   - 打包后的模块：pack-modules.py 会把该 <script src> 内联进 js 字段，
 *     所以 modules/*.js 仍然自包含，壳层无需任何改动。
 * ============================================================ */
(function (global) {
  'use strict';

  /* 打包时 pack-modules.py 会把本文件内联进模块的 js 字段，于是壳层（已加载
     一份）与模块（又内联一份）都会执行。已存在就跳过，保证只有一份实现生效、
     不会互相覆盖。 */
  if (global.IL) return;

  var STORE = 'il_progress';
  var THEME_KEY = 'il_theme';

  /* ── 主题：唯一的写入点 ──
   * 背景：<html data-theme> 是壳层与 5 个模块（docker/net/cs/cf-workers/vfd）
   * 共用的属性，而模块 CSS 用的是裸 [data-theme="dark"] 选择器。模块自带的
   * ☀/🌙 按钮直接写这个属性，就会把整站的 data-theme 抢走（写 '' 或 'light'
   * 都算抢），壳层的亮色变量与 skin 的亮色 token 同时失效——表现为
   * "切过一次模块主题，全站暗色再也回不来"。这里把读写收敛成一处，
   * 模块按钮只准调用 IL.toggleTheme()，不再自己操作 DOM。 */
  function themeGet() {
    try { return global.localStorage.getItem(THEME_KEY) || 'auto'; }
    catch (e) { return 'auto'; }
  }

  function isDark() {
    var t = themeGet();
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function applyTheme() {
    var d = isDark();
    if (global.document) global.document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
    return d;
  }

  /* 返回切换后的有效主题，供模块更新自己的按钮文字。 */
  function setTheme(next) {
    try { global.localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
    var d = applyTheme();
    if (global.document) {
      global.document.dispatchEvent(new global.CustomEvent('il:theme', { detail: { theme: next, dark: d } }));
    }
    return d;
  }

  function toggleTheme() { return setTheme(isDark() ? 'light' : 'dark'); }

  function read() {
    try { return JSON.parse(global.localStorage.getItem(STORE) || '{}'); }
    catch (e) { return {}; }
  }

  function write(store) {
    try { global.localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) { /* storage unavailable */ }
  }

  function patch(key, mutate) {
    var store = read();
    var g = store[key] || {};
    mutate(g);
    store[key] = g;
    write(store);
    return g;
  }

  /* ── IL.touch：只更新时间戳（无里程碑体系的模块用） ──
   * 让壳层的连续学习 / 热力图 / 到期复习对全部模块生效。
   * 刻意不写 steps/done：访问不等于掌握，壳层据此判定“未开始”。 */
  function touch(key) {
    patch(key, function (g) { g.last = Date.now(); });
  }

  /* ── IL.mount：里程碑引擎 ──
   * cfg = { key, total, toast?, onCount? }  ->  controller
   * 里程碑由模块在自己的交互点上调用 c.complete(i) 来解锁。 */
  function mount(key, cfg) {
    var total = cfg.total || 9;
    var milestones = [];
    for (var i = 0; i < total; i++) milestones.push(false);

    var c = {
      total: total,
      get doneCount() {
        var n = 0;
        for (var j = 0; j < total; j++) if (milestones[j]) n++;
        return n;
      },
      complete: function (i) {
        if (i < 0 || i >= total || milestones[i]) return false;
        milestones[i] = true;
        paint();
        patch(key, function (g) {
          var list = [];
          for (var j = 0; j < total; j++) if (milestones[j]) list.push(j);
          g.steps = list;
          g.last = Date.now();
          g.done = list.length === total;
        });
        if (cfg.toast) cfg.toast('✓ 里程碑 ' + (i + 1) + ' / ' + total + ' 解锁');
        return true;
      },
      restore: function () {
        var g = read()[key];
        if (!g || !g.steps) return c;
        g.steps.forEach(function (i) { if (i >= 0 && i < total) milestones[i] = true; });
        paint();
        return c;
      },
    };

    function paint() { if (cfg.onCount) cfg.onCount(c.doneCount, total); }

    c.restore();
    return c;
  }

  /* ── IL.quiz：测验引擎 ──
   * cfg = { key, box, data, total?, pass?, onPass?, title? }
   *   data: [{ q, opts, right, expl }]
   *   box : 承载测验的 DOM id（字符串或元素）
   *
   * 行为：整卷作答 -> 判分 -> 写 quiz { score, total, wrongs } ->
   * 错题题序在下次进入时提前（错题优先重做）-> 达标题触发 onPass。
   *
   * 自带 .ilq-* 皮肤：早期模块各自为政的配色不能被壳层的 !important 统一
   * 覆盖（壳层只认 .opt-row 等既有类名），独立打开 src/*.html 时也要能看。
   *
   * 颜色全部走 --ilq-* token：默认值适配"没有 data-theme 的独立页面"（模块
   * 自己的 :root 多半是浅色），壳层里 html[data-theme="dark"] 切到暗色一套。
   * 之前这里写死霓虹绿 + 近白文字，亮色主题下测验块是白底上的 1.4:1 灰字。 */
  var CSS = [
    ':root{--ilq-card:#f7f8fa;--ilq-opt:#ffffff;--ilq-border:#dfe4ea;--ilq-text:#101725;',
    '--ilq-body:#232c39;--ilq-dim:#41505f;--ilq-accent:#0b6b39;--ilq-redo:#8a5a00;',
    '--ilq-ok:#14532d;--ilq-err:#7f1d1d;--ilq-bad:#b91c1c;',
    '--ilq-tint:rgba(11,107,57,.14);--ilq-ok-bg:rgba(11,107,57,.08);--ilq-bad-bg:rgba(185,28,28,.10)}',
    ':root[data-theme="dark"]{--ilq-card:#0d0d12;--ilq-opt:#050507;--ilq-border:#1a2a20;',
    '--ilq-text:#d6ffe0;--ilq-body:#c2d9c8;--ilq-dim:#9fcca9;--ilq-accent:#00ff41;--ilq-redo:#ffb020;',
    '--ilq-ok:#e6ffe9;--ilq-err:#f8d7d7;--ilq-bad:#d24d4d;',
    '--ilq-tint:rgba(0,255,65,.14);--ilq-ok-bg:rgba(0,255,65,.08);--ilq-bad-bg:rgba(210,77,77,.12)}',
    '.ilq-q{border:1px solid var(--ilq-border);background:var(--ilq-card);border-radius:6px;padding:14px 16px;margin:0 0 12px}',
    /* overflow-wrap 可继承，写在容器上能让匿名 flex item（直接放进 flex 的文本）
       也允许断词，否则长题干同样撑破宽度 */
    '.ilq-title{font-weight:600;color:var(--ilq-text);margin-bottom:10px;display:flex;gap:8px;align-items:baseline;overflow-wrap:anywhere}',
    '.ilq-num{font-size:11px;color:var(--ilq-accent);border:1px solid var(--ilq-accent);border-radius:4px;padding:1px 6px;flex:none}',
    '.ilq-num.re{color:var(--ilq-redo);border-color:var(--ilq-redo)}',
    '.ilq-opt{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--ilq-border);background:var(--ilq-opt);',
    'border-radius:6px;padding:9px 12px;margin:6px 0;cursor:pointer;color:var(--ilq-body);font-size:14px}',
    /* flex item 默认 min-width:auto，不会缩到内容宽度以下。选项文本里
       "服务器/托管""Let's Encrypt（ACME …）" 这类含斜杠/括号的连续串没有断行点，
       于是手机上整条选项撑破卡片（.ilq-opt scrollWidth 356 vs clientWidth 312），
       外层是 overflow:hidden 时文字直接被吃掉。这里显式允许收缩并允许断词。 */
    '.ilq-opt>span{min-width:0;overflow-wrap:anywhere}',
    '.ilq-opt:hover{border-color:var(--ilq-accent)}',
    '.ilq-opt input{accent-color:var(--ilq-accent);margin-top:3px;flex:none}',
    /* 模块 CSS 是注入到同一个 document 的，很多模块写了裸的元素选择器
       （web 模块的 `input, select, textarea { width:100%; padding:10px 12px; border }`），
       这些规则会命中壳层挂进模块里的单选按钮——radio 被撑成 288px，
       选项文字只剩 0 宽。这里把影响盒模型 property 逐个钉回控件默认值，
       让共享测验不被宿主模块的表单样式改写（background 不动，否则原生控件会被画坏）。 */
    '.ilq-opt input[type=radio]{width:auto;height:auto;padding:0;border:0;border-radius:0;box-shadow:none;box-sizing:content-box;font-size:inherit;max-width:none}',
    '.ilq-opt.correct{border-color:var(--ilq-accent);background:var(--ilq-tint)}',
    '.ilq-opt.wrong{border-color:var(--ilq-bad);background:var(--ilq-bad-bg)}',
    '.ilq-opt.disabled{pointer-events:none;opacity:.85}',
    '.ilq-result{margin-top:8px;font-size:13px;padding:8px 10px;border-radius:6px;display:none;white-space:pre-wrap}',
    '.ilq-result.show{display:block}',
    '.ilq-result.ok{color:var(--ilq-ok);background:var(--ilq-ok-bg)}',
    '.ilq-result.err{color:var(--ilq-err);background:var(--ilq-bad-bg)}',
    '.ilq-score{border:1px dashed var(--ilq-accent);border-radius:6px;padding:16px;margin-top:14px;text-align:center;color:var(--ilq-ok)}',
    '.ilq-score b{display:block;font-size:28px;color:var(--ilq-accent);letter-spacing:1px}',
    '.ilq-score p{margin:6px 0 0;font-size:13px;color:var(--ilq-dim)}',
  ].join('');

  /* 壳层里模块 CSS 会被改写成 `#moduleRoot *{…}`（特异度 1,0,0），而这里的
     `.ilq-opt{padding:9px 12px}` 只有 0,1,0 —— 于是模块那句通用 reset 直接赢，
     测验块整片被压平：选项 25px 高（触控下限 32px）、卡片无内边距、题目之间
     没有间距，视觉上像渲染坏了。这里把同一份 CSS 再生成一份 "#moduleRoot 前缀"
     版本（特异度 1,1,0，稳压 `#moduleRoot *`），只在壳层（存在 #moduleRoot 时）
     注入；独立打开 src/*.html 时不注入，行为与原来完全一致。
     CSS 是扁平的 `selector{decls}` 列表（无 @media、无嵌套），可以按块切。 */
  function scopeToRoot(css) {
    var out = '', i = 0;
    while (i < css.length) {
      var open = css.indexOf('{', i);
      if (open < 0) break;
      var close = css.indexOf('}', open);
      if (close < 0) close = css.length;
      var sel = css.slice(i, open).trim();
      var body = css.slice(open, close + 1);
      /* :root[data-theme="dark"] → html[data-theme="dark"] #moduleRoot
         :root → #moduleRoot（token 挂在容器上，子元素照样继承）
         其余 .ilq-* → #moduleRoot .ilq-* */
      sel = sel
        .replace(/:root\[data-theme="dark"\]/g, 'html[data-theme="dark"] #moduleRoot')
        .replace(/:root/g, '#moduleRoot')
        .split(',').map(function (s) {
          s = s.trim();
          /* 上一步已经把 :root[…] 换成含 #moduleRoot 的选择器，别再加前缀 */
          if (!s || s.indexOf(MR_SCOPE) >= 0) return s;
          return MR_SCOPE + ' ' + s;
        }).join(',');
      out += sel + body;
      i = close + 1;
    }
    return out;
  }
  var MR_SCOPE = '#moduleRoot';

  function ensureStyle() {
    var doc = global.document;
    if (!doc || doc.getElementById('ilquiz-css')) return;
    var st = doc.createElement('style');
    st.id = 'ilquiz-css';
    st.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(st);
    if (doc.getElementById('moduleRoot')) {
      var st2 = doc.createElement('style');
      st2.id = 'ilquiz-css-scoped';
      st2.textContent = scopeToRoot(CSS);
      (doc.head || doc.documentElement).appendChild(st2);
    }
  }

  function el(x) {
    if (typeof x === 'string') return global.document.getElementById(x);
    return x;
  }

  function esc(s) {
    var d = global.document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  /* 返回 [{ item, oi }]，oi = 该题在原始题库里的下标。
     quiz.wrongs 存的是 oi：重排只改变呈现顺序，错题身份必须稳定，
     否则第二次重做会去标记“位置变了但不是错题”的题目。
     已经打过 _oi 标记的题库要复用那个标记——数组可能是上一轮就地重排后的
     结果，拿当前位置当原始下标就正好制造上面那个 bug。 */
  function reorderWrong(data, saved) {
    /* saved 是 il_progress[key] 整条记录，错题清单在 saved.quiz.wrongs：
       早期版本直接读 saved.wrongs，于是“错题优先重做”永远不生效。 */
    var q = saved && saved.quiz ? saved.quiz : saved;
    var pool = data.map(function (item, oi) {
      return { item: item, oi: typeof item._oi === 'number' ? item._oi : oi };
    });
    if (!q || !q.wrongs || !q.wrongs.length) return pool;
    var wanted = {};
    q.wrongs.forEach(function (oi) { wanted[oi] = true; });
    var head = [], rest = [];
    pool.forEach(function (row) { (wanted[row.oi] ? head : rest).push(row); });
    return head.concat(rest);
  }

  /* ── IL.order / IL.record：给“自带测验 UI”的模块用的协议垫片 ──
   * 这 36 个模块（bash/cs/docker/gh-actions/git/makefile/n8n/net/vfd/vscode/
   * algo/async/compose/css/dockerfile/go/graphql/grpc/helm/http/jwt/k8s/
   * netsec/nginx/oauth2/permissions/prometheus/prompt/redis/rust/sqlidx/
   * systemd/terraform/tls/transactions/ts）各有一套自己的判分与渲染代码，
   * 重写风险大且会丢风格；但它们都不写 quiz.wrongs，于是错题本、错题优先
   * 重做、成绩趋势对它们全部失效。与其逐个改造 UI，不如只把“协议”抽出来：
   *
   *   IL.order(key, quizData) -> 重排后的 quizData（错题前置）
   *   IL.record(key, score, total, wrongs) -> 落盘 quiz + last
   *
   * Round 23 把最后 26 个手抄 `_oi` + `quizData.sort` 的模块也迁到了这里：
   * 重排只此一份实现，模块继续负责渲染，但顺序、错题身份（_oi）与角标标记
   * （_re）都由运行时给出。tools/check-courses.js 第 10 节会拦住下一次手抄。
   *
   * order() 就地重排数组并给每题打两个标记，模块原有渲染代码几乎不用动：
   *   _oi  该题在原始题库里的下标 —— wrongs 必须存它，不能存呈现位置，
   *        否则第二次重做时错题身份会随重排漂移（Round 13 修过的坑）
   *   _re  是否是上次答错的题，模块愿意的话可以渲染“错题重做”角标
   *
   * 就地重排而不是返回新数组是有意的：一半模块把题库声明成 const，
   * `quizData = IL.order(...)` 会直接抛 TypeError。
   *
   * 题库字段命名三家分化（right / ans / correct），判分逻辑留在模块里，
   * 运行时不猜——只负责顺序与存储，避免再造一层需要维护的适配。 */
  function order(key, data) {
    var saved = read()[key];
    var prevWrong = (saved && saved.quiz && saved.quiz.wrongs) || [];
    var rows = reorderWrong(data, saved);
    rows.forEach(function (row) {
      row.item._oi = row.oi;
      row.item._re = prevWrong.indexOf(row.oi) !== -1;
    });
    data.length = 0;
    for (var i = 0; i < rows.length; i++) data.push(rows[i].item);
    return data;
  }

  function record(key, score, total, wrongs) {
    return patch(key, function (g) {
      /* at 是"这次交卷"的时间，与 last（这次进入模块的时间）分开记：
         复习队列只认交卷，否则读者点开看一眼就退出去，节奏也被重置了。 */
      g.quiz = { score: score, total: total, wrongs: wrongs ? wrongs.slice() : [], at: Date.now() };
      g.last = Date.now();
    });
  }

  /* ── IL.orderDom：给"题目写死在 HTML 里"的模块用的等价物 ──
   * regex/sql 没有 JS 题库数组：8 道题是 HTML 里的 .quiz-q 卡片，答案另存在
   * 一个 ANSWERS[] 里，事件按卡片位置绑定。所以重排要同时守住两点：
   *   1) 卡片物理顺序与 ANSWERS 不能错位 —— 返回 perm（呈现位置 -> 原始下标），
   *      模块用它重排 ANSWERS，并在记错题时把位置换算回原始下标；
   *   2) quiz.wrongs 存的仍是原始下标，不是呈现位置，否则又踩 Round 13 那个
   *      错题身份漂移的坑。
   * 必须在绑定点击事件之前调用；用注释节点做游标，保证卡片挪动后仍落在
   * 小标题与提交按钮之间。 */
  function orderDom(key, cards, labelSel) {
    var n = cards.length;
    var perm = [], i;
    for (i = 0; i < n; i++) perm.push(i);
    var saved = read()[key];
    var prevWrong = (saved && saved.quiz && saved.quiz.wrongs) || [];
    if (!n || !prevWrong.length) return perm;

    var wanted = {};
    prevWrong.forEach(function (oi) { if (oi >= 0 && oi < n) wanted[oi] = true; });
    var head = [], rest = [];
    perm.forEach(function (oi) { (wanted[oi] ? head : rest).push(oi); });
    perm = head.concat(rest);

    var parent = cards[0].parentNode;
    if (!parent) return perm;
    var cursor = document.createComment('ilq-order');
    parent.insertBefore(cursor, cards[0]);
    perm.forEach(function (oi, pos) {
      var card = cards[oi];
      parent.insertBefore(card, cursor);
      var lab = labelSel && card.querySelector(labelSel);
      if (lab) lab.textContent = 'Q' + (pos + 1) + (wanted[oi] ? ' · 错题重做' : '');
    });
    parent.removeChild(cursor);
    return perm;
  }

  function quiz(cfg) {
    ensureStyle();
    var box = el(cfg.box);
    if (!box) return null;
    var saved = read()[cfg.key];
    var prevWrong = (saved && saved.quiz && saved.quiz.wrongs) || [];
    var rows = reorderWrong(cfg.data, saved);
    var total = cfg.total || rows.length;
    var pass = cfg.pass == null ? Math.ceil(total * 0.75) : cfg.pass;
    var score = 0, answered = 0, wrongs = [];

    box.innerHTML = rows.map(function (row, qi) {
      var item = row.item;
      var opts = item.opts.map(function (o, oi) {
        return '<label class="ilq-opt" data-q="' + qi + '" data-o="' + oi + '">' +
          '<input type="radio" name="ilq' + qi + '"><span>' + esc(o) + '</span></label>';
      }).join('');
      var redo = prevWrong.indexOf(row.oi) !== -1;
      return '<div class="ilq-q"><div class="ilq-title">' +
        '<span class="ilq-num' + (redo ? ' re' : '') + '">Q' + (qi + 1) + (redo ? ' · 错题重做' : '') + '</span>' +
        esc(item.q) + '</div>' + opts +
        '<div class="ilq-result" id="ilqr' + qi + '"></div></div>';
    }).join('');

    Array.prototype.forEach.call(box.querySelectorAll('.ilq-opt'), function (rowEl) {
      rowEl.addEventListener('click', function () {
        if (rowEl.classList.contains('disabled')) return;
        var qi = parseInt(rowEl.dataset.q, 10), oi = parseInt(rowEl.dataset.o, 10);
        var item = rows[qi].item;
        var rowsEl = box.querySelectorAll('.ilq-opt[data-q="' + qi + '"]');
        Array.prototype.forEach.call(rowsEl, function (r) {
          r.classList.add('disabled'); r.classList.remove('correct', 'wrong');
        });
        var res = global.document.getElementById('ilqr' + qi);
        rowEl.querySelector('input').checked = true;
        if (oi === item.right) {
          rowEl.classList.add('correct');
          res.className = 'ilq-result show ok';
          res.innerHTML = '✓ 正确。' + esc(item.expl || '');
          score++;
        } else {
          rowsEl[item.right].classList.add('correct');
          rowEl.classList.add('wrong');
          wrongs.push(rows[qi].oi);
          res.className = 'ilq-result show err';
          res.innerHTML = '✗ 正确答案：' + esc(item.opts[item.right]) + '。' + esc(item.expl || '');
        }
        answered++;
        if (answered === rows.length) finish();
      });
    });

    function finish() {
      var old = box.querySelector('.ilq-score');
      if (old) old.remove();
      var d = global.document.createElement('div');
      d.className = 'ilq-score';
      d.innerHTML = '<b>' + score + '/' + total + '</b>' +
        '<p>' + (score >= pass ? '优秀！' + esc(cfg.title || '本模块') + ' 核心要点已掌握。'
          : '继续加油！回看上面的章节，再试一次（下次进入将优先呈现错题）。') + '</p>';
      box.appendChild(d);
      patch(cfg.key, function (g) {
        g.quiz = { score: score, total: total, wrongs: wrongs, at: Date.now() };
        g.last = Date.now();
      });
      if (score >= pass && cfg.onPass) cfg.onPass();
    }

    return { get score() { return score; }, get wrongs() { return wrongs.slice(); } };
  }

  global.IL = {
    touch: touch, mount: mount, quiz: quiz,
    order: order, orderDom: orderDom, record: record,
    read: read, esc: esc,
    isDark: isDark, toggleTheme: toggleTheme, setTheme: setTheme,
  };
})(window);
