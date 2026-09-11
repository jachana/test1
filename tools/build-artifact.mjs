// Builds a single-file version of the game for publishing as a Claude Artifact.
//
//   npx esbuild --version   # esbuild is fetched on demand by this script
//   node tools/build-artifact.mjs [outDir]
//
// Output: <outDir>/tibia-idle.html — one self-contained page (bundled JS,
// inlined CSS) with no <html>/<head>/<body> wrapper, which is what the Artifact
// publisher expects.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? join(root, 'dist'));
mkdirSync(outDir, { recursive: true });

const bundlePath = join(outDir, '.bundle.js');
execFileSync('npx', ['--yes', 'esbuild@0.25.0', 'src/main.js', '--bundle', '--format=iife',
  '--minify', `--outfile=${bundlePath}`, '--log-level=warning'], { cwd: root, stdio: 'inherit' });

const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const js = readFileSync(bundlePath, 'utf8');
rmSync(bundlePath);

const page = `<title>Tibia Idle</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Barlow:wght@400;500;600&display=swap">
<style>
${css}</style>
<div id="app"></div>
<script>
${js}</script>
`;

const outFile = join(outDir, 'tibia-idle.html');
writeFileSync(outFile, page);
console.log(`wrote ${outFile} (${(page.length / 1024).toFixed(0)} KB)`);
