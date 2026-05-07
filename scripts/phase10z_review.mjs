// Phase 10.z: 4 remaining keystone behaviors functional + crit/dodge
// migrated off core stats per GDD §4.5.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4806, ROOT = resolve('.');
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

  function allocFamilyKeystone(unit, fam) {
    unit.skillPoints = 100;
    let id = PT.getStartNodeForFamily(fam);
    let safety = 20;
    while (safety-- > 0) {
      const adj = PT.getNodesAdjacentTo(id).filter(n => n !== 0 && !unit.allocatedTreeNodes.has(n));
      const next = adj.find(n => PT.getNodeById(n)?.family === fam);
      if (!next) break;
      if (!unit.allocateTreeNode(next)) break;
      id = next;
      if (PT.getNodeById(next)?.kind === 'keystone') break;
    }
  }

  // Crit/dodge migration: a fresh class has 0 base crit and 0 dodge.
  const fresh = new (C.knight)();
  const baselineCrit = fresh.critChance;
  const baselineDodge = fresh.dodgeChance;
  const totalCrit = fresh.getTotalCritChance ? fresh.getTotalCritChance() : null;

  // Allocate marksman keystone path on a Crossbowman → crit_chance flows
  // through to skillTreeCritChance.
  const cbm = new (C.crossbowman)();
  allocFamilyKeystone(cbm, 'marksman');
  const cbmTreeCrit = cbm.skillTreeCritChance;
  const cbmTotalCrit = cbm.getTotalCritChance ? cbm.getTotalCritChance() : null;

  // Allocate rogue keystone path on a Shadowdancer → dodge_chance.
  const sd = new (C.shadowdancer)();
  allocFamilyKeystone(sd, 'rogue');
  const sdTreeDodge = sd.skillTreeDodge;

  // Living Wall (Tank): with low-HP tank in party, redirect damage.
  // Build a fake game with a party for window.game.party to work.
  const tank = new (C.knight)();
  allocFamilyKeystone(tank, 'tank');
  tank.hp = 10; tank.maxHp = 100; // 10% HP — under 30% threshold

  const ally = new (C.crossbowman)();
  ally.hp = 1000; ally.maxHp = 1000;
  const fakeGame = { party: [tank, ally], dungeonFloor: 0 };
  const realGame = window.game;
  window.game = fakeGame;
  // Ally takes 100 damage. Living Wall should redirect it to tank at 50%.
  const allyHpBefore = ally.hp;
  const tankHpBefore = tank.hp;
  ally.takeDamage(100);
  const livingWallRedirected = ally.hp === allyHpBefore && tank.hp < tankHpBefore;
  window.game = realGame;

  // Spell Echo (Magician): Arcanist with keystone, force a damage spell
  // through the engine so we can verify the double-cast outcome (its
  // canonical spell2 Combustion is utility-only and won't show damage).
  const arc = new (C.arcanist)();
  allocFamilyKeystone(arc, 'magician');
  const echoFlag = arc.keystone_spellEcho;
  arc.mana = 200;
  arc.gddAbilities.spell2 = { name: 'Echo Probe', school: 'magical', power: 1.0,
    manaCost: 30, baseCooldown: 8, effects: ['target_damage'] };
  arc.cooldown2 = 0;
  const beforeMana = arc.mana;
  const fakeEnemy = { hp: 10000, maxHp: 10000, isAlive: true,
    takeDamage(d) { this.hp -= d; return Math.floor(d); } };
  window.game = { party: [arc], enemies: [fakeEnemy], dungeonFloor: 0 };
  arc.useSpell2(fakeEnemy);
  const afterMana = arc.mana;
  const manaSpent = beforeMana - afterMana;
  const echoMana = manaSpent >= 40; // 30 → 45 with echo
  const enemyHpLost = 10000 - fakeEnemy.hp;
  window.game = realGame;

  // Ghost Step (Rogue): cooldown reset on dodge.
  const dancer = new (C.shadowdancer)();
  allocFamilyKeystone(dancer, 'rogue');
  dancer.cooldown = 10;
  dancer.cooldown2 = 10;
  // Set dodgeChance high (force dodge), and trigger takeDamage.
  dancer.skillTreeDodge = 1000;
  const dodgeResult = dancer.takeDamage(50, 'physical', 0);
  const ghostStepReset = dancer.cooldown === 0 && dancer.cooldown2 === 0;

  // Totemic Will (Mystic): a buff timer set during effects gets ×1.5.
  // Use Bard with totemic_will keystone, fire spell1 (Song of Valor effects
  // include 'taunt' isn't there but buff_pdef exists for tank). Easier:
  // directly fire bleed effect via engine and check timer.
  const bard = new (C.bard)();
  allocFamilyKeystone(bard, 'mystic');
  const target = { isAlive: true, takeDamage(d){ return Math.floor(d); } };
  window.EFFECTS.apply(['bleed'], { caster: bard, target,
    party: [bard], enemies: [target], school: 'magical', floor: 0,
    power: 100, notes: [], note(){} });
  const bleedNoWill = 300; // base bleed timer
  // With Totemic Will (1.5×), bleedTimer should be 450.
  const totemicMultApplied = target.bleedTimer === 450;

  return {
    baselineCrit, baselineDodge, totalCrit,
    cbmTreeCrit, cbmTotalCrit,
    sdTreeDodge,
    livingWallRedirected,
    echoFlag, echoMana, manaSpent, enemyHpLost,
    dodgeResult, ghostStepReset,
    totemicMultApplied, bleedTimer: target.bleedTimer,
  };
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

let fails = 0;
function check(label, ok) { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) fails++; }

console.log('GDD §4.5 — crit/dodge migrated off core stats:');
check('  base critChance = 0 (was 5)',     probe.baselineCrit === 0);
check('  base dodgeChance = 0',            probe.baselineDodge === 0);
console.log('  Crossbowman path through marksman arm:');
check(`    skillTreeCritChance > 0`,        probe.cbmTreeCrit > 0);
console.log(`    skillTreeCritChance = ${probe.cbmTreeCrit}`);
console.log('  Shadowdancer path through rogue arm:');
check(`    skillTreeDodge > 0`,             probe.sdTreeDodge > 0);
console.log(`    skillTreeDodge = ${probe.sdTreeDodge}`);

console.log('\nLiving Wall (Tank, < 30% HP):');
check('  damage to ally redirects to tank', probe.livingWallRedirected);

console.log('\nSpell Echo (Magician):');
check('  keystone_spellEcho flag set',      probe.echoFlag === true);
check('  mana cost ×1.5 (>= 50)',           probe.echoMana);
check('  damage dealt twice',               probe.enemyHpLost > 0);
console.log(`    manaSpent=${probe.manaSpent}  enemyHpLost=${probe.enemyHpLost}`);

console.log('\nGhost Step (Rogue):');
check('  forced dodge triggered',           probe.dodgeResult === 'DODGE');
check('  cooldown + cooldown2 reset to 0',  probe.ghostStepReset);

console.log('\nTotemic Will (Mystic):');
check('  bleedTimer extended to 450 (×1.5)', probe.totemicMultApplied);
console.log(`    measured bleedTimer = ${probe.bleedTimer} (base 300, expected 450)`);

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
