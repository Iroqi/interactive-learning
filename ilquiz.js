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
   * 覆盖（壳层只认 .opt-row 等既有类名），独立打开 src/*.html 时也要能看。 */
  var CSS = [
    '.ilq-q{border:1px solid #1a2a20;background:#0d0d12;border-radius:6px;padding:14px 16px;margin:0 0 12px}',
    '.ilq-title{font-weight:600;color:#d6ffe0;margin-bottom:10px;display:flex;gap:8px;align-items:baseline}',
    '.ilq-num{font-size:11px;color:#00ff41;border:1px solid #00ff41;border-radius:4px;padding:1px 6px;flex:none}',
    '.ilq-num.re{color:#ffb020;border-color:#ffb020}',
    '.ilq-opt{display:flex;gap:10px;align-items:flex-start;border:1px solid #1a2a20;background:#050507;',
    'border-radius:6px;padding:9px 12px;margin:6px 0;cursor:pointer;color:#c2d9c8;font-size:14px}',
    '.ilq-opt:hover{border-color:#00ff41}',
    '.ilq-opt input{accent-color:#00ff41;margin-top:3px;flex:none}',
    '.ilq-opt.correct{border-color:#00ff41;background:rgba(0,255,65,.14)}',
    '.ilq-opt.wrong{border-color:#d24d4d;background:rgba(210,77,77,.12)}',
    '.ilq-opt.disabled{pointer-events:none;opacity:.85}',
    '.ilq-result{margin-top:8px;font-size:13px;padding:8px 10px;border-radius:6px;display:none;white-space:pre-wrap}',
    '.ilq-result.show{display:block}',
    '.ilq-result.ok{color:#e6ffe9;background:rgba(0,255,65,.08)}',
    '.ilq-result.err{color:#f8d7d7;background:rgba(210,77,77,.08)}',
    '.ilq-score{border:1px dashed #00ff41;border-radius:6px;padding:16px;margin-top:14px;text-align:center;color:#e6ffe9}',
    '.ilq-score b{display:block;font-size:28px;color:#00ff41;letter-spacing:1px}',
    '.ilq-score p{margin:6px 0 0;font-size:13px;color:#9fcca9}',
  ].join('');

  function ensureStyle() {
    var doc = global.document;
    if (!doc || doc.getElementById('ilquiz-css')) return;
    var st = doc.createElement('style');
    st.id = 'ilquiz-css';
    st.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(st);
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
     否则第二次重做会去标记“位置变了但不是错题”的题目。 */
  function reorderWrong(data, saved) {
    /* saved 是 il_progress[key] 整条记录，错题清单在 saved.quiz.wrongs：
       早期版本直接读 saved.wrongs，于是“错题优先重做”永远不生效。 */
    var q = saved && saved.quiz ? saved.quiz : saved;
    var pool = data.map(function (item, oi) { return { item: item, oi: oi }; });
    if (!q || !q.wrongs || !q.wrongs.length) return pool;
    var wanted = {};
    q.wrongs.forEach(function (oi) { wanted[oi] = true; });
    var head = [], rest = [];
    pool.forEach(function (row) { (wanted[row.oi] ? head : rest).push(row); });
    return head.concat(rest);
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
        g.quiz = { score: score, total: total, wrongs: wrongs };
        g.last = Date.now();
      });
      if (score >= pass && cfg.onPass) cfg.onPass();
    }

    return { get score() { return score; }, get wrongs() { return wrongs.slice(); } };
  }

  global.IL = { touch: touch, mount: mount, quiz: quiz, read: read, esc: esc };
})(window);
