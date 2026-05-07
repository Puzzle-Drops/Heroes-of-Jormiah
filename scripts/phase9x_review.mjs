// Phase 9.x: family section headers in character-select.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4800, ROOT = resolve('.');
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
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));

const probe = await page.evaluate(() => {
  const grid = document.querySelector('.character-select-grid');
  if (!grid) return { err: 'grid not found' };
  const headers = [...grid.querySelectorAll('.char-select-family-header')];
  const cards = [...grid.querySelectorAll('.char-select-card')];

  // Walk DOM order: each header should be immediately followed by its 6 family cards.
  const order = [];
  const ids = [];
  for (const child of grid.children) {
    if (child.classList.contains('char-select-family-header')) {
      order.push({ kind: 'header', text: child.querySelector('div')?.textContent });
    } else if (child.dataset && child.dataset.charClass) {
      order.push({ kind: 'card', id: child.dataset.charClass });
      ids.push(child.dataset.charClass);
    }
  }

  // Family count: each header should be followed by 6 cards before the next header.
  const familyGroups = {};
  let currentFam = null;
  for (const item of order) {
    if (item.kind === 'header') currentFam = item.text;
    else if (currentFam) familyGroups[currentFam] = (familyGroups[currentFam] || 0) + 1;
  }

  return { headerCount: headers.length, cardCount: cards.length, ids, familyGroups, firstItems: order.slice(0, 4) };
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

let fails = 0;
console.log(`Family headers: ${probe.headerCount} (expected 8)`);
console.log(`Card count: ${probe.cardCount} (expected 48)`);
console.log(`First DOM items: ${JSON.stringify(probe.firstItems)}`);
console.log('Family groups:');
for (const [fam, n] of Object.entries(probe.familyGroups)) {
  console.log(`  ${fam.padEnd(15)} ${n}`);
  if (n !== 6) fails++;
}

if (probe.headerCount !== 8) fails++;
if (probe.cardCount !== 48) fails++;
if (probe.firstItems[0].kind !== 'header') fails++; // first item must be a header, not a card

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
