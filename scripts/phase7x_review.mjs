// Phase 7.x: effects engine handles tag-based behaviors.
// Direct unit tests of each handler against a synthetic context.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4798, ROOT = resolve('.');
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
  const E = window.EFFECTS;
  if (!E) return { err: 'EFFECTS missing' };

  // Build a fake unit with takeDamage / heal / isAlive.
  function makeUnit(label) {
    return {
      label, hp: 1000, maxHp: 1000, isAlive: true,
      takeDamage(d) { this.hp -= d; if (this.hp <= 0) { this.hp = 0; this.isAlive = false; } return Math.floor(d); },
      heal(amt) { const h = Math.min(amt, this.maxHp - this.hp); this.hp += h; return h; },
      getTotalMaxHp() { return this.maxHp; },
    };
  }

  const caster = makeUnit('caster');
  const t1 = makeUnit('t1');
  const t2 = makeUnit('t2');
  const t3 = makeUnit('t3');
  const enemies = [t1, t2, t3];
  const ally1 = makeUnit('a1'); ally1.hp = 500;
  const ally2 = makeUnit('a2'); ally2.hp = 200;
  const party = [caster, ally1, ally2];

  const ctx = (target, overrides = {}) => ({
    caster, target, targets: target ? [target] : [], party, enemies,
    school: 'physical', floor: 0, power: 100,
    notes: [], note(k, w, n) { this.notes.push({k, w: w?.label, n}); },
    ...overrides,
  });

  const results = {};

  // target_damage — single hit to t1.
  let c = ctx(t1);
  let r = E.apply(['target_damage'], c);
  results.target_damage = { dealt: r, t1hp: t1.hp, notes: c.notes.length };
  // reset
  t1.hp = 1000;

  // aoe — hits all 3.
  c = ctx(t1);
  r = E.apply(['aoe'], c);
  results.aoe = { dealt: r, t1: t1.hp, t2: t2.hp, t3: t3.hp, notes: c.notes.length };
  t1.hp = t2.hp = t3.hp = 1000;

  // hits_3_random — three damaging hits (may double-target).
  c = ctx(t1);
  r = E.apply(['hits_3_random'], c);
  const totalLost = (1000-t1.hp) + (1000-t2.hp) + (1000-t3.hp);
  results.hits_3_random = { dealt: r, totalLost, notes: c.notes.length };
  t1.hp = t2.hp = t3.hp = 1000;

  // heal_target — heals lowest-HP ally (ally2 at 200).
  c = ctx(null);
  r = E.apply(['heal_target'], c);
  results.heal_target = { dealt: r, ally2hp: ally2.hp };
  ally2.hp = 200;

  // taunt_all — every alive enemy targets caster.
  c = ctx(null);
  E.apply(['taunt_all'], c);
  results.taunt_all = enemies.every(e => e.currentTarget === caster);

  // buff_pdef — caster.tauntActive set.
  c = ctx(null);
  caster.pDef = 50;
  E.apply(['buff_pdef'], c);
  results.buff_pdef = !!caster.tauntActive;

  // damage_reduction — caster.damageReduction set.
  c = ctx(null);
  E.apply(['damage_reduction_60_4s'], c);
  results.damage_reduction = caster.damageReduction === 0.6;

  // ignite_4s — target gets poisonDamage.
  c = ctx(t1);
  E.apply(['ignite_4s'], c);
  results.ignite_4s = t1.poisonDamage > 0;
  t1.poisonDamage = 0;

  // bleed — target gets bleedDamage.
  c = ctx(t1);
  E.apply(['bleed'], c);
  results.bleed = t1.bleedDamage > 0;
  t1.bleedDamage = 0;

  return results;
});

await browser.close();
server.close();

if (probe.err) { console.log('FAIL:', probe.err); process.exit(1); }

let fails = 0;
function check(label, ok) { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) fails++; }

console.log('Effect handlers:');
check('target_damage hits t1', probe.target_damage.dealt === 100 && probe.target_damage.t1hp === 900);
check('aoe hits all 3 enemies', probe.aoe.t1 === 900 && probe.aoe.t2 === 900 && probe.aoe.t3 === 900);
check('hits_3_random does damage', probe.hits_3_random.totalLost === 300);
check('heal_target heals ally2', probe.heal_target.ally2hp > 200);
check('taunt_all redirects all enemies', probe.taunt_all);
check('buff_pdef sets tauntActive', probe.buff_pdef);
check('damage_reduction_60_4s applies', probe.damage_reduction);
check('ignite_4s applies poisonDamage', probe.ignite_4s);
check('bleed applies bleedDamage', probe.bleed);

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`\nResult: ${fails === 0 && errors.length === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
