#!/usr/bin/env node
/*
 * Verify that src/<key>-interactive.html still packs into a module whose
 * content is identical to the committed modules/<key>.js.
 *
 * The comparison is field-by-field on the parsed data (title / links /
 * needsReady / css / html / js) rather than on raw bytes: module files were
 * produced by two different code paths over 12 rounds, so literal formatting
 * (JSON-quoted vs JS-quoted keys) already varies and is not meaningful.
 *
 * Usage: node tools/verify-pack.js
 * Exit code 0 = all modules match, 1 = at least one drift.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(ROOT, '.pack-check');

const FIELDS = ['title', 'links', 'needsReady', 'css', 'html', 'js'];

function loadModule(file) {
  const code = fs.readFileSync(file, 'utf8');
  const win = { IL_MODULES: {} };
  const prev = global.window;
  global.window = win;
  try {
    // eslint-disable-next-line no-eval
    eval(code);
  } finally {
    global.window = prev;
  }
  return win.IL_MODULES;
}

function main() {
  const keys = fs.readdirSync(path.join(ROOT, 'modules'))
    .filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();

  // Pack into an out-of-tree copy so modules/ is never touched.
  cp.execSync(
    `rm -rf ${TMP} && mkdir -p ${TMP} && cp -r src tools courses.js index.html ilquiz.js ilquizzes.js ${TMP}/`,
    { cwd: ROOT, stdio: 'inherit' }
  );
  cp.execSync('python3 tools/pack-modules.py', { cwd: TMP, stdio: 'inherit' });

  const missing = keys.filter((k) => !fs.existsSync(path.join(TMP, 'modules', k + '.js')));
  if (missing.length) {
    console.error('pack-modules.py did not produce: ' + missing.join(', '));
    process.exit(1);
  }

  const drift = [];
  for (const key of keys) {
    const orig = loadModule(path.join(ROOT, 'modules', key + '.js'))[key];
    const now = loadModule(path.join(TMP, 'modules', key + '.js'))[key];
    for (const f of FIELDS) {
      const a = f === 'links' ? JSON.stringify(now[f]) : String(now[f]);
      const b = f === 'links' ? JSON.stringify(orig[f]) : String(orig[f]);
      if (a !== b) drift.push(key + '.' + f);
    }
  }

  cp.execSync(`rm -rf ${TMP}`, { cwd: ROOT, stdio: 'inherit' });

  if (drift.length) {
    console.error('ROUND-TRIP DRIFT (%d fields): \n  ' + drift.join('\n  '), drift.length);
    process.exit(1);
  }
  console.log('OK: %d modules round-trip src/ -> modules/ with identical content', keys.length);
}

main();
