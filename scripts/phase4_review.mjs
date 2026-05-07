// Phase 4 review: verify the new GDD 6-stat axis is wired up.
// 1. Each class instance has pAtk/mAtk/pDef/mDef + damageType set per its lean
// 2. getEffectiveAtk('physical') returns pAtk path; ('magical') returns mAtk path
// 3. takeDamage with damageType uses the GDD §4.3 formula (verifiable by
//    high-pDef vs low-mDef defender taking more magical than physical damage)
// 4. Smoke + migration tests still green

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4791;
const ROOT = resolve('.');
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
await new Promise(r => setTimeout(r, 800));

const probe = await page.evaluate(() => {
  // Class declarations from classic <script> tags don't auto-attach to window;
  // resolve via Function eval so we read the top-level lexical scope.
  const resolve = (name) => {
    try { return Function('return typeof ' + name + ' !== "undefined" ? ' + name + ' : null')(); }
    catch { return null; }
  };
  const profiles = ['Tank', 'Rogue', 'Mage', 'Healer', 'Archer', 'Paladin'].map(cls => {
    const C = resolve(cls);
    if (!C) return { cls, missing: true };
    const inst = new C();
    return {
      cls,
      pAtk: inst.pAtk,
      mAtk: inst.mAtk,
      pDef: inst.pDef,
      mDef: inst.mDef,
      damageType: inst.damageType,
      effectiveAtk_phys: inst.getEffectiveAtk('physical'),
      effectiveAtk_mag: inst.getEffectiveAtk('magical'),
      effectiveAtk_self: inst.getEffectiveAtk(inst.damageType),
    };
  });

  // Mitigation symmetry: a defender with high pDef low mDef takes less from a
  // physical hit than a magical hit of equal raw power.
  const Tank = new (resolve('Tank'))();   // high pDef, low mDef
  Tank.hp = 1e9; Tank.maxHp = 1e9;
  const before = Tank.hp;
  const physDealt = Tank.takeDamage(1000, 'physical', 0);
  const magDealt = Tank.takeDamage(1000, 'magical', 0);
  const legacyDealt = Tank.takeDamage(1000); // no damageType → legacy path

  return { profiles, mitigation: { phys: physDealt, mag: magDealt, legacy: legacyDealt, tankPDef: Tank.pDef, tankMDef: Tank.mDef } };
});

console.log('=== CLASS PROFILES ===');
for (const p of probe.profiles) {
  if (p.missing) { console.log(`${p.cls}: MISSING`); continue; }
  console.log(`${p.cls.padEnd(8)}  pAtk=${p.pAtk} mAtk=${p.mAtk} pDef=${p.pDef} mDef=${p.mDef}  type=${p.damageType.padEnd(8)} effAtk(phys)=${p.effectiveAtk_phys} effAtk(mag)=${p.effectiveAtk_mag} effAtk(self)=${p.effectiveAtk_self}`);
}

console.log('\n=== MITIGATION (Tank, raw=1000) ===');
console.log(`  pDef=${probe.mitigation.tankPDef} mDef=${probe.mitigation.tankMDef}`);
console.log(`  physical → ${probe.mitigation.phys}`);
console.log(`  magical  → ${probe.mitigation.mag}`);
console.log(`  legacy   → ${probe.mitigation.legacy}`);

await browser.close();
server.close();

// Validations
const tank = probe.profiles.find(p => p.cls === 'Tank');
const mage = probe.profiles.find(p => p.cls === 'Mage');
const fails = [];
if (tank.damageType !== 'physical') fails.push(`Tank damageType expected physical, got ${tank.damageType}`);
if (mage.damageType !== 'magical')  fails.push(`Mage damageType expected magical, got ${mage.damageType}`);
if (mage.pAtk !== 0)                 fails.push(`Mage pAtk expected 0, got ${mage.pAtk}`);
if (tank.mAtk !== 0)                 fails.push(`Tank mAtk expected 0, got ${tank.mAtk}`);
// Tank: high pDef low mDef → magical hit should land for MORE than physical
if (probe.mitigation.mag <= probe.mitigation.phys) {
  fails.push(`Tank should take more magical than physical; got mag=${probe.mitigation.mag} phys=${probe.mitigation.phys}`);
}
console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`Failures: ${fails.length}`);
fails.forEach(f => console.log('  ' + f));
process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
