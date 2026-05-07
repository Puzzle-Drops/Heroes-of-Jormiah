// Phase 10.y: keystone behavioral effects.
// 4 keystones now have functional flags read by combat.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4805, ROOT = resolve('.');
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
  const C = window.CLASS_CONSTRUCTORS;
  if (!PT || !C) return { err: 'PT or CLASS_CONSTRUCTORS missing' };

  // Build a fighter (Berserker), allocate Resolute Technique keystone.
  // The keystone's id sits at the family's keystone position.
  function allocAlongFamily(unit, fam, includeKeystone) {
    unit.skillPoints = 100;
    const start = PT.getStartNodeForFamily(fam);
    // Walk straight down the spine from start to keystone.
    let id = start;
    while (true) {
      const adj = PT.getNodesAdjacentTo(id).filter(n => n !== 0 && !unit.allocatedTreeNodes.has(n));
      // Pick the family-arm successor (same family or the family's keystone).
      const next = adj.find(n => {
        const node = PT.getNodeById(n);
        return node && (node.family === fam);
      });
      if (!next) break;
      const ok = unit.allocateTreeNode(next);
      if (!ok) break;
      id = next;
      if (!includeKeystone && PT.getNodeById(next)?.kind === 'keystone') break;
    }
  }

  // Resolute Technique (Fighter): Berserker is fighter family.
  const berserker = new (C.berserker)();
  allocAlongFamily(berserker, 'fighter', true);
  const resoluteOk = berserker.keystone_cantCrit === true && berserker.keystone_allDamageMultiplier === 1.25;

  // Mind Over Matter (Healer): Cleric.
  const cleric = new (C.cleric)();
  allocAlongFamily(cleric, 'healer', true);
  const mindOk = cleric.keystone_mpAbsorbsDamageFraction === 0.30;
  // Functional check: damage routes through MP.
  cleric.hp = 1000; cleric.maxHp = 1000;
  cleric.mana = 100;
  cleric.takeDamage(100); // 30% (30) goes to MP, 70 to HP
  const mindFunctional = cleric.mana < 100 && cleric.hp < 1000;

  // Hunter's Mark (Marksman): Crossbowman.
  const cbm = new (C.crossbowman)();
  allocAlongFamily(cbm, 'marksman', true);
  const huntOk = cbm.keystone_firstHitMultiplier === 1.5 && !!cbm._hunterMarkHits;

  // From Beyond (Far Lands): Voidcaller.
  const vc = new (C.voidcaller)();
  allocAlongFamily(vc, 'farland', true);
  const fbOk = vc.keystone_onKillRandomBuff === true;

  // Refund test: keystones cleared after refund.
  vc.refundTree();
  const refundCleared = vc.keystone_onKillRandomBuff === false;

  return {
    resoluteOk, mindOk, mindFunctional, huntOk, fbOk, refundCleared,
    sample: { mana: cleric.mana, hp: cleric.hp },
  };
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

let fails = 0;
function check(label, ok) { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) fails++; }

check('Resolute Technique → cantCrit + dmg×1.25 flag set', probe.resoluteOk);
check('Mind Over Matter → mpAbsorbsDamageFraction = 0.30',  probe.mindOk);
check('Mind Over Matter functional in takeDamage',          probe.mindFunctional);
console.log(`    cleric after 100 dmg: hp=${probe.sample.hp} mp=${probe.sample.mana}`);
check("Hunter's Mark → firstHitMultiplier 1.5 + tracker",   probe.huntOk);
check('From Beyond → onKillRandomBuff flag set',            probe.fbOk);
check('Refund clears keystone flags',                       probe.refundCleared);

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
