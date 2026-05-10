#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

const MAX_TEXT = 4096;
function truncate(s) {
  if (typeof s !== 'string') s = String(s);
  if (s.length <= MAX_TEXT) return s;
  return s.slice(0, MAX_TEXT) + '… [truncated, ' + (s.length - MAX_TEXT) + ' more chars]';
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) fail('usage: preview.js <html-file> [--viewport WxH]');
  let file = null;
  let viewport = '1280x800';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--viewport') {
      viewport = args[++i] || '';
    } else if (a.startsWith('--viewport=')) {
      viewport = a.slice('--viewport='.length);
    } else if (!file) {
      file = a;
    } else {
      fail('unexpected argument: ' + a);
    }
  }
  if (!file) fail('missing <html-file>');
  if (!/^\d+x\d+$/.test(viewport)) fail('malformed --viewport (expected WxH, got: ' + viewport + ')');
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) fail('file not found: ' + abs);
  const stat = fs.statSync(abs);
  if (!stat.isFile()) fail('not a regular file: ' + abs);
  const [w, h] = viewport.split('x').map(Number);
  return { file: abs, viewport, width: w, height: h };
}

function ensurePlaywright() {
  const scriptDir = path.dirname(__filename);
  const localPath = path.join(scriptDir, 'node_modules', 'playwright');
  // Cache guard: existence of node_modules/playwright is a coarse check. If a
  // prior install partially completed (npm step OK, browser download interrupted),
  // the next call will skip reinstall and chromium.launch will fail with
  // "Executable doesn't exist." That manifests as a {type: 'setup'} error in the
  // output JSON — which matches the spec's edge-case contract. Don't add binary-
  // presence detection here without revisiting that contract.
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

async function main() {
  const args = parseArgs(process.argv);
  const start = Date.now();
  const out = {
    file: args.file,
    viewport: args.viewport,
    screenshot: null,
    loaded: false,
    timing_ms: 0,
    errors: [],
    warnings: [],
    logs: [],
    network_errors: [],
  };
  const playwright = ensurePlaywright();
  if (playwright && playwright.error) {
    out.errors.push({ type: 'setup', text: truncate(playwright.error) });
    out.timing_ms = Date.now() - start;
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }
  if (!playwright) {
    out.errors.push({ type: 'setup', text: truncate('ensurePlaywright returned null unexpectedly') });
    out.timing_ms = Date.now() - start;
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: args.width, height: args.height } });
    const page = await context.newPage();
    page.on('console', msg => {
      const level = msg.type();
      const text = truncate(msg.text());
      if (level === 'error') {
        out.errors.push({ type: 'console', level, text });
      } else if (level === 'warning') {
        out.warnings.push({ type: 'console', level, text });
      } else {
        out.logs.push({ type: 'console', level, text });
      }
    });
    page.on('pageerror', err => {
      out.errors.push({ type: 'pageerror', text: truncate(String(err)) });
    });
    // Note: a single failing request can fire both requestfailed and response
    // (e.g. 500 then connection reset). We intentionally don't dedupe — order
    // and presence of both signals is diagnostic.
    page.on('requestfailed', req => {
      out.network_errors.push({
        url: req.url(),
        status: null,
        text: truncate(req.failure() && req.failure().errorText || 'request failed'),
      });
    });
    page.on('response', resp => {
      const s = resp.status();
      if (s >= 400) {
        out.network_errors.push({
          url: resp.url(),
          status: s,
          text: truncate(resp.statusText() || ('HTTP ' + s)),
        });
      }
    });
    try {
      await page.goto('file://' + args.file, { timeout: 10000, waitUntil: 'load' });
      out.loaded = true;
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (_) {
        // networkidle not reached within 5s — proceed anyway, still report what we have
      }
    } catch (e) {
      out.errors.push({ type: 'navigation', text: truncate(String(e && e.message || e)) });
    }
    if (out.loaded) {
      const shotPath = args.file + '.preview.png';
      try {
        await page.screenshot({ path: shotPath, fullPage: true });
        out.screenshot = shotPath;
      } catch (e) {
        out.errors.push({ type: 'io', text: truncate('screenshot save failed: ' + String(e && e.message || e)) });
      }
    }
    await context.close();
  } catch (e) {
    out.errors.push({ type: 'setup', text: truncate(String(e && e.message || e)) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  out.timing_ms = Date.now() - start;
  process.stdout.write(JSON.stringify(out) + '\n');
}

main().catch(err => fail('unhandled: ' + (err && err.stack || err)));
