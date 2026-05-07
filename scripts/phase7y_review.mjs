// Phase 7.y: spell2 wired into combat tick.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4803, ROOT = resolve('.');
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
  if (!C || !C.knight) return { err: 'CLASS_CONSTRUCTORS.knight missing' };

  // Knight: useSpell2 Shield Wall (effect: damage_reduction). Should
  // succeed: cooldown2=0 initially, mana>cost, spell2Stone equipped.
  const knight = new (C.knight)();
  knight.skillPoints = 0;
  const beforeMana = knight.mana;
  const beforeCD = knight.cooldown2;
  const r1 = knight.useSpell2 ? knight.useSpell2(null) : -1;
  const afterMana = knight.mana;
  const afterCD = knight.cooldown2;
  // Damage reduction is a self-buff, returns 0.
  const reductionApplied = knight.damageReduction === 0.6;

  // Calling again immediately should fail (cooldown2 set).
  const r2 = knight.useSpell2 ? knight.useSpell2(null) : -1;

  // Removing the spell2 stone disables the slot.
  const knight2 = new (C.knight)();
  knight2.equipment.spell2Stone = null;
  const r3 = knight2.useSpell2 ? knight2.useSpell2(null) : -1;

  // A Mage casting their spell2 (Combustion) should also work.
  const mage = new (C.arcanist)();
  const beforeMana2 = mage.mana;
  const r4 = mage.useSpell2 ? mage.useSpell2(null) : -1;
  const afterMana2 = mage.mana;

  // Endpoints honored: Knight Shield Wall L1 cd=30. After casting,
  // cooldown2 should be ~30s.
  return {
    knightSp2_first:  { ok: r1 >= 0, manaSpent: beforeMana - afterMana, cdSet: afterCD, reductionApplied },
    knightSp2_repeat: r2,
    knightSp2_noStone: r3,
    mageSp2:          { ok: r4 >= 0, manaSpent: beforeMana2 - afterMana2 },
  };
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

let fails = 0;
function check(label, ok) { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) fails++; }

console.log('Knight Shield Wall (spell2 first cast):');
check('  spell2 succeeds when ready',          probe.knightSp2_first.ok);
check('  spends mana',                          probe.knightSp2_first.manaSpent > 0);
check('  cooldown2 set near 30 (L1 endpoint)',  probe.knightSp2_first.cdSet > 25 && probe.knightSp2_first.cdSet <= 32);
check('  damage_reduction applied to caster',   probe.knightSp2_first.reductionApplied);

console.log('\nRepeat cast:');
check('  second cast rejected (on cooldown)',   probe.knightSp2_repeat === -1);

console.log('\nDead-slot:');
check('  spell2 with null stone returns -1',    probe.knightSp2_noStone === -1);

console.log('\nMage Combustion (registry class):');
check('  spell2 succeeds',                      probe.mageSp2.ok);
check('  spends mana',                          probe.mageSp2.manaSpent > 0);

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
