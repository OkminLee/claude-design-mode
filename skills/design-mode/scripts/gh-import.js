#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');

function fail(msg, code) {
  process.stderr.write(msg + '\n');
  process.exit(code != null ? code : 1);
}

function failJson(errorCode, message, exitCode) {
  process.stdout.write(JSON.stringify({ error: errorCode, message }) + '\n');
  process.exit(exitCode);
}

function normalizeUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch (_) {
    throw new Error('unsupported_url: ' + input);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('unsupported_url: must be https, got ' + parsed.protocol);
  }
  parsed.search = '';
  parsed.hash = '';

  if (parsed.host === 'raw.githubusercontent.com') {
    // Pass through. Validate path shape: /<o>/<r>/<branch>/<path...>
    const segs = parsed.pathname.split('/').filter(Boolean);
    if (segs.length < 4) {
      throw new Error('unsupported_url: raw URL missing path');
    }
    return parsed.toString();
  }

  if (parsed.host === 'github.com') {
    const segs = parsed.pathname.split('/').filter(Boolean);
    // /<o>/<r>/blob/<branch>/<path...> or /<o>/<r>/raw/<branch>/<path...>
    if (segs.length < 5 || (segs[2] !== 'blob' && segs[2] !== 'raw')) {
      throw new Error('unsupported_url: expected /<owner>/<repo>/blob/<branch>/<path>');
    }
    const owner = segs[0];
    const repo = segs[1];
    const branch = segs[3];
    const filePath = segs.slice(4).join('/');
    return 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch + '/' + filePath;
  }

  throw new Error('unsupported_url: host ' + parsed.host);
}

const TEXT_LIKE_PATTERNS = [
  /^text\//i,
  /^application\/json\b/i,
  /^application\/(java|type)script\b/i,
  /^application\/xml\b/i,
  /^application\/(x-)?yaml\b/i,
];

function validateContentType(header, allowBinary) {
  if (allowBinary) return true;
  if (!header) return false;
  return TEXT_LIKE_PATTERNS.some(re => re.test(header));
}

function bumpFilename(destDir, filename, existsFn) {
  const exists = existsFn || ((p) => fs.existsSync(p));
  const target = path.join(destDir, filename);
  if (!exists(target)) return target;

  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';

  for (let i = 2; i < 1000; i++) {
    const candidate = path.join(destDir, stem + '.' + i + ext);
    if (!exists(candidate)) return candidate;
  }
  throw new Error('bumpFilename: too many collisions for ' + filename);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    fail('usage: gh-import.js <url> [--dest <dir>] [--name <filename>] [--max-bytes <N>] [--allow-binary]');
  }
  let url = null;
  let dest = 'references';
  let name = null;
  let maxBytes = 5 * 1024 * 1024;
  let allowBinary = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dest') {
      dest = args[++i] || '';
      if (!dest) fail('--dest requires a value');
    } else if (a.startsWith('--dest=')) {
      dest = a.slice('--dest='.length);
    } else if (a === '--name') {
      name = args[++i] || '';
      if (!name) fail('--name requires a value');
    } else if (a.startsWith('--name=')) {
      name = a.slice('--name='.length);
    } else if (a === '--max-bytes') {
      const v = args[++i] || '';
      maxBytes = parseInt(v, 10);
      if (!Number.isFinite(maxBytes) || maxBytes <= 0) fail('--max-bytes must be a positive integer');
    } else if (a.startsWith('--max-bytes=')) {
      maxBytes = parseInt(a.slice('--max-bytes='.length), 10);
      if (!Number.isFinite(maxBytes) || maxBytes <= 0) fail('--max-bytes must be a positive integer');
    } else if (a === '--allow-binary') {
      allowBinary = true;
    } else if (a.startsWith('--')) {
      fail('unknown flag: ' + a);
    } else if (!url) {
      url = a;
    } else {
      fail('unexpected argument: ' + a);
    }
  }

  if (!url) fail('missing <url>');
  if (name && (name.includes('/') || name.includes('\\') || name.includes('..') || name.includes('\0'))) {
    throw new Error('invalid_name: filename may not contain /, \\, .., or NUL');
  }
  return { url, dest, name, maxBytes, allowBinary };
}

async function fetchAndStream(url, maxBytes, allowBinary) {
  let headResp;
  try {
    headResp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  } catch (e) {
    const err = new Error('network: HEAD failed: ' + (e && e.message || e));
    err.code = 'network';
    throw err;
  }
  if (headResp.status === 404) { const e = new Error('not_found'); e.code = 'not_found'; throw e; }
  if (headResp.status === 403) { const e = new Error('forbidden: private repo or rate limited'); e.code = 'forbidden'; throw e; }
  if (headResp.status >= 400) { const e = new Error('http_error: ' + headResp.status); e.code = 'http_error'; throw e; }

  const contentType = headResp.headers.get('content-type') || '';
  if (!validateContentType(contentType, allowBinary)) {
    const e = new Error('binary_blocked: content-type ' + contentType + ' is not text-like (use --allow-binary to override)');
    e.code = 'binary_blocked';
    throw e;
  }
  const lenHeader = headResp.headers.get('content-length');
  if (lenHeader != null) {
    const len = parseInt(lenHeader, 10);
    if (Number.isFinite(len) && len > maxBytes) {
      const e = new Error('too_large: ' + len + ' bytes exceeds --max-bytes ' + maxBytes);
      e.code = 'too_large';
      throw e;
    }
  }

  let resp;
  try {
    resp = await fetch(url, { method: 'GET', redirect: 'follow' });
  } catch (e) {
    const err = new Error('network: GET failed: ' + (e && e.message || e));
    err.code = 'network';
    throw err;
  }
  if (resp.status === 404) { const e = new Error('not_found'); e.code = 'not_found'; throw e; }
  if (resp.status === 403) { const e = new Error('forbidden'); e.code = 'forbidden'; throw e; }
  if (resp.status >= 400) { const e = new Error('http_error: ' + resp.status); e.code = 'http_error'; throw e; }

  const ab = await resp.arrayBuffer();
  const buffer = Buffer.from(ab);
  if (buffer.length > maxBytes) {
    const e = new Error('too_large: ' + buffer.length + ' bytes exceeds --max-bytes ' + maxBytes);
    e.code = 'too_large';
    throw e;
  }
  return { buffer, contentType: resp.headers.get('content-type') || contentType, fromUrl: url };
}

async function main() {
  fail('not yet implemented');
}

if (require.main === module) {
  main().catch(err => fail('unhandled: ' + (err && err.stack || err)));
} else {
  module.exports = { normalizeUrl, validateContentType, bumpFilename, parseArgs, fetchAndStream };
}
