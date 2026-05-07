// Phase 9.y: roster browser overlay opens, renders 48 cards in 8 family
// sections, screenshot for visual confirmation.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4804, ROOT = resolve('.');
const OUT = resolve('scripts/.review');
mkdirSync(OUT, { recursive: true });

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
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));

const probe = await page.evaluate(() => {
  const sel = document.getElementById('character-select-overlay');
  if (sel) sel.style.display = 'none';

  const opener = typeof window.openRosterBrowser === 'function';
  if (opener) window.openRosterBrowser();
  const overlay = document.getElementById('roster-browser-overlay');
  if (!overlay) return { opener, overlayPresent: false };

  const cards = overlay.querySelectorAll('.roster-card');
  const sections = [...overlay.querySelectorAll('div')].filter(d =>
    d.style && d.style.fontFamily && d.style.fontFamily.includes('Orbitron') &&
    d.style.borderBottom && d.textContent.match(/^[A-Z ]+$/)
  );
  return {
    opener,
    overlayPresent: true,
    cardCount: cards.length,
    sectionCount: sections.length,
    sectionLabels: sections.map(s => s.textContent.trim()),
    closeBtnPresent: !!overlay.querySelector('#roster-close'),
  };
});

await page.screenshot({ path: join(OUT, 'roster_browser.png') });

await browser.close();
server.close();

let fails = 0;
function check(label, ok) { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) fails++; }

console.log(`opener defined: ${probe.opener}`);
console.log(`overlay rendered: ${probe.overlayPresent}`);
console.log(`card count: ${probe.cardCount}`);
console.log(`section count: ${probe.sectionCount}`);
console.log(`section labels: ${(probe.sectionLabels || []).join(', ')}`);

check('opener exists', probe.opener);
check('overlay rendered', probe.overlayPresent);
check('48 cards present', probe.cardCount === 48);
check('8 family section headers', probe.sectionCount === 8);
check('close button present', probe.closeBtnPresent);

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`Screenshot: ${join(OUT, 'roster_browser.png')}`);
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
