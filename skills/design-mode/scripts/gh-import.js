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

async function main() {
  fail('not yet implemented');
}

if (require.main === module) {
  main().catch(err => fail('unhandled: ' + (err && err.stack || err)));
} else {
  module.exports = { normalizeUrl, validateContentType, bumpFilename };
}
