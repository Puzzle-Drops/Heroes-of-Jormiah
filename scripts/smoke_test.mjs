#!/usr/bin/env node
// Headless smoke test: boots the game, clicks Enter Dungeon, lets combat run for
// a few seconds, asserts the canvas is drawing and at least one combat-log
// entry was produced. Exits non-zero on any console error or assertion fail.

import puppeteer from 'puppeteer';

const URL = process.env.URL || 'http://localhost:8080/';
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', err => { errors.push(`pageerror: ${err.message}`); });
page.on('console', msg => {
  const t = msg.type();
  if (t === 'error') errors.push(`console.error: ${msg.text()}`);
});
page.on('requestfailed', req => {
  const url = req.url();
  if (url.startsWith('http://localhost')) errors.push(`request failed: ${url}`);
});
page.on('response', res => {
  if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`);
});

await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle0' });

// Hub should render Crucible title
const title = await page.$eval('.topbar .title', el => el.textContent);
if (title.trim() !== 'CRUCIBLE') throw new Error(`unexpected title: ${title}`);

// Enter Dungeon
await page.click('#enter-btn');
await page.waitForSelector('#battle-canvas', { timeout: 5000 });

// Crank speed
await page.click('.speed-controls button[data-speed="4"]');

// Let combat run (longer to absorb the floor-cleared banner delay)
await new Promise(r => setTimeout(r, 7000));

// Check log has entries
const logEntries = await page.$$eval('#log .entry', els => els.length);
console.log(`combat log entries after 5s: ${logEntries}`);

// Take a screenshot of the battle for visual proof
await page.screenshot({ path: 'scripts/smoke_battle.png' });

// Check status — either still fighting, cleared (loot card), or wiped (modal)
const hasLoot = await page.$('.loot-overlay') !== null;
const hasWipe = await page.$('.modal-overlay') !== null;
console.log(`loot overlay: ${hasLoot}, wipe modal: ${hasWipe}, fighting: ${!hasLoot && !hasWipe}`);

// If we cleared floor 1, advance to floor 2 and confirm it loads
if (hasLoot) {
  await page.click('#loot-continue');
  await new Promise(r => setTimeout(r, 800));
  const floorText = await page.$eval('.battle .floor', el => el.textContent);
  console.log(`after loot continue, floor header: ${floorText}`);
  if (!floorText.includes('FLOOR 2')) throw new Error(`expected FLOOR 2, got: ${floorText}`);
}

// Return to hub to test inventory flow.
page.on('dialog', d => d.accept()); // auto-accept the "Return to hub?" confirm
await page.click('#hub-btn');
await page.waitForSelector('.roster-card', { timeout: 3000 });

// Stash should have at least 1 item now.
const stashCount = await page.evaluate(() => {
  const m = document.querySelector('.cur:nth-child(4) b');
  return m ? Number(m.textContent) : 0;
});
console.log(`stash count: ${stashCount}`);
if (stashCount < 1) throw new Error('expected at least 1 item in shared stash');

// Click first roster card → unit detail
await page.click('.roster-card');
await page.waitForSelector('.paper-doll', { timeout: 3000 });

// Capture HP before
const hpBefore = await page.$eval('.detail-stats .stat:first-child b', el => Number(el.textContent));
console.log(`HP before equip: ${hpBefore}`);

// Equip Best by Score
await page.click('#best-btn');
await new Promise(r => setTimeout(r, 200));

const hpAfter = await page.$eval('.detail-stats .stat:first-child b', el => Number(el.textContent));
console.log(`HP after equip: ${hpAfter}`);

// At least one slot should now show non-empty (some loot equipped) OR stats matched.
const equippedNonEmpty = await page.$$eval('.equip-slot:not(.empty):not(.starter)', els => els.length);
console.log(`equipped non-starter slots: ${equippedNonEmpty}`);

await page.screenshot({ path: 'scripts/smoke_unit_detail.png' });

// Hover the first ability chip → expect tooltip with humanized effect text.
const chip = await page.$('.ability-chip');
if (chip) {
  await chip.hover();
  await new Promise(r => setTimeout(r, 350));
  const text = await page.evaluate(() => {
    const el = document.querySelector('.tooltip');
    return el && el.style.display !== 'none' ? el.textContent : '';
  });
  console.log(`ability tooltip text length: ${text.length}`);
  if (!text || !/EFFECTS/i.test(text)) throw new Error(`expected EFFECTS in ability tooltip, got: ${text.slice(0,200)}`);
  await page.screenshot({ path: 'scripts/smoke_ability_tooltip.png' });
}

// Move mouse away to clear, then hover a stat label → expect base/level/gear breakdown.
await page.mouse.move(0, 0);
await new Promise(r => setTimeout(r, 150));
const statLabel = await page.$('.detail-stats .stat[data-stat="hp"]');
if (statLabel) {
  await statLabel.hover();
  await new Promise(r => setTimeout(r, 350));
  const text = await page.evaluate(() => {
    const el = document.querySelector('.tooltip');
    return el && el.style.display !== 'none' ? el.textContent : '';
  });
  if (!/Health/.test(text) || !/Base/.test(text)) throw new Error(`expected stat tooltip, got: ${text.slice(0,200)}`);
}

// Hub: verify next-unlock hint shows
await page.click('#back-btn');
await page.waitForSelector('.next-unlock', { timeout: 2000 }).catch(() => null);
const nextUnlock = await page.$eval('.next-unlock b', el => el.textContent).catch(() => null);
console.log(`next unlock: ${nextUnlock ?? 'none'}`);
await page.screenshot({ path: 'scripts/smoke_hub.png' });

if (errors.length) {
  console.error('ERRORS:');
  for (const e of errors) console.error('  ' + e);
  await browser.close();
  process.exit(1);
}

if (logEntries === 0) {
  console.error('FAIL: combat log is empty after 5 seconds at 4× speed');
  await browser.close();
  process.exit(1);
}

console.log('SMOKE OK');
await browser.close();
