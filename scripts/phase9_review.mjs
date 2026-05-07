// Phase 9: 48-class registry exposed, all 48 cards in character-select,
// each registry entry has 4-slot abilities populated, every constructor
// resolves to a working subclass that auto-equips starter stones.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4796, ROOT = resolve('.');
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
await new Promise(r => setTimeout(r, 800));

const probe = await page.evaluate(() => {
  const reg = window.CLASS_REGISTRY || [];
  const ctors = window.CLASS_CONSTRUCTORS || {};
  const cardCount = document.querySelectorAll('.char-select-card').length;
  const familyCounts = {};
  const issues = [];
  const built = {};

  for (const entry of reg) {
    familyCounts[entry.family] = (familyCounts[entry.family] || 0) + 1;
    if (!entry.abilities || !entry.abilities.attack || !entry.abilities.spell1 ||
        !entry.abilities.spell2 || !entry.abilities.passive) {
      issues.push(`${entry.id}: missing one of the 4 ability slots`);
    }
    const C = ctors[entry.id];
    if (!C) { issues.push(`${entry.id}: no constructor in CLASS_CONSTRUCTORS`); continue; }
    try {
      const inst = new C();
      built[entry.id] = {
        cls: inst.className,
        pAtk: inst.pAtk, mAtk: inst.mAtk, pDef: inst.pDef, mDef: inst.mDef,
        damageType: inst.damageType,
        atkStone: !!inst.equipment?.attackStone,
        sp1Stone: !!inst.equipment?.spell1Stone,
        sp2Stone: !!inst.equipment?.spell2Stone,
        passStone: !!inst.equipment?.passiveStone,
      };
      if (!inst.gddAbilities) issues.push(`${entry.id}: instance missing gddAbilities`);
      if (!inst.equipment.attackStone)  issues.push(`${entry.id}: attackStone not auto-equipped`);
      if (!inst.equipment.spell1Stone)  issues.push(`${entry.id}: spell1Stone not auto-equipped`);
      if (!inst.equipment.spell2Stone)  issues.push(`${entry.id}: spell2Stone not auto-equipped`);
      if (!inst.equipment.passiveStone) issues.push(`${entry.id}: passiveStone not auto-equipped`);
    } catch (e) { issues.push(`${entry.id}: constructor threw — ${e.message}`); }
  }

  return {
    rosterSize: reg.length,
    cardCount,
    familyCounts,
    constructorCount: Object.keys(ctors).length,
    issues,
    sampleBuilt: built,
  };
});

await browser.close();
server.close();

console.log(`Registry size: ${probe.rosterSize} (expected 48)`);
console.log(`Character-select cards rendered: ${probe.cardCount} (expected 48)`);
console.log(`Constructor lookup entries: ${probe.constructorCount}`);
console.log(`Family distribution:`, JSON.stringify(probe.familyCounts));
const families = ['tank','fighter','healer','marksman','rogue','magician','mystic','farland'];
let famFails = 0;
for (const f of families) {
  if ((probe.familyCounts[f] || 0) !== 6) {
    console.log(`  FAIL: ${f} expected 6, got ${probe.familyCounts[f]}`);
    famFails++;
  }
}

console.log(`\nIssues: ${probe.issues.length}`);
probe.issues.slice(0, 10).forEach(s => console.log('  ' + s));

const sample = ['knight','reaper','chronomancer','bard','beastmaster'];
console.log('\nSample instantiations:');
for (const id of sample) {
  const b = probe.sampleBuilt[id];
  if (!b) { console.log(`  ${id}: not built`); continue; }
  console.log(`  ${id.padEnd(12)} pAtk=${b.pAtk} mAtk=${b.mAtk} pDef=${b.pDef} mDef=${b.mDef} type=${b.damageType.padEnd(8)} stones=${[b.atkStone,b.sp1Stone,b.sp2Stone,b.passStone].join('/')}`);
}

console.log(`\nPage errors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));

const fails = probe.issues.length + famFails + errors.length
  + (probe.rosterSize !== 48 ? 1 : 0)
  + (probe.cardCount !== 48 ? 1 : 0);
console.log(`\nResult: ${fails === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 ? 0 : 1);
