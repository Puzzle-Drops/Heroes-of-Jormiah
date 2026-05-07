// Phase 7.zz: every starter's useSkill goes through _fireBespoke.
// Tests preserve the rune-tier scaling math AND the cross-cutting
// concerns (Spell Echo doubles fire, Totemic Will extends timers).

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4808, ROOT = resolve('.');
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
  const C = window.CLASS_CONSTRUCTORS;
  if (!C) return { err: 'CLASS_CONSTRUCTORS missing' };
  const realGame = window.game;
  function withFakeGame(party, run) {
    window.game = {
      party,
      enemies: [],
      equippedRunes: { tank: [], healer: [], mage: [], rogue: [], archer: [], paladin: [] },
      characterStats: {},
      addLog: () => {},
    };
    try { return run(); } finally { window.game = realGame; }
  }

  // Each starter's useSkill returns a value reflecting their rune-scaled
  // math at tier 0 (no rune). Compare to the GDD-spec defaults.
  const tank = new (C.knight)();      tank.mana = 100;
  const rogue = new (C.assassin)();   rogue.mana = 100;
  const mage = new (C.arcanist)();    mage.mana = 100;
  const healer = new (C.cleric)();    healer.mana = 100;
  const archer = new (C.archer)();    archer.mana = 100;
  const paladin = new (C.paladin)();  paladin.mana = 100;

  const tankRet = withFakeGame([tank], () => tank.useSkill());
  const rogueRet = withFakeGame([rogue], () => rogue.useSkill({hp:100, takeDamage(){return 1}}));
  const mageRet = withFakeGame([mage], () => mage.useSkill([]));
  const healerTarget = { getTotalMaxHp() { return 1000; }, heal(){return 1} };
  const healerRet = withFakeGame([healer], () => healer.useSkill(healerTarget));
  const archerRet = withFakeGame([archer], () => archer.useSkill([]));
  // Paladin's shield needs party.
  const paladinRet = withFakeGame([paladin], () => paladin.useSkill());

  // Tank Taunt: returns 0, sets tauntTimer = 300.
  // Rogue Double Strike: returns getTotalAttack() × 1.5 (tier 0).
  // Mage Fireball: returns getTotalAttack() × 0.8.
  // Healer Heal: returns 0.05 × 1000 + 0 + 10 = 60 (with bonusMana=0).
  // Archer Multi-Shot: returns getTotalAttack() × 0.7 × 3.
  // Paladin Divine Shield: returns 0; sets shieldAmount on each party member.

  const expectedRogue = rogue.getTotalAttack() * 1.5;
  const expectedMage  = mage.getTotalAttack() * 0.8;
  const expectedArcher = archer.getTotalAttack() * 0.7 * 3;
  // bonusMana = max(0, healer.maxMana - 80) = 0 for a fresh Healer (maxMana=80).
  const healerBonusMana = Math.max(0, healer.maxMana - 80);
  const expectedHealer = 1000 * 0.05 + healerBonusMana * 0.4 + 10;

  // Spell Echo on Mage: when set, spell fires twice. Reset and re-test.
  const mage2 = new (C.arcanist)();
  mage2.mana = 200;
  mage2.keystone_spellEcho = true;
  const mageEchoRet = withFakeGame([mage2], () => mage2.useSkill([]));
  // Echo doubles damage AND charges 1.5× mana.
  const mageManaSpentEcho = 200 - mage2.mana;

  // Totemic Will on Tank: tauntTimer extends from 300 to 450.
  const tank2 = new (C.knight)();
  tank2.mana = 100;
  tank2.keystone_totemicWill = true;
  withFakeGame([tank2], () => tank2.useSkill());
  const tank2Timer = tank2.tauntTimer;

  return {
    tankRet, tankTimer: tank.tauntTimer,
    rogueRet, expectedRogue,
    mageRet, expectedMage,
    healerRet, expectedHealer, healerBonus: healerBonusMana,
    archerRet, expectedArcher,
    paladinRet, paladinShield: paladin.shieldAmount, paladinPartyShield: paladin === null ? null : paladin.shieldAmount,
    mageEchoRet, expectedMageEcho: mage2.getTotalAttack() * 0.8 * 2,
    mageManaSpentEcho,
    tank2Timer,
  };
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

let fails = 0;
function check(label, ok) { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) fails++; }

console.log('Tank Taunt (rune tier 0):');
check('  returns 0',                              probe.tankRet === 0);
check('  tauntTimer set to 300',                  probe.tankTimer === 300);

console.log('\nRogue Double Strike (rune tier 0):');
check(`  returns getTotalAttack × 1.5`,           Math.abs(probe.rogueRet - probe.expectedRogue) < 0.01);
console.log(`    actual=${probe.rogueRet} expected=${probe.expectedRogue}`);

console.log('\nMage Fireball (rune tier 0):');
check(`  returns getTotalAttack × 0.8`,           Math.abs(probe.mageRet - probe.expectedMage) < 0.01);
console.log(`    actual=${probe.mageRet} expected=${probe.expectedMage}`);

console.log('\nHealer Greater Heal (rune tier 0, target maxHp=1000):');
console.log(`    bonusMana=${probe.healerBonus}, expected = 5%×1000 + ${probe.healerBonus}×0.4 + 10 = ${probe.expectedHealer}`);
check(`  matches formula`,                        Math.abs(probe.healerRet - probe.expectedHealer) < 0.01);
console.log(`    actual=${probe.healerRet}`);

console.log('\nArcher Multi-Shot (rune tier 0):');
check(`  returns getTotalAttack × 0.7 × 3`,        Math.abs(probe.archerRet - probe.expectedArcher) < 0.01);
console.log(`    actual=${probe.archerRet} expected=${probe.expectedArcher}`);

console.log('\nPaladin Divine Shield (rune tier 0):');
check('  returns 0',                              probe.paladinRet === 0);
check('  shieldAmount set on caster',             probe.paladinShield > 0);

console.log('\nSpell Echo on Mage:');
check('  damage dealt twice (×2 of single)',      Math.abs(probe.mageEchoRet - probe.expectedMageEcho) < 0.01);
check('  mana spent ×1.5 (>= 30)',                probe.mageManaSpentEcho >= 30);
console.log(`    damage=${probe.mageEchoRet} expected=${probe.expectedMageEcho}, mana=${probe.mageManaSpentEcho}`);

console.log('\nTotemic Will on Tank:');
check('  tauntTimer extends 300 → 450',           probe.tank2Timer === 450);

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
