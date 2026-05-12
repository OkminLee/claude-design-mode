'use strict';

const test = require('node:test');
const assert = require('node:assert');

test('test runner works', () => {
  assert.strictEqual(1 + 1, 2);
});

const { detectFormat } = require('../image-meta');

test('detectFormat: PNG magic returns "png"', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  assert.strictEqual(detectFormat(buf), 'png');
});

test('detectFormat: JPG magic returns "jpeg"', () => {
  const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  assert.strictEqual(detectFormat(buf), 'jpeg');
});

test('detectFormat: GIF magic returns null', () => {
  const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  assert.strictEqual(detectFormat(buf), null);
});

test('detectFormat: empty buffer returns null', () => {
  assert.strictEqual(detectFormat(Buffer.alloc(0)), null);
});

test('detectFormat: 1-byte buffer returns null', () => {
  assert.strictEqual(detectFormat(Buffer.from([0xFF])), null);
});
