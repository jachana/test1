// Loads the real page in a real browser and fails on any console error.
//
// The unit tests drive the engine with no DOM at all, which is what makes them
// fast — and is exactly why they could not catch the bug that mattered most:
// an old save named an item that had been removed, the lookup threw during the
// offline replay before the UI had mounted, and the whole page came up blank
// with nothing in it to explain why. Nothing in `node --test` could see that.
//
// Playwright is not a dependency of this project (the game itself has none), so
// this skips cleanly when it is not installed:
//
//   npm i -D playwright && npx playwright install chromium
//   node tools/smoke.mjs
//   node tools/smoke.mjs --keep   # leave the browser open to look at it
//
// Set CHROME_PATH to point at a browser Playwright did not install itself —
// CI images often ship one already, at a version Playwright will not go looking
// for, and downloading a second copy to run nine page loads is silly.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8130;
const PAGES = ['Character', 'Hunt', 'Quests', 'Bestiary', 'Soul Board', 'Backpack', 'Traders', 'Fishing', 'Settings'];

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('playwright is not installed — skipping the browser check.');
  console.log('  npm i -D playwright && npx playwright install chromium');
  process.exit(0);
}

const server = spawn('npx', ['http-server', '-p', String(PORT), '-c-1'], { cwd: ROOT, stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

await new Promise((r) => setTimeout(r, 2500));

const launch = { headless: !process.argv.includes('--keep') };
if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;

let browser;
try {
  browser = await chromium.launch(launch);
} catch (err) {
  stop();
  console.log(`could not start a browser: ${err.message.split('\n')[0]}`);
  console.log('  npx playwright install chromium   — or set CHROME_PATH to one you have');
  process.exit(0); // a missing browser is not a failing game
}
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`uncaught: ${e}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });

// Character creation, if this is a clean profile.
const nameInput = await page.$('input');
if (nameInput) {
  await nameInput.fill('Smoke');
  await (await page.$('button')).click();
}
await page.waitForTimeout(800);

// Start a hunt, so the pages have live data and combat events are firing.
await page.locator('.nav-item', { hasText: 'Hunt' }).first().click();
await page.waitForTimeout(300);
await page.locator('.area-card').first().click();
await page.waitForTimeout(2500);

let failures = 0;
const fail = (msg) => { console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); failures++; };

for (const label of PAGES) {
  const btn = page.locator('.nav-item', { hasText: label }).first();
  if (!(await btn.count())) { fail(`no nav entry for ${label}`); continue; }
  await btn.click();
  await page.waitForTimeout(400);
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ').trim();
  if (text.length < 40) fail(`${label} rendered almost nothing`);
  else console.log(`  ok   ${label.padEnd(11)} ${text.slice(0, 66)}`);
}

// The fight has to be visible, not just running: floaters are spawned per blow
// and removed on animationend, so catching one means the whole chain works.
await page.locator('.nav-item', { hasText: 'Hunt' }).first().click();
let floaters = 0;
for (let i = 0; i < 24; i++) {
  floaters = Math.max(floaters, await page.locator('.floater').count());
  await page.waitForTimeout(300);
}
if (floaters === 0) fail('no damage floaters appeared during a hunt');
else console.log(`  ok   floaters   peak ${floaters} on screen`);

if (errors.length) {
  console.log('\n\x1b[31mConsole errors:\x1b[0m');
  for (const e of [...new Set(errors)]) console.log(`  ${e}`);
}

await browser.close();
stop();

const bad = failures + new Set(errors).size;
console.log(bad ? `\n\x1b[31m${bad} problem(s)\x1b[0m` : '\n\x1b[32mthe page works\x1b[0m');
process.exit(bad ? 1 : 0);
