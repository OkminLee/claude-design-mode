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

async function main() {
  fail('not yet implemented');
}

if (require.main === module) {
  main().catch(err => fail('unhandled: ' + (err && err.stack || err)));
} else {
  module.exports = {};
}
