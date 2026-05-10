#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function fail(msg, code) {
  process.stderr.write(msg + '\n');
  process.exit(code != null ? code : 1);
}

function ensurePlaywright() {
  const scriptDir = path.dirname(__filename);
  const localPath = path.join(scriptDir, 'node_modules', 'playwright');
  if (!fs.existsSync(localPath)) {
    process.stderr.write('installing playwright + chromium (one-time, ~150 MB, may take 1-3 min)...\n');
    try {
      execSync(
        'npm install --no-save --no-package-lock --prefix "' + scriptDir + '" playwright',
        { stdio: ['ignore', 2, 'inherit'] }
      );
    } catch (e) {
      return { error: 'npm install playwright failed: ' + String(e && e.message || e) };
    }
    try {
      execSync(
        './node_modules/.bin/playwright install chromium',
        { cwd: scriptDir, stdio: ['ignore', 2, 'inherit'] }
      );
    } catch (e) {
      return { error: 'playwright install chromium failed: ' + String(e && e.message || e) };
    }
  }
  try {
    return require(localPath);
  } catch (e) {
    return { error: 'require(playwright) failed: ' + String(e && e.message || e) };
  }
}

function parsePageSize(spec) {
  if (spec === 'A4') return { format: 'A4' };
  if (spec === 'letter') return { format: 'Letter' };
  const m = /^(\d+)x(\d+)$/.exec(spec);
  if (m) {
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    if (w > 0 && h > 0) return { width: w + 'mm', height: h + 'mm' };
  }
  return null;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) fail('usage: to-pdf.js <html-file> [--page-size A4|letter|<W>x<H>] [--out <pdf-path>] [--landscape]');
  let file = null;
  let pageSizeSpec = 'A4';
  let outPath = null;
  let landscape = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--page-size') {
      pageSizeSpec = args[++i] || '';
      if (!pageSizeSpec) fail('--page-size requires a value');
    } else if (a.startsWith('--page-size=')) {
      pageSizeSpec = a.slice('--page-size='.length);
    } else if (a === '--out') {
      outPath = args[++i] || '';
      if (!outPath) fail('--out requires a value');
    } else if (a.startsWith('--out=')) {
      outPath = a.slice('--out='.length);
    } else if (a === '--landscape') {
      landscape = true;
    } else if (a.startsWith('--')) {
      fail('unknown flag: ' + a);
    } else if (!file) {
      file = a;
    } else {
      fail('unexpected argument: ' + a);
    }
  }
  if (!file) fail('missing <html-file>');
  const absFile = path.resolve(file);
  const ext = path.extname(absFile).toLowerCase();
  if (ext !== '.html' && ext !== '.htm') fail('file must end in .html or .htm: ' + absFile);
  if (!fs.existsSync(absFile)) fail('file not found: ' + absFile);
  if (!fs.statSync(absFile).isFile()) fail('not a regular file: ' + absFile);
  const pageSize = parsePageSize(pageSizeSpec);
  if (!pageSize) fail('malformed --page-size (expected A4, letter, or <W>x<H> in mm, got: ' + pageSizeSpec + ')');
  const absOut = path.resolve(outPath || (absFile + '.pdf'));
  const outDir = path.dirname(absOut);
  if (!fs.existsSync(outDir)) fail('output directory does not exist: ' + outDir, 2);
  return { file: absFile, pageSize, pageSizeSpec, out: absOut, landscape };
}

async function main() {
  const args = parseArgs(process.argv);
  const start = Date.now();
  const playwright = ensurePlaywright();
  if (playwright && playwright.error) {
    fail(playwright.error, 2);
  }
  if (!playwright) {
    fail('ensurePlaywright returned null unexpectedly', 2);
  }
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('file://' + args.file, { timeout: 10000, waitUntil: 'load' });
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (_) {}
    const pdfOpts = Object.assign(
      { path: args.out, printBackground: true, landscape: args.landscape },
      args.pageSize
    );
    await page.pdf(pdfOpts);
    await context.close();
  } catch (e) {
    fail('pdf export failed: ' + String(e && e.message || e), 2);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  const out = {
    pdf: args.out,
    page_size: args.pageSizeSpec + (args.landscape ? ' landscape' : ''),
    timing_ms: Date.now() - start,
  };
  process.stdout.write(JSON.stringify(out) + '\n');
}

main().catch(err => fail('unhandled: ' + (err && err.stack || err)));
