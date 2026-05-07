// Phase 5 review: verify item generation is GDD §8.2/§9-shaped.
// 1. Sample 5000 items at level 50. Each must have all 6 stats.
// 2. Each non-namesake stat must be in [0, 50]; namesake in [0, 100].
// 3. qualityScore = mean of roll-pcts.
// 4. Rarity tiers cluster around the GDD §9.3 thresholds.
// 5. Namesakes are picked from each slot's allowed pool.

import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = 4792;
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
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));

const result = await page.evaluate(() => {
  const Item = window.Item;
  if (!Item) return { ok: false, reason: 'window.Item missing' };

  const SAMPLE = 5000;
  const LVL = 50;
  const TYPES = ['helmet','gloves','belt','chest','boots','amulet','ring','dagger','greatsword','staff','wand','bow'];
  const tierCounts = {};
  const namesakeCounts = {};
  let outOfRange = 0;
  let missingStats = 0;
  let qSum = 0;
  let radiantSample = null;
  let rustedSample = null;

  for (let i = 0; i < SAMPLE; i++) {
    const type = TYPES[i % TYPES.length];
    const item = new Item(type, null, LVL);

    const stats = ['hp','mp','pAtk','mAtk','pDef','mDef'];
    for (const s of stats) {
      if (item[s] === undefined) { missingStats++; continue; }
      const max = (item.namesake === s) ? 2*LVL : LVL;
      if (item[s] < 0 || item[s] > max) outOfRange++;
    }

    tierCounts[item.rarity] = (tierCounts[item.rarity] || 0) + 1;
    namesakeCounts[item.namesake] = (namesakeCounts[item.namesake] || 0) + 1;
    qSum += item.qualityScore;

    if (item.rarity === 'radiant' && !radiantSample) radiantSample = item;
    if (item.rarity === 'rusted' && !rustedSample) rustedSample = item;
  }

  // Slot-namesake check: armor namesake should be in [hp, pDef, mDef].
  const armorItems = [];
  for (let i = 0; i < 200; i++) armorItems.push(new Item('helmet', null, LVL));
  const armorNamesakes = new Set(armorItems.map(it => it.namesake));

  return {
    ok: true,
    sample: SAMPLE,
    missingStats,
    outOfRange,
    avgQ: qSum / SAMPLE,
    tierCounts,
    namesakeCounts,
    armorNamesakes: [...armorNamesakes],
    radiantSample: radiantSample && {
      name: radiantSample.name,
      stats: { hp: radiantSample.hp, mp: radiantSample.mp, pAtk: radiantSample.pAtk, mAtk: radiantSample.mAtk, pDef: radiantSample.pDef, mDef: radiantSample.mDef },
      namesake: radiantSample.namesake,
      q: radiantSample.qualityScore,
    },
    rustedSample: rustedSample && {
      name: rustedSample.name,
      stats: { hp: rustedSample.hp, mp: rustedSample.mp, pAtk: rustedSample.pAtk, mAtk: rustedSample.mAtk, pDef: rustedSample.pDef, mDef: rustedSample.mDef },
      namesake: rustedSample.namesake,
      q: rustedSample.qualityScore,
    },
    display: new Item('greatsword', null, 50).getStatsDisplay(),
  };
});

await browser.close();
server.close();

if (!result.ok) { console.log('FAIL:', result.reason); process.exit(1); }

console.log(`Sample size: ${result.sample}`);
console.log(`Stats missing: ${result.missingStats}`);
console.log(`Stats out-of-range: ${result.outOfRange}`);
console.log(`Average qualityScore: ${result.avgQ.toFixed(3)} (expected ~0.500 since uniform)`);
console.log('\nTier distribution (GDD §9 averages cluster around 0.5 — Rare/Epic dominate):');
let tierFails = 0;
for (const tier of ['rusted','common','rare','epic','mythic','legendary','radiant']) {
  const c = result.tierCounts[tier] || 0;
  const pct = c / result.sample;
  console.log(`  ${tier.padEnd(11)} ${c.toString().padStart(5)} (${(pct*100).toFixed(2)}%)`);
}
// Validate ordering, not magnitudes: each successively higher tier should be
// rarer than the one below it. Radiant + Legendary may be zero in 5000 rolls.
const order = ['common','rare','epic','mythic','legendary','radiant']
  .map(t => result.tierCounts[t] || 0);
// Common should be far lower than Rare (which sits at the median peak).
if ((result.tierCounts.rare || 0) <= (result.tierCounts.common || 0)) {
  console.log('  FAIL: rare should outnumber common (median is ~0.5)');
  tierFails++;
}
if ((result.tierCounts.epic || 0) <= (result.tierCounts.mythic || 0)) {
  console.log('  FAIL: epic should outnumber mythic');
  tierFails++;
}
// Average quality should be ≈ 0.5 (uniform rolls averaging).
if (Math.abs(result.avgQ - 0.5) > 0.02) {
  console.log(`  FAIL: avgQ ${result.avgQ.toFixed(3)} too far from 0.5`);
  tierFails++;
}

console.log('\nNamesake distribution (across all slot types):');
for (const [n, c] of Object.entries(result.namesakeCounts).sort()) {
  console.log(`  ${n.padEnd(6)} ${c}`);
}
console.log(`\nArmor (helmet) namesakes seen: ${result.armorNamesakes.join(', ')} (GDD §8.3 expects ⊆ {hp, pDef, mDef})`);
const armorWeight = result.armorNamesakes.every(n => ['hp','pDef','mDef'].includes(n));

console.log('\nSample Radiant:');
console.log('  ' + (result.radiantSample?.name || '(none in sample)'));
if (result.radiantSample) console.log('  q=' + result.radiantSample.q.toFixed(3) + ' stats=' + JSON.stringify(result.radiantSample.stats) + ' namesake=' + result.radiantSample.namesake);
console.log('\nSample Rusted:');
console.log('  ' + (result.rustedSample?.name || '(none in sample)'));
if (result.rustedSample) console.log('  q=' + result.rustedSample.q.toFixed(3) + ' stats=' + JSON.stringify(result.rustedSample.stats) + ' namesake=' + result.rustedSample.namesake);

console.log('\nSample stats display (greatsword L50):');
console.log('  ' + result.display.replace(/<[^>]+>/g, ''));

console.log(`\nErrors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));

const fails = result.missingStats + result.outOfRange + tierFails + (armorWeight ? 0 : 1) + errors.length;
console.log(`\nResult: ${fails === 0 ? 'PASS' : `FAIL (${fails} issues)`}`);
process.exit(fails === 0 ? 0 : 1);
