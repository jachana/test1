// Builds the party game's practice mode as one self-contained page.
//
//   node tools/build-party.mjs [outDir]
//
// The party game proper cannot be a static page — it is a server, a television
// and a pile of phones. Practice mode is the part that can: the same three
// rounds from the same rounds.mjs, played alone, which is what you want anyway
// for testing the questions before the night and for sending round beforehand.
//
// Output: <outDir>/tibia-party.html — bundled JS, inlined CSS, no
// <html>/<head>/<body> wrapper, which is what the Artifact publisher expects.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? join(root, 'dist'));
mkdirSync(outDir, { recursive: true });

const bundlePath = join(outDir, '.party-bundle.js');
execFileSync('npx', ['--yes', 'esbuild@0.25.0', 'party/solo.js', '--bundle', '--format=iife',
  '--minify', `--outfile=${bundlePath}`, '--log-level=warning'], { cwd: root, stdio: 'inherit' });

const read = (p) => readFileSync(join(root, p), 'utf8');
const js = readFileSync(bundlePath, 'utf8');
rmSync(bundlePath);

const page = `<title>Tibia LAN Party</title>
<style>
${read('src/fonts.css')}
${read('src/sprites.css')}
${read('party/party.css')}</style>
<div id="solo" class="host"></div>
<script>
${js}</script>
`;

const outFile = join(outDir, 'tibia-party.html');
writeFileSync(outFile, page);
console.log(`wrote ${outFile} (${(page.length / 1024).toFixed(0)} KB)`);
