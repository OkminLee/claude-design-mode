#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

function fail(msg, code) {
  process.stderr.write(msg + '\n');
  process.exit(code != null ? code : 1);
}

function failJson(errorCode, message, exitCode) {
  process.stdout.write(JSON.stringify({ error: errorCode, message }) + '\n');
  process.exit(exitCode);
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const JPG_MAGIC = Buffer.from([0xFF, 0xD8]);

function detectFormat(buf) {
  if (!buf || buf.length < 2) return null;
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) return 'png';
  if (buf[0] === JPG_MAGIC[0] && buf[1] === JPG_MAGIC[1]) return 'jpeg';
  return null;
}

function parsePngHeader(buf) {
  if (!buf || buf.length < 24) {
    throw new Error('corrupt_header: PNG buffer too short (need 24+ bytes, got ' + (buf ? buf.length : 0) + ')');
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width === 0 || height === 0) {
    throw new Error('corrupt_header: PNG IHDR reports zero width or height');
  }
  return { width, height };
}

// SOFn markers that carry width/height (excludes C4=DHT, C8=reserved, CC=DAC).
const SOF_MARKERS = new Set([
  0xC0, 0xC1, 0xC2, 0xC3,
  0xC5, 0xC6, 0xC7,
  0xC9, 0xCA, 0xCB,
  0xCD, 0xCE, 0xCF,
]);

// Standalone markers without length field.
const STANDALONE_MARKERS = new Set([
  0x00,                          // FF 00 = byte stuff (not a real marker)
  0x01,                          // TEM
  0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, // RSTn
  0xD8,                          // SOI (only valid at start)
  0xD9,                          // EOI
]);

function parseJpegDimensions(buf) {
  if (!buf || buf.length < 4) {
    throw new Error('corrupt_header: JPG buffer too short');
  }
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) {
    throw new Error('corrupt_header: JPG missing SOI');
  }
  let i = 2;
  while (i < buf.length - 1) {
    // Find next 0xFF.
    if (buf[i] !== 0xFF) { i++; continue; }
    // Skip padding 0xFF bytes (some encoders emit FF FF FF Cx).
    while (i < buf.length - 1 && buf[i] === 0xFF && buf[i + 1] === 0xFF) i++;
    if (i >= buf.length - 1) break;
    const marker = buf[i + 1];

    if (SOF_MARKERS.has(marker)) {
      // SOFn segment: FF marker LL LL P HH HH WW WW ...
      if (i + 9 > buf.length) {
        throw new Error('corrupt_header: SOF segment truncated');
      }
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      if (width === 0 || height === 0) {
        throw new Error('corrupt_header: SOF reports zero width or height');
      }
      return { width, height };
    }

    if (STANDALONE_MARKERS.has(marker)) {
      i += 2;
      continue;
    }

    // Standard segment with 2-byte length following the marker byte.
    if (i + 4 > buf.length) {
      throw new Error('corrupt_header: segment header truncated');
    }
    const segLen = buf.readUInt16BE(i + 2);
    if (segLen < 2) {
      throw new Error('corrupt_header: segment length < 2');
    }
    i += 2 + segLen;
  }
  throw new Error('corrupt_header: no SOF marker found in buffer');
}

async function main() {
  fail('not yet implemented');
}

if (require.main === module) {
  main().catch(err => fail('unhandled: ' + (err && err.stack || err)));
} else {
  module.exports = { detectFormat, parsePngHeader, parseJpegDimensions };
}
