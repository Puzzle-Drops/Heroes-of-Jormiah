// Phase 8.x: stone-driven cooldown / mana / endpoint interpolation
// per GDD §7.3.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4799, ROOT = resolve('.');
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
  const resolve = (n) => Function('return typeof '+n+'!=="undefined"?'+n+':null')();
  // Use the registry-built knight (not the bespoke Tank) so the new
  // endpoint interpolation actually drives its useSkill.
  const C = resolve('CLASS_CONSTRUCTORS');
  if (!C || !C.knight) return { err: 'CLASS_CONSTRUCTORS.knight missing' };

  // L1 stones: implicit-cooldown should give 2.25× baseCooldown for
  // abilities without explicit endpoints; for Knight Provoke the
  // explicit endpoints make L1 = 18.
  const knight = new (C.knight)();
  const l1Cd = knight._abilityParam('spell1', 'cooldown', 14);
  const l1Mana = knight._abilityParam('spell1', 'manaCost', 25);
  const l1PDefBuff = knight._abilityParam('spell1', 'pDefBuffPct', 0);
  const l1TauntDur = knight._abilityParam('spell1', 'tauntDuration', 0);

  // Bump the spell1 stone to L100 and re-read.
  if (knight.equipment.spell1Stone) knight.equipment.spell1Stone.stoneLevel = 100;
  const l100Cd = knight._abilityParam('spell1', 'cooldown', 14);
  const l100Mana = knight._abilityParam('spell1', 'manaCost', 25);
  const l100PDefBuff = knight._abilityParam('spell1', 'pDefBuffPct', 0);
  const l100TauntDur = knight._abilityParam('spell1', 'tauntDuration', 0);

  // Bump to L50 (mid) and verify mid-interpolation.
  knight.equipment.spell1Stone.stoneLevel = 50;
  const l50Cd = knight._abilityParam('spell1', 'cooldown', 14);
  const l50PDefBuff = knight._abilityParam('spell1', 'pDefBuffPct', 0);

  // Implicit cooldown for an ability without endpoints (use Mage Fireball).
  const mage = new (C.arcanist)();
  const fireballL1 = mage._abilityParam('spell1', 'cooldown', 14);
  if (mage.equipment.spell1Stone) mage.equipment.spell1Stone.stoneLevel = 100;
  const fireballL100 = mage._abilityParam('spell1', 'cooldown', 14);

  return {
    knightProvoke: { l1Cd, l1Mana, l1PDefBuff, l1TauntDur, l50Cd, l50PDefBuff, l100Cd, l100Mana, l100PDefBuff, l100TauntDur },
    mageFireballImplicit: { fireballL1, fireballL100, baseCD: mage.gddAbilities.spell1.baseCooldown },
  };
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

const k = probe.knightProvoke;
console.log('Knight Provoke (explicit endpoints):');
console.log(`  L1   cd=${k.l1Cd}  mana=${k.l1Mana}  pDefBuff=${k.l1PDefBuff}%  tauntDur=${k.l1TauntDur}s   (GDD: 18 / 30 / 15 / 3)`);
console.log(`  L50  cd=${k.l50Cd.toFixed(2)}  pDefBuff=${k.l50PDefBuff.toFixed(1)}%   (mid)`);
console.log(`  L100 cd=${k.l100Cd}  mana=${k.l100Mana}  pDefBuff=${k.l100PDefBuff}%  tauntDur=${k.l100TauntDur}s  (GDD: 8 / 30 / 60 / 6)`);

let fails = 0;
function check(label, ok) { if (!ok) { console.log(`  FAIL ${label}`); fails++; } }
check('L1 cd=18',          k.l1Cd === 18);
check('L1 mana=30',        k.l1Mana === 30);
check('L1 pDefBuff=15',    k.l1PDefBuff === 15);
check('L1 tauntDur=3',     k.l1TauntDur === 3);
check('L100 cd=8',         k.l100Cd === 8);
check('L100 mana=30',      k.l100Mana === 30);
check('L100 pDefBuff=60',  k.l100PDefBuff === 60);
check('L100 tauntDur=6',   k.l100TauntDur === 6);
// L50 is roughly midpoint (49/99 ≈ 0.495).
const expectedL50Cd = 18 + (8 - 18) * (49/99);
check('L50 cd ≈ midpoint',   Math.abs(k.l50Cd - expectedL50Cd) < 0.1);

const m = probe.mageFireballImplicit;
console.log(`\nMage Fireball (implicit-cd default, base=${m.baseCD}s):`);
console.log(`  L1  cd=${m.fireballL1.toFixed(2)} (expect ${(m.baseCD*2.25).toFixed(2)}, 2.25× base)`);
console.log(`  L100 cd=${m.fireballL100.toFixed(2)} (expect ${m.baseCD.toFixed(2)}, 1.0× base)`);
check('Mage L1 cd ≈ 2.25× base',   Math.abs(m.fireballL1  - m.baseCD * 2.25) < 0.01);
check('Mage L100 cd ≈ 1.0× base',  Math.abs(m.fireballL100 - m.baseCD)        < 0.01);

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
