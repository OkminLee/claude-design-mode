'use strict';

const test = require('node:test');
const assert = require('node:assert');

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
