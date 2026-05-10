#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

const KINDS = [
  'deck_stage.js',
  'ios_frame.jsx',
  'android_frame.jsx',
  'macos_window.jsx',
  'browser_window.jsx',
  'design_canvas.jsx',
  'tweaks-panel.js',
];

function fail(msg, code) {
  process.stderr.write(msg + '\n');
  process.exit(code != null ? code : 1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) fail('usage: copy-starter.js <kind> [--dest <dir>] [--with-host-html]\n       copy-starter.js --list');
  let kind = null;
  let dest = process.cwd();
  let destSet = false;
  let withHostHtml = false;
  let listMode = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--list') {
      listMode = true;
    } else if (a === '--with-host-html') {
      withHostHtml = true;
    } else if (a === '--dest') {
      dest = args[++i] || '';
      if (!dest) fail('--dest requires a directory argument');
      destSet = true;
    } else if (a.startsWith('--dest=')) {
      dest = a.slice('--dest='.length);
      destSet = true;
    } else if (a.startsWith('--')) {
      fail('unknown flag: ' + a);
    } else if (!kind) {
      kind = a;
    } else {
      fail('unexpected argument: ' + a);
    }
  }
  if (listMode) {
    if (kind || withHostHtml || destSet) fail('--list takes no other arguments');
    return { listMode: true };
  }
  if (!kind) fail('missing <kind>; valid kinds: ' + KINDS.join(', '));
  if (!KINDS.includes(kind)) fail('unknown kind: ' + kind + '\nvalid kinds: ' + KINDS.join(', '));
  const absDest = path.resolve(dest);
  return { kind, dest: absDest, withHostHtml };
}

function toPascalCase(snake) {
  return snake.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function generateHostHtml({ kind, dest, scriptDir }) {
  const ext = path.extname(kind);
  const basename = path.basename(kind, ext);
  const componentName = toPascalCase(basename);
  const isJsx = ext === '.jsx';
  let templateName;
  if (isJsx) {
    templateName = 'jsx-host.html';
  } else if (kind === 'tweaks-panel.js') {
    templateName = 'tweaks-host.html';
  } else {
    templateName = 'deck-host.html';
  }
  const templatePath = path.join(scriptDir, '..', 'starters', 'host-templates', templateName);
  if (!fs.existsSync(templatePath)) {
    fail('host template missing: ' + templatePath, 2);
  }
  const template = fs.readFileSync(templatePath, 'utf8');
  let inlineJsx = '';
  if (isJsx) {
    const srcPath = path.join(scriptDir, '..', 'starters', kind);
    inlineJsx = fs.readFileSync(srcPath, 'utf8');
  }
  const rendered = template
    .replace(/\$\{KIND\}/g, kind)
    .replace(/\$\{COMPONENT_NAME\}/g, componentName)
    .replace(/\$\{INLINE_JSX\}/g, inlineJsx);
  const hostPath = path.join(dest, basename + '.host.html');
  if (fs.existsSync(hostPath)) {
    fail('host file already exists: ' + hostPath + '\n(use --dest <other-dir> or rename; copy-starter never overwrites)', 2);
  }
  try {
    fs.writeFileSync(hostPath, rendered, 'utf8');
  } catch (e) {
    fail('host write failed: ' + String(e && e.message || e), 2);
  }
  return hostPath;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.listMode) {
    KINDS.forEach(k => process.stdout.write(k + '\n'));
    return;
  }
  const scriptDir = path.dirname(__filename);
  const startersDir = path.join(scriptDir, '..', 'starters');
  const srcPath = path.join(startersDir, args.kind);
  if (!fs.existsSync(srcPath)) {
    fail('starter source missing: ' + srcPath + '\n(starter library appears broken; reinstall design-mode)', 2);
  }
  if (!fs.existsSync(args.dest)) {
    fail('dest directory does not exist: ' + args.dest + '\n(create the directory first; copy-starter does not auto-create)', 2);
  }
  const stat = fs.statSync(args.dest);
  if (!stat.isDirectory()) {
    fail('dest is not a directory: ' + args.dest, 2);
  }
  const dstPath = path.join(args.dest, args.kind);
  if (fs.existsSync(dstPath)) {
    fail('file already exists: ' + dstPath + '\n(use --dest <other-dir> or rename the existing file; copy-starter never overwrites)', 2);
  }
  try {
    fs.copyFileSync(srcPath, dstPath);
  } catch (e) {
    fail('copy failed: ' + String(e && e.message || e), 2);
  }
  const copied = [dstPath];
  if (args.withHostHtml) {
    const hostPath = generateHostHtml({ kind: args.kind, dest: args.dest, scriptDir });
    copied.push(hostPath);
  }
  process.stdout.write(JSON.stringify({ copied, kind: args.kind }) + '\n');
}

main().catch(err => fail('unhandled: ' + (err && err.stack || err)));
