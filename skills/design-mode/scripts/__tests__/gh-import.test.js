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
