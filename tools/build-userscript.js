#!/usr/bin/env bun
// Bundle the module graph into one installable userscript file.
//
// The content world that Safari's Userscripts extension injects into has no
// module loader, so the tested modules are unreachable from the browser unless
// they are inlined. This is the only step between `bun test` passing and a file
// the Mac can install, and it deliberately does nothing else: no transpiling
// beyond the bundler, no minification, so a stack trace from Safari still points
// at the source line that broke.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'src/userscript-main.js');
const outDir = resolve(root, 'dist');
const outFile = resolve(outDir, 'nbm-archive.user.js');

const HEADER = `// ==UserScript==
// @name         nbm-archive
// @version      0.1.3
// @description  Archive one NotebookLM conversation into an Obsidian vault note
// @match        https://notebook.google.com/*
// @inject-into  content
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==
`;

// Bun's bundler is the only build step, and the format is fixed: IIFE, browser
// target, no minify.
const build = await Bun.build({
  entrypoints: [entry],
  target: 'browser',
  format: 'iife',
  minify: false,
  sourcemap: 'none',
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}

const bundled = await build.outputs[0].text();

if (bundled.includes('import ')) {
  // An unresolvable import would be a runtime ReferenceError in the content
  // world with no useful message, so fail here instead.
  console.error('bundle still contains an import statement; the graph is not closed');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// The bundler orders modules by import graph, so CONFIG lands wherever its
// dependencies put it rather than at the top. Finding the line and printing it
// is more honest than a banner that points at line 1 and is wrong.
const offset = bundled.indexOf('var CONFIG = {');
const configLine = bundled.slice(0, offset).split('\n').length + 1;
const banner =
  `// Choose course, lecture, and first/review mode in the archive dialog.\n` +
  `// The notebook URL supplies its ID; confirm the recent conversation candidate.\n` +
  `// Uncheck validation-only in the dialog to save to Obsidian.\n` +
  `// CONFIG starts at line ${configLine} of the bundle below.\n` +
  `// ---------------------------------------------------------------------------\n`;

writeFileSync(outFile, HEADER + banner + bundled);

const bytes = Buffer.byteLength(HEADER + banner + bundled);
console.log(`wrote ${outFile} (${bytes} bytes, CONFIG at line ${configLine})`);
console.log('next: copy the file to the Safari Userscripts');
console.log('folder, reopen the extension popup, reload the notebook page.');
console.log('choose course, lecture, and save mode in the archive dialog.');
