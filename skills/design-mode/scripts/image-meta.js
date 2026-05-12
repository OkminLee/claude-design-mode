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

async function main() {
  fail('not yet implemented');
}

if (require.main === module) {
  main().catch(err => fail('unhandled: ' + (err && err.stack || err)));
} else {
  module.exports = { detectFormat, parsePngHeader };
}
