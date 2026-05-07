// Phase 2 visual review: capture three screenshots (initial select, hub, in-dungeon)
// + verify no "Everfall|EVERFALL|Stoneforge|Umbral Depths" strings appear visibly.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4789;
const ROOT = resolve('.');
const OUT = resolve('scripts/.review');
mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
};
const server = createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = join(ROOT, urlPath);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(PORT, r));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2', timeout: 15000 });
await new Promise(r => setTimeout(r, 1000));

// 1. Character select screen
await page.screenshot({ path: join(OUT, '1_select.png') });

// Pick party
for (const cls of ['tank', 'paladin', 'rogue', 'healer', 'mage', 'archer']) {
  await page.click(`[data-char-class="${cls}"]`);
  await new Promise(r => setTimeout(r, 80));
}
await page.click('#start-adventure-btn');
await new Promise(r => setTimeout(r, 1200));

// 2. Hub / dungeon selector
await page.screenshot({ path: join(OUT, '2_hub.png') });

// Sweep visible body text for any banned strings
const banned = ['Everfall', 'EVERFALL', 'Stoneforge', 'Umbral Depths', 'Idle Dungeon RPG'];
const sweep = await page.evaluate((banned) => {
  const text = document.body.innerText;
  return banned
    .map(s => ({ s, count: (text.match(new RegExp(s, 'g')) || []).length }))
    .filter(x => x.count > 0);
}, banned);

// Enter dungeon
await page.evaluate(() => {
  const all = [...document.querySelectorAll('[data-dungeon="everfall"]')];
  const visible = all.find(el => el.offsetParent !== null);
  (visible || all[0])?.click();
});
await new Promise(r => setTimeout(r, 2000));

// 3. In-dungeon
await page.screenshot({ path: join(OUT, '3_dungeon.png') });

const sweepDungeon = await page.evaluate((banned) => {
  const text = document.body.innerText;
  return banned
    .map(s => ({ s, count: (text.match(new RegExp(s, 'g')) || []).length }))
    .filter(x => x.count > 0);
}, banned);

console.log('Hub leftover banned strings:', JSON.stringify(sweep));
console.log('Dungeon leftover banned strings:', JSON.stringify(sweepDungeon));
console.log(`Screenshots: ${OUT}`);

await browser.close();
server.close();
const fail = sweep.length > 0 || sweepDungeon.length > 0;
process.exit(fail ? 1 : 0);
