// Capture a screenshot of the new SVG passive-tree overlay.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4802, ROOT = resolve('.');
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
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));

await page.evaluate(() => {
  // Hide the char-select-overlay so the tree overlay is visible behind it.
  const sel = document.getElementById('character-select-overlay');
  if (sel) sel.style.display = 'none';
  const C = window.CLASS_CONSTRUCTORS;
  if (!C || !C.knight) return;
  const tank = new (C.knight)();
  tank.skillPoints = 8;
  // Pre-allocate a few nodes so we can show both allocated + allocatable states.
  const start = window.PASSIVE_TREE.getStartNodeForFamily('tank');
  tank.allocatedTreeNodes = new Set([start]);
  tank.allocateTreeNode(start + 1);
  tank.allocateTreeNode(start + 2);
  window.openPassiveTreeOverlay(tank);
});

await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: join(OUT, 'tree_overlay.png') });
console.log('saved tree_overlay.png');

await browser.close();
server.close();
