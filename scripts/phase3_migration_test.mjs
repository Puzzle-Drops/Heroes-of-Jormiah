// Verify Phase 3 4-party → 6-party migration:
// 1. Pre-populate localStorage with a 4-element selectedParty
// 2. Reload the page
// 3. Confirm migration triggers character-select with 4 filled + 2 empty slots
// 4. Fill the 2 empty slots, verify game starts with 6-member party

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4790;
const ROOT = resolve('.');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
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

// First load — write old 4-party save into localStorage
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => {
  // Old-shape selectedParty: 4 entries, slots 0/1 = Front, 2/3 = Back
  localStorage.setItem('selectedParty', JSON.stringify(['tank', 'paladin', 'mage', 'archer']));
});

// Reload to trigger the migration path
await page.reload({ waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 800));

const stage1 = await page.evaluate(() => {
  const slots = [...document.querySelectorAll('.party-slot')].map(s => ({
    label: s.querySelector('.slot-number')?.textContent?.trim(),
    filledName: s.querySelector('.slot-name')?.textContent?.trim(),
    isFilled: s.classList.contains('filled'),
  }));
  return {
    storedParty: JSON.parse(localStorage.getItem('selectedParty') || 'null'),
    selectVisible: !document.getElementById('character-select-overlay').classList.contains('hidden'),
    slotCount: slots.length,
    slots,
    startBtn: document.getElementById('start-adventure-btn')?.textContent?.trim(),
  };
});

console.log('After migration:');
console.log('  storedParty:', JSON.stringify(stage1.storedParty));
console.log('  selectVisible:', stage1.selectVisible);
console.log('  slotCount:', stage1.slotCount);
console.log('  startBtn:', stage1.startBtn);
console.log('  filled slots:');
stage1.slots.forEach((s, i) => console.log(`    [${i}] ${s.label}: ${s.isFilled ? s.filledName : '(empty)'}`));

// Fill the 2 empty slots and start
await page.click(`[data-char-class="rogue"]`);
await new Promise(r => setTimeout(r, 100));
await page.click(`[data-char-class="healer"]`);
await new Promise(r => setTimeout(r, 200));
await page.click('#start-adventure-btn');
await new Promise(r => setTimeout(r, 1500));

const stage2 = await page.evaluate(() => ({
  storedParty: JSON.parse(localStorage.getItem('selectedParty') || 'null'),
  partyClasses: (window.game?.party || []).map(c => c.className),
  partyLength: (window.game?.party || []).length,
}));

console.log('\nAfter fill + start:');
console.log('  storedParty:', JSON.stringify(stage2.storedParty));
console.log('  partyClasses:', JSON.stringify(stage2.partyClasses));
console.log('  partyLength:', stage2.partyLength);

await browser.close();
server.close();

const expectedShape = ['tank', 'paladin', null, 'mage', 'archer', null];
const matched = JSON.stringify(stage1.storedParty) === JSON.stringify(expectedShape);
const partyOk = stage2.partyLength === 6 && stage2.storedParty.every(c => c !== null);

console.log(`\nMigration shape: ${matched ? 'PASS' : 'FAIL'} (expected ${JSON.stringify(expectedShape)})`);
console.log(`Final party valid: ${partyOk ? 'PASS' : 'FAIL'}`);
console.log(`Errors: ${errors.length}`);
errors.forEach(e => console.log(`  ${e}`));

process.exit(matched && partyOk && errors.length === 0 ? 0 : 1);
