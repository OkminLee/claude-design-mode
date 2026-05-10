'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

test('test runner works', () => {
  assert.strictEqual(1 + 1, 2);
});

const { normalizeUrl } = require('../gh-import');

test('normalizeUrl: blob URL converts to raw', () => {
  assert.strictEqual(
    normalizeUrl('https://github.com/foo/bar/blob/main/path/to/file.css'),
    'https://raw.githubusercontent.com/foo/bar/main/path/to/file.css'
  );
});

test('normalizeUrl: raw URL passes through', () => {
  const url = 'https://raw.githubusercontent.com/foo/bar/main/path/to/file.css';
  assert.strictEqual(normalizeUrl(url), url);
});

test('normalizeUrl: /raw/ URL converts to raw host', () => {
  assert.strictEqual(
    normalizeUrl('https://github.com/foo/bar/raw/main/file.css'),
    'https://raw.githubusercontent.com/foo/bar/main/file.css'
  );
});

test('normalizeUrl: strips ?plain=1 and #L42', () => {
  assert.strictEqual(
    normalizeUrl('https://github.com/foo/bar/blob/main/file.css?plain=1#L42-L60'),
    'https://raw.githubusercontent.com/foo/bar/main/file.css'
  );
});

test('normalizeUrl: rejects non-github host', () => {
  assert.throws(
    () => normalizeUrl('https://gitlab.com/foo/bar/blob/main/file.css'),
    /unsupported_url/
  );
});

test('normalizeUrl: rejects http (not https)', () => {
  assert.throws(
    () => normalizeUrl('http://github.com/foo/bar/blob/main/file.css'),
    /unsupported_url/
  );
});

test('normalizeUrl: rejects whole-repo URL with no path', () => {
  assert.throws(
    () => normalizeUrl('https://github.com/foo/bar'),
    /unsupported_url/
  );
});

const { validateContentType } = require('../gh-import');

test('validateContentType: accepts text/css', () => {
  assert.strictEqual(validateContentType('text/css; charset=utf-8', false), true);
});

test('validateContentType: accepts application/json', () => {
  assert.strictEqual(validateContentType('application/json', false), true);
});

test('validateContentType: accepts application/javascript', () => {
  assert.strictEqual(validateContentType('application/javascript', false), true);
});

test('validateContentType: accepts application/yaml', () => {
  assert.strictEqual(validateContentType('application/yaml', false), true);
});

test('validateContentType: rejects image/png when allow-binary false', () => {
  assert.strictEqual(validateContentType('image/png', false), false);
});

test('validateContentType: accepts image/png when allow-binary true', () => {
  assert.strictEqual(validateContentType('image/png', true), true);
});

test('validateContentType: missing header treated as octet-stream → reject', () => {
  assert.strictEqual(validateContentType('', false), false);
  assert.strictEqual(validateContentType(null, false), false);
});

const { bumpFilename } = require('../gh-import');

test('bumpFilename: returns base name when no collision', () => {
  const exists = (p) => false;
  assert.strictEqual(bumpFilename('/tmp/refs', 'tokens.css', exists), '/tmp/refs/tokens.css');
});

test('bumpFilename: appends .2 on first collision', () => {
  const seen = new Set(['/tmp/refs/tokens.css']);
  const exists = (p) => seen.has(p);
  assert.strictEqual(bumpFilename('/tmp/refs', 'tokens.css', exists), '/tmp/refs/tokens.2.css');
});

test('bumpFilename: keeps bumping until free slot', () => {
  const seen = new Set([
    '/tmp/refs/tokens.css',
    '/tmp/refs/tokens.2.css',
    '/tmp/refs/tokens.3.css',
  ]);
  const exists = (p) => seen.has(p);
  assert.strictEqual(bumpFilename('/tmp/refs', 'tokens.css', exists), '/tmp/refs/tokens.4.css');
});

test('bumpFilename: handles dotless filenames', () => {
  const exists = (p) => p === '/tmp/refs/README';
  assert.strictEqual(bumpFilename('/tmp/refs', 'README', exists), '/tmp/refs/README.2');
});

const { parseArgs } = require('../gh-import');

test('parseArgs: minimal — url only', () => {
  const r = parseArgs(['node', 'gh-import.js', 'https://github.com/foo/bar/blob/main/file.css']);
  assert.strictEqual(r.url, 'https://github.com/foo/bar/blob/main/file.css');
  assert.strictEqual(r.dest, 'references');
  assert.strictEqual(r.name, null);
  assert.strictEqual(r.maxBytes, 5 * 1024 * 1024);
  assert.strictEqual(r.allowBinary, false);
});

test('parseArgs: --dest overrides default', () => {
  const r = parseArgs(['node', 'gh-import.js', 'https://github.com/foo/bar/blob/main/x', '--dest', 'lib/']);
  assert.strictEqual(r.dest, 'lib/');
});

test('parseArgs: --name overrides filename', () => {
  const r = parseArgs(['node', 'gh-import.js', 'https://github.com/foo/bar/blob/main/x', '--name', 'tokens.css']);
  assert.strictEqual(r.name, 'tokens.css');
});

test('parseArgs: --max-bytes parses int', () => {
  const r = parseArgs(['node', 'gh-import.js', 'https://github.com/foo/bar/blob/main/x', '--max-bytes', '1024']);
  assert.strictEqual(r.maxBytes, 1024);
});

test('parseArgs: --allow-binary toggles flag', () => {
  const r = parseArgs(['node', 'gh-import.js', 'https://github.com/foo/bar/blob/main/x', '--allow-binary']);
  assert.strictEqual(r.allowBinary, true);
});

test('parseArgs: --name with .. throws invalid_name', () => {
  assert.throws(
    () => parseArgs(['node', 'gh-import.js', 'https://github.com/foo/bar/blob/main/x', '--name', '../etc/passwd']),
    /invalid_name/
  );
});

test('parseArgs: --name with slash throws invalid_name', () => {
  assert.throws(
    () => parseArgs(['node', 'gh-import.js', 'https://github.com/foo/bar/blob/main/x', '--name', 'a/b.css']),
    /invalid_name/
  );
});

const { fetchAndStream } = require('../gh-import');

function makeMockFetch(responses) {
  // responses is a Map<"METHOD url", () => Response | Promise<Response>>
  return async function mockFetch(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init && init.method) || 'GET';
    const key = method + ' ' + url;
    const handler = responses.get(key);
    if (!handler) throw new Error('mockFetch: no handler for ' + key);
    return handler();
  };
}

function makeResponse({ status = 200, headers = {}, body = '' } = {}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k) => h.get(k.toLowerCase()) || null },
    arrayBuffer: async () => Buffer.from(body),
  };
}

test('fetchAndStream: success path returns buffer + content-type', async () => {
  const url = 'https://raw.githubusercontent.com/foo/bar/main/file.css';
  const body = 'body { color: red; }';
  const responses = new Map([
    ['HEAD ' + url, () => makeResponse({ headers: { 'content-length': String(body.length), 'content-type': 'text/css' } })],
    ['GET ' + url, () => makeResponse({ headers: { 'content-type': 'text/css' }, body })],
  ]);
  const orig = globalThis.fetch;
  globalThis.fetch = makeMockFetch(responses);
  try {
    const r = await fetchAndStream(url, 1024 * 1024, false);
    assert.strictEqual(r.contentType.startsWith('text/css'), true);
    assert.strictEqual(r.buffer.toString('utf8'), body);
    assert.strictEqual(r.fromUrl, url);
  } finally {
    globalThis.fetch = orig;
  }
});

test('fetchAndStream: HEAD content-length over cap throws too_large', async () => {
  const url = 'https://raw.githubusercontent.com/foo/bar/main/big.bin';
  const responses = new Map([
    ['HEAD ' + url, () => makeResponse({ headers: { 'content-length': '99999999', 'content-type': 'text/plain' } })],
  ]);
  const orig = globalThis.fetch;
  globalThis.fetch = makeMockFetch(responses);
  try {
    await assert.rejects(
      () => fetchAndStream(url, 1024, false),
      (err) => err.code === 'too_large'
    );
  } finally {
    globalThis.fetch = orig;
  }
});

test('fetchAndStream: binary content-type throws binary_blocked', async () => {
  const url = 'https://raw.githubusercontent.com/foo/bar/main/logo.png';
  const responses = new Map([
    ['HEAD ' + url, () => makeResponse({ headers: { 'content-type': 'image/png' } })],
  ]);
  const orig = globalThis.fetch;
  globalThis.fetch = makeMockFetch(responses);
  try {
    await assert.rejects(
      () => fetchAndStream(url, 1024 * 1024, false),
      (err) => err.code === 'binary_blocked'
    );
  } finally {
    globalThis.fetch = orig;
  }
});

test('fetchAndStream: 404 throws not_found', async () => {
  const url = 'https://raw.githubusercontent.com/foo/bar/main/missing';
  const responses = new Map([
    ['HEAD ' + url, () => makeResponse({ status: 404 })],
  ]);
  const orig = globalThis.fetch;
  globalThis.fetch = makeMockFetch(responses);
  try {
    await assert.rejects(
      () => fetchAndStream(url, 1024 * 1024, false),
      (err) => err.code === 'not_found'
    );
  } finally {
    globalThis.fetch = orig;
  }
});

test('fetchAndStream: GET body bigger than cap throws too_large', async () => {
  const url = 'https://raw.githubusercontent.com/foo/bar/main/file.css';
  const big = 'x'.repeat(2048);
  const responses = new Map([
    ['HEAD ' + url, () => makeResponse({ headers: { 'content-type': 'text/css' } })], // no Content-Length
    ['GET ' + url, () => makeResponse({ headers: { 'content-type': 'text/css' }, body: big })],
  ]);
  const orig = globalThis.fetch;
  globalThis.fetch = makeMockFetch(responses);
  try {
    await assert.rejects(
      () => fetchAndStream(url, 1024, false),
      (err) => err.code === 'too_large'
    );
  } finally {
    globalThis.fetch = orig;
  }
});

test('fetchAndStream: --allow-binary lets image/png through', async () => {
  const url = 'https://raw.githubusercontent.com/foo/bar/main/logo.png';
  const body = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const responses = new Map([
    ['HEAD ' + url, () => makeResponse({ headers: { 'content-type': 'image/png', 'content-length': '4' } })],
    ['GET ' + url, () => ({
        status: 200,
        ok: true,
        headers: { get: (k) => k.toLowerCase() === 'content-type' ? 'image/png' : null },
        arrayBuffer: async () => body,
    })],
  ]);
  const orig = globalThis.fetch;
  globalThis.fetch = makeMockFetch(responses);
  try {
    const r = await fetchAndStream(url, 1024 * 1024, true);
    assert.strictEqual(r.buffer.length, 4);
  } finally {
    globalThis.fetch = orig;
  }
});

const { writeAtomic } = require('../gh-import');

test('writeAtomic: writes file with sha256', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghimport-'));
  try {
    const target = path.join(dir, 'tokens.css');
    const buf = Buffer.from('body { color: red; }', 'utf8');
    const sha = writeAtomic(target, buf);
    assert.strictEqual(fs.readFileSync(target, 'utf8'), 'body { color: red; }');
    assert.strictEqual(sha, crypto.createHash('sha256').update(buf).digest('hex'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('main(): happy path writes file and emits JSON', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghimport-e2e-'));
  const url = 'https://github.com/foo/bar/blob/main/tokens.css';
  const rawUrl = 'https://raw.githubusercontent.com/foo/bar/main/tokens.css';
  const body = ':root { --primary: #D97757; }';

  const responses = new Map([
    ['HEAD ' + rawUrl, () => makeResponse({ headers: { 'content-length': String(body.length), 'content-type': 'text/css' } })],
    ['GET ' + rawUrl, () => makeResponse({ headers: { 'content-type': 'text/css' }, body })],
  ]);

  const origCwd = process.cwd();
  const origFetch = globalThis.fetch;
  const origWrite = process.stdout.write.bind(process.stdout);
  const origExit = process.exit;
  const origArgv = process.argv;
  let captured = '';
  let exitCode = null;

  process.chdir(dir);
  globalThis.fetch = makeMockFetch(responses);
  process.stdout.write = (s) => { captured += s; return true; };
  process.exit = (c) => { exitCode = c; throw new Error('__exit__'); };
  process.argv = ['node', 'gh-import.js', url];

  // Reset module cache to avoid stale references in case of prior test failures.
  delete require.cache[require.resolve('../gh-import')];
  const mod = require('../gh-import');

  try {
    await mod.main();
  } catch (e) {
    if (e.message !== '__exit__') throw e;
  } finally {
    process.argv = origArgv;
    process.chdir(origCwd);
    globalThis.fetch = origFetch;
    process.stdout.write = origWrite;
    process.exit = origExit;
  }

  const json = JSON.parse(captured.trim());
  assert.strictEqual(json.bytes, body.length);
  assert.strictEqual(json.from, rawUrl);
  assert.match(json.imported, /references[\\/]tokens\.css$/);
  assert.strictEqual(json.sha256, crypto.createHash('sha256').update(body).digest('hex'));
  assert.strictEqual(fs.readFileSync(json.imported, 'utf8'), body);

  fs.rmSync(dir, { recursive: true, force: true });
});
