// Phase 10.x: 8 keystones + 8 cross-arm bridges + SVG visualiser.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4801, ROOT = resolve('.');
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
  const PT = window.PASSIVE_TREE;
  if (!PT) return { err: 'PASSIVE_TREE missing' };

  const keystones = PT.nodes.filter(n => n.kind === 'keystone');
  const bridges   = PT.nodes.filter(n => n.kind === 'bridge');

  // Each family has exactly one keystone with bonuses + description.
  const ksByFamily = {};
  for (const ks of keystones) ksByFamily[ks.family] = ks;

  // Bridge connectivity: each bridge has edges to the notables of its 2 families.
  const bridgeChecks = bridges.map(b => {
    const adj = PT.getNodesAdjacentTo(b.id);
    const linksToA = adj.includes(PT.familyNotable[b.bridgeBetween[0]]);
    const linksToB = adj.includes(PT.familyNotable[b.bridgeBetween[1]]);
    return { id: b.id, fams: b.bridgeBetween, linksToA, linksToB };
  });

  // Visualiser exists.
  const hasOpener = typeof window.openPassiveTreeOverlay === 'function';

  // Open the visualiser for a fresh Tank and verify SVG is rendered.
  const C = window.CLASS_CONSTRUCTORS;
  const tank = new (C.knight)();
  tank.skillPoints = 5;
  if (hasOpener) window.openPassiveTreeOverlay(tank);
  const overlay = document.getElementById('gdd-tree-overlay');
  let nodeCount = 0, edgeCount = 0;
  if (overlay) {
    const svg = overlay.querySelector('svg');
    if (svg) {
      nodeCount = svg.querySelectorAll('circle, polygon').length;
      edgeCount = svg.querySelectorAll('line').length;
    }
  }

  return {
    keystoneCount: keystones.length,
    bridgeCount: bridges.length,
    ksNames: keystones.map(k => `${k.family}: ${k.name}`),
    ksWithDescriptions: keystones.filter(k => k.description).length,
    bridgeChecks,
    hasOpener,
    overlayPresent: !!overlay,
    nodeCount, edgeCount,
  };
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

let fails = 0;
console.log(`Keystones: ${probe.keystoneCount} (expected 8)`);
probe.ksNames.forEach(n => console.log('  ' + n));
console.log(`Keystones with descriptions: ${probe.ksWithDescriptions}/${probe.keystoneCount}`);

console.log(`\nBridges: ${probe.bridgeCount} (expected 8)`);
for (const b of probe.bridgeChecks) {
  const ok = b.linksToA && b.linksToB;
  console.log(`  ${b.fams.join(' ↔ ')}  ${ok ? 'connected' : 'BROKEN'}`);
  if (!ok) fails++;
}

console.log(`\nVisualiser:`);
console.log(`  openPassiveTreeOverlay defined: ${probe.hasOpener}`);
console.log(`  overlay rendered: ${probe.overlayPresent}`);
console.log(`  SVG nodes drawn: ${probe.nodeCount}`);
console.log(`  SVG edges drawn: ${probe.edgeCount}`);

if (probe.keystoneCount !== 8) fails++;
if (probe.ksWithDescriptions !== 8) fails++;
if (probe.bridgeCount !== 8) fails++;
if (!probe.hasOpener) fails++;
if (!probe.overlayPresent) fails++;
if (probe.nodeCount < 50) fails++; // 56 non-root nodes expected
if (probe.edgeCount < 50) fails++; // 64 edges total

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
