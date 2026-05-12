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

const { parsePngHeader } = require('../image-meta');

function makePng(width, height) {
  const buf = Buffer.alloc(24);
  // 8-byte PNG magic
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(buf, 0);
  // IHDR length (4) + "IHDR" (4) — content unimportant for parsing, but valid for completeness
  buf.writeUInt32BE(13, 8);
  Buffer.from('IHDR', 'ascii').copy(buf, 12);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

test('parsePngHeader: 10x20 image parses correctly', () => {
  const result = parsePngHeader(makePng(10, 20));
  assert.deepStrictEqual(result, { width: 10, height: 20 });
});

test('parsePngHeader: 4096x2048 image parses correctly (large uint32)', () => {
  const result = parsePngHeader(makePng(4096, 2048));
  assert.deepStrictEqual(result, { width: 4096, height: 2048 });
});

test('parsePngHeader: buffer shorter than 24 bytes throws corrupt_header', () => {
  const buf = Buffer.alloc(16);
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(buf, 0);
  assert.throws(
    () => parsePngHeader(buf),
    /corrupt_header/
  );
});

test('parsePngHeader: width=0 throws corrupt_header', () => {
  assert.throws(
    () => parsePngHeader(makePng(0, 100)),
    /corrupt_header/
  );
});

test('parsePngHeader: height=0 throws corrupt_header', () => {
  assert.throws(
    () => parsePngHeader(makePng(100, 0)),
    /corrupt_header/
  );
});
