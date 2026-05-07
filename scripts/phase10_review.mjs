// Phase 10: passive-tree data layer + per-class start nodes + allocation rules.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4797, ROOT = resolve('.');
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
  const PT = window.PASSIVE_TREE;
  const resolve = (n) => Function('return typeof '+n+'!=="undefined"?'+n+':null')();
  if (!PT) return { err: 'PASSIVE_TREE missing' };

  // Graph integrity: 41 nodes (root + 8×5), all reachable from root via edges.
  const reach = new Set([0]);
  let added = 1;
  while (added > 0) {
    added = 0;
    for (const [a, b] of PT.edges) {
      if (reach.has(a) && !reach.has(b)) { reach.add(b); added++; }
      if (reach.has(b) && !reach.has(a)) { reach.add(a); added++; }
    }
  }

  // Each family arm has 5 spine nodes (4 stat + 1 notable) + 1 keystone = 6 total.
  const familyStats = {};
  for (const fam of ['tank','fighter','healer','marksman','rogue','magician','mystic','farland']) {
    const start = PT.getStartNodeForFamily(fam);
    const armNodes = PT.nodes.filter(n => n.family === fam);
    const notables = armNodes.filter(n => n.kind === 'notable');
    const keystones = armNodes.filter(n => n.kind === 'keystone');
    familyStats[fam] = { start, armSize: armNodes.length, notables: notables.length, keystones: keystones.length };
  }

  // Construct a Tank, allocate the next node from its start, verify
  // skillPoints decrement and applyTreeBonuses ran.
  const Tank = resolve('Tank');
  const tank = new Tank();
  tank.skillPoints = 5;
  const startId = PT.getStartNodeForFamily('tank');
  const adj = PT.getNodesAdjacentTo(startId)
    .filter(id => id !== 0 && !tank.allocatedTreeNodes.has(id));
  const targetId = adj[0];

  const beforeAlloc = {
    pAtk: tank.skillTreePAtk || 0, pDef: tank.skillTreePDef || 0,
    sp: tank.skillPoints, allocSize: tank.allocatedTreeNodes.size,
  };
  const ok = tank.allocateTreeNode(targetId);
  const afterAlloc = {
    pAtk: tank.skillTreePAtk || 0, pDef: tank.skillTreePDef || 0,
    sp: tank.skillPoints, allocSize: tank.allocatedTreeNodes.size,
  };

  // Try allocating a non-adjacent node — must fail.
  const farId = PT.nodes.find(n => n.family === 'magician')?.id;
  const farOk = tank.allocateTreeNode(farId);

  // Refund: spent points come back, allocation collapses to start.
  const beforeRefund = { sp: tank.skillPoints, allocSize: tank.allocatedTreeNodes.size };
  tank.refundTree();
  const afterRefund = { sp: tank.skillPoints, allocSize: tank.allocatedTreeNodes.size };

  return {
    nodeCount: PT.nodes.length,
    edgeCount: PT.edges.length,
    reachableFromRoot: reach.size,
    familyStats,
    alloc: { ok, target: targetId, beforeAlloc, afterAlloc, farAllocAttempt: farOk },
    refund: { beforeRefund, afterRefund },
  };
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

console.log(`Tree: ${probe.nodeCount} nodes, ${probe.edgeCount} edges, ${probe.reachableFromRoot} reachable from root`);
console.log('Family arms:');
let famFails = 0;
for (const [fam, s] of Object.entries(probe.familyStats)) {
  const ok = s.armSize === 6 && s.notables === 1 && s.keystones === 1 && s.start > 0;
  if (!ok) famFails++;
  console.log(`  ${fam.padEnd(10)} start=${s.start} arm=${s.armSize} notables=${s.notables} keystones=${s.keystones} ${ok ? '' : 'FAIL'}`);
}

console.log('\nAllocation:');
console.log(`  before: SP=${probe.alloc.beforeAlloc.sp} allocSize=${probe.alloc.beforeAlloc.allocSize} pDef-bonus=${probe.alloc.beforeAlloc.pDef}`);
console.log(`  ok=${probe.alloc.ok} target=${probe.alloc.target}`);
console.log(`  after:  SP=${probe.alloc.afterAlloc.sp} allocSize=${probe.alloc.afterAlloc.allocSize} pDef-bonus=${probe.alloc.afterAlloc.pDef}`);
console.log(`  far-node allocation rejected: ${!probe.alloc.farAllocAttempt}`);

console.log('\nRefund:');
console.log(`  before refund: SP=${probe.refund.beforeRefund.sp} allocSize=${probe.refund.beforeRefund.allocSize}`);
console.log(`  after refund:  SP=${probe.refund.afterRefund.sp} allocSize=${probe.refund.afterRefund.allocSize}`);

let fails = famFails;
// Phase 10.x: 1 root + 8×6 spine+keystone + 8 bridges = 57 nodes.
if (probe.reachableFromRoot !== 57) fails++;
if (!probe.alloc.ok) fails++;
if (probe.alloc.beforeAlloc.sp - probe.alloc.afterAlloc.sp !== 1) fails++;
if (probe.alloc.afterAlloc.allocSize - probe.alloc.beforeAlloc.allocSize !== 1) fails++;
if (probe.alloc.farAllocAttempt) fails++; // far should be rejected
if (probe.refund.afterRefund.sp <= probe.refund.beforeRefund.sp) fails++;
if (probe.refund.afterRefund.allocSize > 2) fails++; // root + family start

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
