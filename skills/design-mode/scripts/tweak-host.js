#!/usr/bin/env node
'use strict';

const http = require('http');

function parseArgs(argv) {
  const args = argv.slice(2);
  let port = 5174;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--port') {
      port = parseInt(args[++i] || '', 10);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        process.stderr.write('--port requires an integer between 1 and 65535\n');
        process.exit(1);
      }
    } else if (a.startsWith('--port=')) {
      port = parseInt(a.slice('--port='.length), 10);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        process.stderr.write('--port requires an integer between 1 and 65535\n');
        process.exit(1);
      }
    } else {
      process.stderr.write('unknown argument: ' + a + '\n');
      process.exit(1);
    }
  }
  return { port };
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const fs = require('fs');
const path = require('path');

const EDITMODE_RE = /\/\*EDITMODE-BEGIN\*\/([\s\S]*?)\/\*EDITMODE-END\*\//g;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function findBlocks(content) {
  const matches = [];
  let m;
  EDITMODE_RE.lastIndex = 0;
  while ((m = EDITMODE_RE.exec(content)) !== null) {
    matches.push({ full: m[0], inner: m[1], index: m.index });
  }
  return matches;
}

function rewriteBlock(content, mergedJson) {
  const replacement = '/*EDITMODE-BEGIN*/' + mergedJson + '/*EDITMODE-END*/';
  EDITMODE_RE.lastIndex = 0;
  return content.replace(EDITMODE_RE, replacement);
}

function atomicWrite(filePath, content) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function sendJson(res, status, body) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function logRequest(req, status) {
  process.stderr.write(`[${new Date().toISOString()}] ${req.method} ${req.url} → ${status}\n`);
}

const args = parseArgs(process.argv);

async function handleSave(req, res) {
  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    sendJson(res, 400, { error: 'body is not valid JSON: ' + e.message });
    logRequest(req, 400);
    return;
  }
  if (!body || typeof body !== 'object') {
    sendJson(res, 400, { error: 'body must be an object' });
    logRequest(req, 400);
    return;
  }
  const filePath = body.file;
  const edits = body.edits;
  if (typeof filePath !== 'string' || !filePath) {
    sendJson(res, 400, { error: 'missing or empty "file"' });
    logRequest(req, 400);
    return;
  }
  if (!path.isAbsolute(filePath)) {
    sendJson(res, 400, { error: '"file" must be an absolute path' });
    logRequest(req, 400);
    return;
  }
  if (!edits || typeof edits !== 'object' || Array.isArray(edits)) {
    sendJson(res, 400, { error: '"edits" must be an object' });
    logRequest(req, 400);
    return;
  }
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: 'file not found: ' + filePath });
    logRequest(req, 404);
    return;
  }
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    sendJson(res, 500, { error: 'read failed: ' + e.message });
    logRequest(req, 500);
    return;
  }
  const blocks = findBlocks(content);
  if (blocks.length === 0) {
    sendJson(res, 422, { error: 'no EDITMODE-BEGIN/END block found in ' + filePath });
    logRequest(req, 422);
    return;
  }
  if (blocks.length > 1) {
    sendJson(res, 422, { error: 'exactly one EDITMODE block expected, found ' + blocks.length });
    logRequest(req, 422);
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(blocks[0].inner);
  } catch (e) {
    sendJson(res, 422, { error: 'EDITMODE block contents are not valid JSON: ' + e.message });
    logRequest(req, 422);
    return;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 422, { error: 'EDITMODE block must contain a JSON object' });
    logRequest(req, 422);
    return;
  }
  const merged = Object.assign({}, parsed, edits);
  const mergedJson = JSON.stringify(merged, null, 2);
  const newContent = rewriteBlock(content, mergedJson);
  try {
    atomicWrite(filePath, newContent);
  } catch (e) {
    sendJson(res, 500, { error: 'write failed: ' + e.message });
    logRequest(req, 500);
    return;
  }
  sendJson(res, 200, { updated: Object.keys(edits) });
  logRequest(req, 200);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS' && req.url === '/save') {
    applyCors(res);
    res.statusCode = 204;
    res.end();
    logRequest(req, 204);
    return;
  }
  if (req.method === 'POST' && req.url === '/save') {
    handleSave(req, res).catch((err) => {
      sendJson(res, 500, { error: 'unhandled: ' + (err && err.message || err) });
      logRequest(req, 500);
    });
    return;
  }
  sendJson(res, 404, { error: 'not found' });
  logRequest(req, 404);
});

server.on('error', (err) => {
  process.stderr.write('server error: ' + (err && err.message || err) + '\n');
  process.exit(1);
});

server.listen(args.port, '127.0.0.1', () => {
  process.stderr.write(`tweak-host listening on http://127.0.0.1:${args.port}\n`);
});
