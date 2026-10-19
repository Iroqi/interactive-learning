#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pack each src/*-interactive.html into a data-driven module file: modules/<key>.js
Data format:
  window.IL_MODULES['git'] = { title, links[], needsReady, css, html, js }
Shell page (index.html) loads modules/<key>.js on demand, injects css/html,
then executes js via a dynamically created <script> element (global scope,
preserving inline on* handlers) and dispatches DOMContentLoaded if needed.

A module may borrow the shared runtime (ilquiz.js) with
  <script src="../ilquiz.js"></script>
inside its <body>. That reference is inlined into the packed js field (marked,
so tools/unpack-modules.js can restore it), keeping modules/*.js self-contained.

tools/verify-pack.js checks that src/ still packs to modules/ unchanged.
"""
import re, os, json, glob

KEYS = {  # explicit mapping to avoid surprises
    'cf-workers-interactive.html': 'cf-workers',
    'docker-interactive.html': 'docker',
    'gh-actions-interactive.html': 'gh-actions',
    'makefile-interactive.html': 'makefile',
    'cs-interactive.html': 'cs',
    'net-interactive.html': 'net',
    'n8n-interactive.html': 'n8n',
    'pid-interactive.html': 'pid',
    'vfd-interactive.html': 'vfd',
    'vscode-interactive.html': 'vscode',
    'yaml-interactive.html': 'yaml',
    'web-interactive.html': 'web',
    'git-interactive.html': 'git',
    'bash-interactive.html': 'bash',
    'plc-interactive.html': 'plc',
    'regex-interactive.html': 'regex',
    'sql-interactive.html': 'sql',
    'k8s-interactive.html': 'k8s',
    'http-interactive.html': 'http',
    'redis-interactive.html': 'redis',
    'prompt-interactive.html': 'prompt',
    'terraform-interactive.html': 'terraform',
    'nginx-interactive.html': 'nginx',
    'netsec-interactive.html': 'netsec',
    'async-interactive.html': 'async',
    'ts-interactive.html': 'ts',
    'permissions-interactive.html': 'permissions',
    'compose-interactive.html': 'compose',
    'algo-interactive.html': 'algo',
    'transactions-interactive.html': 'transactions',
    'systemd-interactive.html': 'systemd',
    'css-interactive.html': 'css',
    'sqlidx-interactive.html': 'sqlidx',
    'rust-interactive.html': 'rust',
    'helm-interactive.html': 'helm',
    'prometheus-interactive.html': 'prometheus',
    'jwt-interactive.html': 'jwt',
    'dockerfile-interactive.html': 'dockerfile',
    'go-interactive.html': 'go',
    'oauth2-interactive.html': 'oauth2',
    'tls-interactive.html': 'tls',
    'grpc-interactive.html': 'grpc',
    'graphql-interactive.html': 'graphql',
    'cdn-interactive.html': 'cdn',
    'css-layout-interactive.html': 'css-layout',
    'tmux-interactive.html': 'tmux',
}

SRC_DIR = 'src'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RUNTIME_RE = re.compile(r'<script\s+src="(\.\./([\w./-]+\.js))"\s*>\s*</script>')
RUNTIME_MARK = '/* ilquiz:inlined %s */\n'

SCOPE_MARK = '/* ilscope:isolated */'

# 内联 on* 处理函数在浏览器里按全局作用域编译，因此包进 IIFE 后必须把这些名字
# 显式导出。只导出「处理函数用到的根标识符」∩「本模块自己声明的名字」，
# 并排除 window 上的内建属性——否则 window.location = ... 会真的跳转页面。
ON_ATTR_RE = re.compile(
    r'\bon(?:click|dblclick|change|input|submit|keyup|keydown|keypress|focus|blur'
    r'|load|error|mouse\w+|touch\w+|contextmenu|focusin|focusout)\s*=\s*(?:&quot;|")([^"&]*)',
    re.I)
CALL_ROOT_RE = re.compile(r'([A-Za-z_$][\w$]*)\s*(?:\.\s*[A-Za-z_$][\w$]*)*\s*\(')
JS_KEYWORDS = set('''if else return typeof new function do while for switch catch delete void
this true false null undefined in of instanceof await async yield break continue throw case default
eval parseInt parseFloat isNaN String Number Boolean Array Object Math JSON Date RegExp Promise Map Set
Symbol Error Function setTimeout setInterval clearTimeout clearInterval requestAnimationFrame
document window console localStorage sessionStorage navigator history location alert confirm prompt
fetch getComputedStyle matchMedia IntersectionObserver MutationObserver Event CustomEvent
structuredClone URL FormData Response Request Blob Uint8Array ArrayBuffer globalThis self top parent
screen crypto performance NaN Infinity undefined scrollBy scrollTo open close'''.split())

os.makedirs('modules', exist_ok=True)


def find_source(src):
    """Authoring sources live in src/; the repo root stays a fallback so
    one-off files dropped next to the script still pack."""
    for base in (SRC_DIR, '.'):
        p = os.path.join(base, src)
        if os.path.exists(p):
            return p
    return None


def split_runtimes(body):
    """Inline shared runtime references into the js field. The shell only
    executes js, so the file content has to travel inside it; the marker lets
    unpack-modules.js turn it back into a plain <script src> reference."""
    prefix = []

    def sub(m):
        rel = m.group(2)
        real = os.path.join(ROOT, rel)
        if not os.path.exists(real):
            raise SystemExit('shared runtime not found: ' + rel)
        prefix.append(RUNTIME_MARK % rel + open(real, encoding='utf-8').read())
        return ''

    stripped = RUNTIME_RE.sub(sub, body)
    return stripped, ('\n'.join(prefix) + '\n' if prefix else '')


def extract_body(html):
    m = re.search(r'<body[^>]*>(.*)</body>', html, re.S)
    if not m:
        raise SystemExit('no body found')
    return m.group(1)


def top_level_decls(code):
    """Names a module declares for itself: lexical declarations sit at column 0
    in every source, and `var` is function-scoped so a plain scan is enough."""
    names = []

    def add(nm):
        if nm not in names:
            names.append(nm)

    for m in re.finditer(r'^(?:const|let)\s+([A-Za-z_$][\w$]*)', code, re.M):
        add(m.group(1))
    for m in re.finditer(r'^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)', code, re.M):
        add(m.group(1))
    for m in re.finditer(r'^class\s+([A-Za-z_$][\w$]*)', code, re.M):
        add(m.group(1))
    for m in re.finditer(r'\bvar\s+([A-Za-z_$][\w$]*)', code):
        add(m.group(1))
    # multi-line destructuring / comma lists on the col-0 declaration line
    for m in re.finditer(r'^(?:const|let|var)\s+(\{|\[)([^\n]{0,400})', code, re.M):
        for part in m.group(2).split(','):
            ident = re.search(r'([A-Za-z_$][\w$]*)\s*(?::|=|$)', part.strip())
            if ident:
                add(ident.group(1))
    return names


def inline_handler_names(*sources):
    """Root identifiers called from static on* attributes (HTML + JS strings)."""
    used = set()
    for src in sources:
        for m in ON_ATTR_RE.finditer(src):
            for call in CALL_ROOT_RE.finditer(m.group(1)):
                used.add(call.group(1))
    return used


def is_already_iife(js):
    body = js.lstrip()
    # 允许已带 SCOPE_MARK 的输入（unpack -> pack 往返），避免二次包裹。
    body = re.sub(r'^\s*/\* ilscope:isolated \*/\s*', '', body)
    return bool(re.match(r'!?\(function', body)) or bool(re.match(r'!?\(\(\)\s*=>', body))


def isolate_scope(own_js, html):
    """Wrap a module's top-level code in its own function scope.

    壳层把每个模块的 js 字段作为非模块 <script> 追加进同一个文档，所有模块共享
    window 作用域。Round 1~8 有 9 个模块在顶层用 const/let 声明（quizData、
    observer、steps…），于是“先打开 A 再打开 B”时 B 抛
    "Identifier 'quizData' has already been declared"，整段模块 JS 失效；
    只声明 var/function 的模块则互相覆盖同名函数（后加载的赢）。smoke13 抓到
    7 个模块因此报错。

    内联 on* 处理函数在全局作用域编译，所以把它们用到的自有名字挂回 window。
    """
    if not own_js.strip() or is_already_iife(own_js):
        return own_js
    decls = top_level_decls(own_js)
    if not decls:
        return own_js
    export_names = sorted(inline_handler_names(own_js, html) & set(decls))
    out = [SCOPE_MARK, '(function () {', own_js.rstrip('\n')]
    if export_names:
        # 追加在函数体末尾：const/let 此时已完成初始化（TDZ 之后），
        # 而内联处理函数只可能在脚本执行完毕后被用户触发。
        out.append('  /* 内联 on* 处理函数在全局作用域编译：导出本模块自有名字 */')
        out.append('  var __g = typeof window !== "undefined" ? window : globalThis;')
        for nm in export_names:
            out.append('  __g.%s = %s;' % (nm, nm))
    out.append('})();')
    return '\n'.join(out) + '\n'


def pack(src):
    html = open(src, encoding='utf-8').read()
    # title
    tm = re.search(r'<title>(.*?)</title>', html, re.S)
    title = tm.group(1).strip() if tm else src

    # external <link> tags (fonts etc.)
    links = re.findall(r'<link[^>]*>', html)

    # <style> blocks
    styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.S)
    css = '\n'.join(styles)

    body = extract_body(html)
    # runtime refs must be handled before script blocks are stripped
    body, runtime_js = split_runtimes(body)
    # extract <script>...</script> (inline only)
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', body, re.S)
    own_js = '\n'.join(scripts)
    # remove all <script> blocks from body html (keeps everything else)
    html_body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.S)

    # rewrite "back to nav" links to shell route
    html_body = html_body.replace('href="index.html"', 'href="#/"')

    js = runtime_js + isolate_scope(own_js, html_body)

    needs_ready = 'DOMContentLoaded' in js

    return {
        'title': title,
        'links': links,
        'needsReady': needs_ready,
        'css': css,
        'html': html_body,
        'js': js,
    }


def emit(key, data):
    out = ['/* Data-driven module: %s (packed from src/%s-interactive.html) */' % (key, key)]
    out.append('window.IL_MODULES = window.IL_MODULES || {};')
    out.append("window.IL_MODULES['%s'] = {" % key)
    out.append('  title: %s,' % json.dumps(data['title'], ensure_ascii=False))
    out.append('  links: %s,' % json.dumps(data['links']))
    out.append('  needsReady: %s,' % ('true' if data['needsReady'] else 'false'))
    out.append('  css: %s,' % json.dumps(data['css']))
    out.append('  html: %s,' % json.dumps(data['html']))
    out.append('  js: %s,' % json.dumps(data['js']))
    out.append('};')
    path = 'modules/%s.js' % key
    open(path, 'w', encoding='utf-8').write('\n'.join(out))
    kb = (os.path.getsize(path) + 512) // 1024   # 四舍五入，与 check-courses.js 的 Math.round(bytes/1024) 同口径
    print('%-12s -> %-20s %3d KB  ready=%s links=%d' % (key, path, kb, data['needsReady'], len(data['links'])))
    return path


for src, key in KEYS.items():
    path = find_source(src)
    if path:
        emit(key, pack(path))
    else:
        print('MISSING:', src)

print('done. files in modules/:', len(glob.glob('modules/*.js')))
