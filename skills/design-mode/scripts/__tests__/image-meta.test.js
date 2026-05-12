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

const { parseJpegDimensions } = require('../image-meta');

function makeSofSegment(marker, height, width) {
  // marker byte after FF (e.g. 0xC0), length 11 (2 bytes self + 9 bytes payload),
  // precision 8, height H (BE16), width W (BE16), then 4 bytes of component info dummies.
  return Buffer.from([
    0xFF, marker,
    0x00, 0x0B,          // length = 11 (matches 2 + 1 + 2 + 2 + 4)
    0x08,                 // precision
    (height >> 8) & 0xFF, height & 0xFF,
    (width >> 8) & 0xFF, width & 0xFF,
    0x01, 0x11, 0x00, 0x00, // dummy component info
  ]);
}

function makeMiscSegment(marker, payloadLength) {
  // FF marker, then BE16 length = payloadLength + 2 (length includes itself), then garbage payload.
  const total = 4 + payloadLength;
  const seg = Buffer.alloc(total);
  seg[0] = 0xFF;
  seg[1] = marker;
  seg.writeUInt16BE(payloadLength + 2, 2);
  // bytes 4..total-1 left as zeros (garbage)
  return seg;
}

const SOI = Buffer.from([0xFF, 0xD8]);

test('parseJpegDimensions: SOI + SOF0 directly returns dimensions', () => {
  const buf = Buffer.concat([SOI, makeSofSegment(0xC0, 15, 30)]);
  assert.deepStrictEqual(parseJpegDimensions(buf), { width: 30, height: 15 });
});

test('parseJpegDimensions: SOI + APP0 + SOF0 (typical JFIF) returns dimensions', () => {
  const buf = Buffer.concat([
    SOI,
    makeMiscSegment(0xE0, 14), // APP0 with 14-byte payload (JFIF-ish)
    makeSofSegment(0xC0, 100, 200),
  ]);
  assert.deepStrictEqual(parseJpegDimensions(buf), { width: 200, height: 100 });
});

test('parseJpegDimensions: SOF2 (progressive) recognized as SOF', () => {
  const buf = Buffer.concat([SOI, makeSofSegment(0xC2, 50, 75)]);
  assert.deepStrictEqual(parseJpegDimensions(buf), { width: 75, height: 50 });
});

test('parseJpegDimensions: SOF in third segment found by walking', () => {
  const buf = Buffer.concat([
    SOI,
    makeMiscSegment(0xE0, 12), // APP0
    makeMiscSegment(0xE1, 18), // APP1 (would normally be EXIF)
    makeSofSegment(0xC0, 64, 128),
  ]);
  assert.deepStrictEqual(parseJpegDimensions(buf), { width: 128, height: 64 });
});

test('parseJpegDimensions: standalone RST0 marker skipped before SOF', () => {
  // FFD0 has no length field; parser must advance only 2 bytes.
  const buf = Buffer.concat([
    SOI,
    Buffer.from([0xFF, 0xD0]), // RST0 standalone
    makeSofSegment(0xC0, 16, 24),
  ]);
  assert.deepStrictEqual(parseJpegDimensions(buf), { width: 24, height: 16 });
});

test('parseJpegDimensions: DHT (FFC4) is NOT mistaken for SOF', () => {
  // FFC4 looks like FFCx but is Define Huffman Table; should be skipped via length.
  const buf = Buffer.concat([
    SOI,
    makeMiscSegment(0xC4, 30), // DHT segment with 30-byte payload
    makeSofSegment(0xC0, 32, 48),
  ]);
  assert.deepStrictEqual(parseJpegDimensions(buf), { width: 48, height: 32 });
});

test('parseJpegDimensions: no SOF found throws corrupt_header', () => {
  const buf = Buffer.concat([
    SOI,
    makeMiscSegment(0xE0, 20),
    makeMiscSegment(0xE1, 10),
    // No SOF — buffer ends here.
  ]);
  assert.throws(
    () => parseJpegDimensions(buf),
    /corrupt_header/
  );
});

test('parseJpegDimensions: buffer with only SOI throws corrupt_header', () => {
  assert.throws(
    () => parseJpegDimensions(SOI),
    /corrupt_header/
  );
});
