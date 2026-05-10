#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

function fail(msg, code) {
  process.stderr.write(msg + '\n');
  process.exit(code != null ? code : 1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) fail('usage: add-tweaks.js <html-file>');
  if (args.length > 1) fail('unexpected extra arguments: ' + args.slice(1).join(' '));
  const file = path.resolve(args[0]);
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.html' && ext !== '.htm') {
    fail('file must end in .html or .htm: ' + file);
  }
  if (!fs.existsSync(file)) {
    fail('file not found: ' + file);
  }
  if (!fs.statSync(file).isFile()) {
    fail('not a regular file: ' + file);
  }
  return { file };
}

function buildInsertion() {
  return [
    '  <script>',
    '    const tweakDefaults = /*EDITMODE-BEGIN*/{',
    '      "primaryColor": "#000000"',
    '    }/*EDITMODE-END*/;',
    '  </script>',
    '  <script src="tweaks-panel.js"></script>',
    '  <script>',
    '    const filePath = location.protocol === \'file:\'',
    '      ? decodeURIComponent(location.pathname)',
    '      : location.pathname;',
    '    TweaksPanel.mount(tweakDefaults, {',
    '      filePath: filePath,',
    '      onChange: (_key, _value, _all) => {',
    '        // TODO: apply each tweak to the DOM here.',
    '      },',
    '    });',
    '  </script>',
    '',
  ].join('\n');
}

function atomicWrite(filePath, content) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function main() {
  const args = parseArgs(process.argv);
  const content = fs.readFileSync(args.file, 'utf8');

  if (content.indexOf('EDITMODE-BEGIN') !== -1) {
    fail('file already has an EDITMODE block: ' + args.file, 2);
  }
  if (content.indexOf('tweaks-panel.js') !== -1) {
    fail('file already references tweaks-panel.js: ' + args.file, 2);
  }
  const bodyCloseRe = /<\/body>/i;
  if (!bodyCloseRe.test(content)) {
    fail('no </body> found in file (incomplete document?): ' + args.file, 2);
  }

  const insertion = buildInsertion();
  const updated = content.replace(bodyCloseRe, (match) => insertion + match);

  try {
    atomicWrite(args.file, updated);
  } catch (e) {
    fail('write failed: ' + String(e && e.message || e), 2);
  }

  process.stdout.write(JSON.stringify({
    updated: args.file,
    added: ['editmode_block', 'panel_script', 'mount_call'],
  }) + '\n');
}

main();
