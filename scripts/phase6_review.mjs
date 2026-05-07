// Phase 6: each dungeon loot pool matches GDD §10.1 specialty.
//   stoneforge (Iron Vaults)        → armor only
//   umbral     (Whispering Spires)  → jewelry only
//   everfall   (Hollowed Wilds)     → weapons only
//   vault                            → unrestricted (special)

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4793, ROOT = resolve('.');
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
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));

const probe = await page.evaluate(() => {
  // Pick a 6-hero party and start the game so window.game.dungeonLootTables exists.
  for (const cls of ['tank','paladin','rogue','healer','mage','archer']) {
    document.querySelector(`[data-char-class="${cls}"]`)?.click();
  }
  document.getElementById('start-adventure-btn')?.click();
  return new Promise(resolve => setTimeout(() => resolve({
    tables: window.game?.dungeonLootTables ?? null,
  }), 400));
});

await browser.close();
server.close();

console.log('Loot tables:');
console.log(JSON.stringify(probe.tables, null, 2));

const ARMOR  = new Set(['helmet','chest','gloves','belt','boots']);
const JEWEL  = new Set(['amulet','ring','ring1','ring2']);
const WEAPON = new Set(['wand','dagger','greatsword','staff','bow','warhammer']);

const checks = [
  ['stoneforge', 'armor',   probe.tables.stoneforge.every(t => ARMOR.has(t))],
  ['umbral',     'jewelry', probe.tables.umbral.every(t => JEWEL.has(t))],
  ['everfall',   'weapons', probe.tables.everfall.every(t => WEAPON.has(t))],
];

let fails = 0;
for (const [dungeon, expected, ok] of checks) {
  console.log(`  ${dungeon.padEnd(11)} (${expected.padEnd(8)}) ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) fails++;
}
process.exit(fails === 0 ? 0 : 1);
