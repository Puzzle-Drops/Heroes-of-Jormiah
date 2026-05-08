// Regression test for the "Cannot read properties of undefined (reading '0')"
// crash that hit when a registry-only class (Crusader, Berserker, etc.)
// was in the party — equippedRunes was only seeded for the 6 starter ids.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4810, ROOT = resolve('.');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = join(ROOT, urlPath);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(PORT, r));
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));

// Pick a deliberately-non-starter party — every member is a registry
// class that didn't exist pre-Phase-9.
const picks = ['crusader', 'berserker', 'samurai', 'druid', 'sniper', 'pyromancer'];
await page.evaluate((picks) => {
  for (const cls of picks) {
    document.querySelector(`[data-char-class="${cls}"]`)?.click();
  }
}, picks);
await new Promise(r => setTimeout(r, 200));

await page.click('#start-adventure-btn');
await new Promise(r => setTimeout(r, 1000));

await page.evaluate(() => {
  const all = [...document.querySelectorAll('[data-dungeon="everfall"]')];
  const visible = all.find(el => el.offsetParent !== null);
  (visible || all[0])?.click();
});
for (let i = 0; i < 25; i++) {
  await new Promise(r => setTimeout(r, 200));
  const count = await page.evaluate(() => window.game?.enemies?.length ?? 0);
  if (count > 0) break;
}

// Run a few combat ticks to exercise the UI rebuild path that crashed.
await new Promise(r => setTimeout(r, 3000));

const probe = await page.evaluate(() => ({
  partyClasses: (window.game?.party || []).map(m => m.className),
  partySize: (window.game?.party || []).length,
  enemyCount: (window.game?.enemies || []).length,
  // Has the UI built the party-card grid for these non-starter classes?
  partyCardCount: document.querySelectorAll('#party-container > *').length,
  hasRunesEntryForCrusader: !!(window.game?.equippedRunes?.crusader),
}));

await browser.close();
server.close();

let fails = 0;
console.log('Picked party:', probe.partyClasses.join(', '));
console.log('Party size:', probe.partySize);
console.log('Enemies:', probe.enemyCount);
console.log('Party cards rendered:', probe.partyCardCount);
console.log('equippedRunes.crusader exists:', probe.hasRunesEntryForCrusader);

if (probe.partySize !== 6) fails++;
if (probe.partyCardCount < 6) fails++;
if (!probe.hasRunesEntryForCrusader) fails++;

console.log(`\nPage errors: ${errors.length}`);
errors.slice(0, 10).forEach(e => console.log('  ' + e));
if (errors.length > 0) fails++;

console.log(`\nResult: ${fails === 0 ? 'PASS' : 'FAIL'}`);
process.exit(fails === 0 ? 0 : 1);
