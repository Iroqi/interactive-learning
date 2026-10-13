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

function render(key, data) {
  const links = (data.links || []).join('\n');
  // pack-modules.py rewrites index.html -> #/ when packing; undo that so the
  // source stays a page that opens directly in a browser.
  const body = (data.html || '').replace(/href="#\/"/g, 'href="index.html"');
  const script = (data.js || '').trim() ? '<script>' + data.js + '</script>' : '';
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
