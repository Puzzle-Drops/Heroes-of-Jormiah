import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4787;
const ROOT = resolve('.');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
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
console.log(`http://127.0.0.1:${PORT}`);

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

const errors = [];
const warnings = [];
const logs = [];
page.on('console', msg => {
  const t = msg.type();
  const text = `[${t}] ${msg.text()}`;
  if (t === 'error') errors.push(text);
  else if (t === 'warning') warnings.push(text);
  else logs.push(text);
});
page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', req => errors.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`));
page.on('response', r => { if (r.status() === 404) errors.push(`[404] ${r.url()}`); });

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2', timeout: 15000 });
} catch (e) {
  console.error('NAV FAIL:', e.message);
}

await new Promise(r => setTimeout(r, 1500));

const probe = await page.evaluate(() => {
  return {
    title: document.title,
    hasGame: typeof window.Game !== 'undefined' || typeof Game !== 'undefined',
    hasCharacter: typeof Character !== 'undefined',
    hasItem: typeof Item !== 'undefined',
    selectOverlayVisible: !!document.getElementById('character-select-overlay'),
    canvasPresent: !!document.getElementById('dungeon-canvas'),
    bodyTextSample: document.body.innerText.slice(0, 200),
  };
});

console.log('\n=== PROBE ===');
console.log(JSON.stringify(probe, null, 2));
console.log(`\n=== ERRORS (${errors.length}) ===`);
errors.slice(0, 25).forEach(e => console.log(e));
console.log(`\n=== WARNINGS (${warnings.length}) ===`);
warnings.slice(0, 10).forEach(w => console.log(w));
console.log(`\n=== LOGS (${logs.length}) ===`);
logs.slice(0, 15).forEach(l => console.log(l));

await browser.close();
server.close();
process.exit(errors.length > 0 ? 1 : 0);
