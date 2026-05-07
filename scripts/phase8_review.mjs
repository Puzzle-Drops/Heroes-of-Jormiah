// Phase 8: each class auto-equips 4 stones (one per ability slot) at L1.
// Empty stone slot = dead ability per GDD §7.1: removing the attackStone
// from a Tank should produce 0 basic-attack damage.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4795, ROOT = resolve('.');
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
  const resolve = (n) => Function('return typeof '+n+'!=="undefined"?'+n+':null')();
  const out = {};
  for (const cls of ['Tank','Rogue','Mage','Healer','Archer','Paladin']) {
    const C = resolve(cls);
    if (!C) { out[cls] = { missing: true }; continue; }
    const inst = new C();
    const eq = inst.equipment || {};
    out[cls] = {
      attackStone:  eq.attackStone  ? { name: eq.attackStone.name,  level: eq.attackStone.stoneLevel,  ability: eq.attackStone.abilityName } : null,
      spell1Stone:  eq.spell1Stone  ? { name: eq.spell1Stone.name,  level: eq.spell1Stone.stoneLevel,  ability: eq.spell1Stone.abilityName } : null,
      spell2Stone:  eq.spell2Stone  ? { name: eq.spell2Stone.name,  level: eq.spell2Stone.stoneLevel,  ability: eq.spell2Stone.abilityName } : null,
      passiveStone: eq.passiveStone ? { name: eq.passiveStone.name, level: eq.passiveStone.stoneLevel, ability: eq.passiveStone.abilityName } : null,
      stoneFactor_attack_L1: inst._stoneFactor('attack'),
    };
  }

  // Drop test: removing the attackStone should make _stoneFactor('attack')=0,
  // so the combat pipeline produces 0 damage on basic attack.
  const T = new (resolve('Tank'))();
  T.equipment.attackStone = null;
  out.tankDeadSlot = {
    factorAfterRemove: T._stoneFactor('attack'),
  };

  // Generate a high-level stone and verify scaling factor approaches 1.
  const Stone = resolve('Stone');
  const s = new Stone('attack', 100, 'tank', 'shield_bash', 'Shield Bash', 'physical');
  out.l100Stone = {
    name: s.name,
    rarity: s.rarity,
    scalingFactor: s.scalingFactor,
    namesake: s.namesake,
    pAtk: s.pAtk,
  };

  return out;
});

await browser.close();
server.close();

let fails = 0;
for (const [cls, p] of Object.entries(probe)) {
  if (cls === 'tankDeadSlot' || cls === 'l100Stone') continue;
  console.log(`${cls}:`);
  for (const slot of ['attackStone','spell1Stone','spell2Stone','passiveStone']) {
    const s = p[slot];
    if (!s) { console.log(`  ${slot.padEnd(13)} MISSING`); fails++; continue; }
    console.log(`  ${slot.padEnd(13)} L${s.level} ${s.ability ?? '?'} — ${s.name}`);
  }
}

console.log(`\nDead-slot test: Tank.attackStone=null → factor=${probe.tankDeadSlot.factorAfterRemove}`);
if (probe.tankDeadSlot.factorAfterRemove !== 0) { fails++; console.log('  FAIL: factor should be 0'); }

console.log(`\nL100 stone: ${probe.l100Stone.name}`);
console.log(`  scalingFactor=${probe.l100Stone.scalingFactor}, namesake=${probe.l100Stone.namesake}, pAtk=${probe.l100Stone.pAtk}, rarity=${probe.l100Stone.rarity}`);
if (probe.l100Stone.scalingFactor !== 1) { fails++; console.log('  FAIL: L100 scalingFactor should be 1'); }
if (probe.l100Stone.pAtk < 0 || probe.l100Stone.pAtk > 200) { fails++; console.log('  FAIL: pAtk roll out of range [0, 200]'); }

console.log(`\nResult: ${fails === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 ? 0 : 1);
