#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pack each *-interactive.html into a data-driven module file: modules/<key>.js
Data format:
  window.IL_MODULES['git'] = { title, links[], needsReady, css, html, js }
Shell page (index.html) loads modules/<key>.js on demand, injects css/html,
then executes js via a dynamically created <script> element (global scope,
preserving inline on* handlers) and dispatches DOMContentLoaded if needed.
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
}

os.makedirs('modules', exist_ok=True)

def extract_body(html):
    m = re.search(r'<body[^>]*>(.*)</body>', html, re.S)
    if not m:
        raise SystemExit('no body found')
    return m.group(1)

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
    # extract <script>...</script> (inline only; no external src in this repo)
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', body, re.S)
    js = '\n'.join(scripts)
    # remove all <script> blocks from body html (keeps everything else)
    html_body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.S)

    # rewrite "back to nav" links to shell route
    html_body = html_body.replace('href="index.html"', 'href="#/"')

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
    out = ['/* Data-driven module: %s (packed from %s-interactive.html) */' % (key, key)]
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
    kb = os.path.getsize(path) // 1024
    print('%-12s -> %-20s %3d KB  ready=%s links=%d' % (key, path, kb, data['needsReady'], len(data['links'])))
    return path

for src, key in KEYS.items():
    if os.path.exists(src):
        emit(key, pack(src))
    else:
        print('MISSING:', src)

print('done. files in modules/:', len(glob.glob('modules/*.js')))
