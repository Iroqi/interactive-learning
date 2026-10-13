#!/usr/bin/env node
/*
 * Unpack the data-driven module files back into standalone authoring sources:
 *
 *     modules/<key>.js   ->   src/<key>-interactive.html
 *
 * tools/pack-modules.py is the inverse (src HTML -> modules/*.js). The HTML
 * sources were dropped from the repo when the shell was introduced, which made
 * pack-modules.py a no-op ("MISSING: ...-interactive.html") and left the
 * modules as the only copy of the content. This script restores them so the
 * documented authoring workflow works again: edit src/*.html, re-pack, commit.
 *
 * Module files are JavaScript, so they are evaluated to be read correctly —
 * field literals differ between hand-edited and packed files, which makes
 * regex parsing unreliable.
 *
 * Usage:
 *   node tools/unpack-modules.js            # all modules
 *   node tools/unpack-modules.js k8s http    # selected modules
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODULES = path.join(ROOT, 'modules');
const SRC = path.join(ROOT, 'src');

function readModule(key) {
  const code = fs.readFileSync(path.join(MODULES, key + '.js'), 'utf8');
  const sandboxWindow = { IL_MODULES: {} };
  const prev = global.window;
  global.window = sandboxWindow;
  try {
    // eslint-disable-next-line no-eval
    eval(code);
  } finally {
    global.window = prev;
  }
  const data = sandboxWindow.IL_MODULES[key];
  if (!data) throw new Error('module key not registered: ' + key);
  return data;
}

function unisolateScope(js) {
  /* pack-modules.py 把模块顶层代码包进 (function () { ... })()，并在末尾追加
     __g.<name> 导出行（内联 on* 处理函数需要全局名字）。独立页面在浏览器里直接
     打开 src/*.html 时仍是全局作用域，所以还原成作者写的样子。 */
  const marked = /^\s*\/\* ilscope:isolated \*\/\s*\(function\s*\(\)\s*\{\n([\s\S]*?)\n\}\)\(\)\s*$/.exec(js);
  if (!marked) return js;
  let body = marked[1];
  body = body.replace(/\n {2}\/\* 内联 on\* 处理函数在全局作用域编译：导出本模块自有名字 \*\/(?:\n {2}var __g = [^\n]*;)?(?:\n {2}__g\.[\w$]+ = [\w$]+;)*/, '');
  return body + '\n';
}

function render(key, data) {
  const links = (data.links || []).join('\n');
  // pack-modules.py rewrites index.html -> #/ when packing; undo that so the
  // source stays a page that opens directly in a browser.
  const body = (data.html || '').replace(/href="#\/"/g, 'href="index.html"');

  // Undo the shared-runtime inlining that pack-modules.py performed, restoring
  // a plain <script src="../ilquiz.js"> reference instead of a copy.
  let js = data.js || '';
  let runtime = '';
  const m = js.match(/^\/\* ilquiz:inlined ([\w./-]+) \*\//);
  if (m) {
    const file = path.join(ROOT, m[1]);
    if (fs.existsSync(file)) {
      const inlined = '/* ilquiz:inlined ' + m[1] + ' */\n' + fs.readFileSync(file, 'utf8') + '\n';
      if (js.startsWith(inlined)) {
        js = js.slice(inlined.length);
        runtime = '<script src="../' + m[1] + '"></script>';
      }
    }
  }

  js = unisolateScope(js);

  const script = js.trim() ? runtime + (js.trim() ? '<script>' + js + '</script>' : '') : runtime;
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + data.title + '</title>',
    links,
    '<style>' + data.css + '</style>',
    '</head>',
    '<body>' + body + script + '</body>',
    '</html>',
    '',
  ].join('\n');
}

function main() {
  const only = process.argv.slice(2);
  let keys = fs.readdirSync(MODULES).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
  if (only.length) keys = keys.filter((k) => only.includes(k));
  fs.mkdirSync(SRC, { recursive: true });
  for (const key of keys) {
    const out = path.join(SRC, key + '-interactive.html');
    fs.writeFileSync(out, render(key, readModule(key)), 'utf8');
    console.log('%s -> src/%s-interactive.html', key.padEnd(13), key);
  }
  console.log('unpacked %d modules into src/', keys.length);
}

main();
