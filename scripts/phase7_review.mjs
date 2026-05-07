// Phase 7: each class has gddAbilities with 4 slots populated, basic-attack
// damage routes through the slot's school (so Mage Firebolts as magical
// vs Mage's old "physical attack" path).

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4794, ROOT = resolve('.');
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
    const a = inst.gddAbilities;
    out[cls] = {
      hasAbilities: !!a,
      attack:  a?.attack  && { name: a.attack.name,  school: a.attack.school,  power: a.attack.power },
      spell1:  a?.spell1  && { name: a.spell1.name,  school: a.spell1.school,  manaCost: a.spell1.manaCost, cd: a.spell1.baseCooldown },
      spell2:  a?.spell2  && { name: a.spell2.name,  school: a.spell2.school,  manaCost: a.spell2.manaCost, cd: a.spell2.baseCooldown },
      passive: a?.passive && { name: a.passive.name, description: a.passive.description },
    };
  }
  return out;
});

await browser.close();
server.close();

let fails = 0;
for (const [cls, p] of Object.entries(probe)) {
  console.log(`${cls}:`);
  if (p.missing) { console.log('  MISSING'); fails++; continue; }
  if (!p.hasAbilities) { console.log('  no gddAbilities'); fails++; continue; }
  for (const s of ['attack','spell1','spell2','passive']) {
    if (!p[s] || !p[s].name) { console.log(`  ${s.padEnd(8)} MISSING`); fails++; }
    else console.log(`  ${s.padEnd(8)} ${p[s].name}${p[s].school?` [${p[s].school}]`:''}${p[s].manaCost!==undefined?` mana=${p[s].manaCost}`:''}${p[s].cd!==undefined?` cd=${p[s].cd}`:''}${p[s].power!==undefined&&p[s].power!==1?` power=${p[s].power}`:''}`);
  }
}

// Spot-check schools: Tank physical, Mage magical, Paladin mixed.
if (probe.Tank.attack.school !== 'physical') { console.log('FAIL: Tank attack school'); fails++; }
if (probe.Mage.attack.school !== 'magical')  { console.log('FAIL: Mage attack school'); fails++; }
if (probe.Paladin.attack.school !== 'mixed') { console.log('FAIL: Paladin attack school'); fails++; }

console.log(`\nResult: ${fails === 0 ? 'PASS' : 'FAIL ('+fails+')'}`);
process.exit(fails === 0 ? 0 : 1);
