import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';

const PORT = 4788;
const ROOT = resolve('.');
const SHOT = resolve('scripts/.smoke_shot.png');
mkdirSync(dirname(SHOT), { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = join(ROOT, urlPath);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(PORT, r));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });

const errors = [];
const logs = [];
page.on('console', msg => {
  const text = msg.text();
  if (msg.type() === 'error') {
    if (text.includes('favicon')) return;
    if (text === 'Failed to load resource: the server responded with a status of 404 (Not Found)') return;
    errors.push(`[error] ${text}`);
  } else logs.push(`[${msg.type()}] ${text}`);
});
page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
page.on('response', r => {
  if (r.status() === 404 && !r.url().includes('favicon')) errors.push(`[404] ${r.url()}`);
});

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2', timeout: 15000 });
await new Promise(r => setTimeout(r, 1000));

const stage1 = await page.evaluate(() => ({
  title: document.title,
  hasGame: typeof Game !== 'undefined',
  selectVisible: getComputedStyle(document.getElementById('character-select-overlay')).display !== 'none',
  classCardCount: document.querySelectorAll('[data-char-class]').length,
  startBtnText: document.getElementById('start-adventure-btn')?.textContent?.trim(),
}));
console.log('STAGE 1 - load:', JSON.stringify(stage1, null, 2));

// Pick a 6-hero party per GDD §5.1: 3 front + 3 back
const picks = ['tank', 'paladin', 'rogue', 'healer', 'mage', 'archer'];
for (const cls of picks) {
  await page.click(`[data-char-class="${cls}"]`);
  await new Promise(r => setTimeout(r, 100));
}

const stage2 = await page.evaluate(() => ({
  startBtnText: document.getElementById('start-adventure-btn')?.textContent?.trim(),
  startBtnDisabled: document.getElementById('start-adventure-btn')?.disabled,
}));
console.log('\nSTAGE 2 - party picked:', JSON.stringify(stage2, null, 2));

await page.click('#start-adventure-btn');
await new Promise(r => setTimeout(r, 1500));

await page.evaluate(() => {
  const all = [...document.querySelectorAll('[data-dungeon="everfall"]')];
  const visible = all.find(el => el.offsetParent !== null);
  (visible || all[0])?.click();
});
await new Promise(r => setTimeout(r, 2000));

const stage3 = await page.evaluate(() => {
  const g = window.game;
  return {
    gameExists: !!g,
    selectVisible: getComputedStyle(document.getElementById('character-select-overlay')).display !== 'none',
    party: g?.party?.map(c => ({ name: c.name, hp: c.hp, maxHp: c.maxHp })) ?? [],
    inBattle: g?.inBattle,
    currentDungeon: g?.currentDungeon,
    floor: g?.floor,
    enemyCount: g?.enemies?.length ?? 0,
  };
});
console.log('\nSTAGE 3 - dungeon entered:', JSON.stringify(stage3, null, 2));

// Let combat run for 3 seconds and check that something is changing
const before = await page.evaluate(() => ({
  enemyHpSum: (window.game?.enemies ?? []).reduce((s, e) => s + (e.hp ?? 0), 0),
  partyManaSum: (window.game?.party ?? []).reduce((s, c) => s + (c.mana ?? 0), 0),
  logEntries: document.querySelectorAll('#log-container .log-entry, #log-container > div').length,
}));
await new Promise(r => setTimeout(r, 3000));
const after = await page.evaluate(() => ({
  enemyHpSum: (window.game?.enemies ?? []).reduce((s, e) => s + (e.hp ?? 0), 0),
  partyManaSum: (window.game?.party ?? []).reduce((s, c) => s + (c.mana ?? 0), 0),
  logEntries: document.querySelectorAll('#log-container .log-entry, #log-container > div').length,
  floor: window.game?.floor,
}));
console.log('\nSTAGE 4 - combat tick:');
console.log('  before:', JSON.stringify(before));
console.log('  after :', JSON.stringify(after));

const combatTicked =
  after.enemyHpSum !== before.enemyHpSum ||
  after.partyManaSum !== before.partyManaSum ||
  after.logEntries > before.logEntries ||
  (after.floor ?? 0) > (before.floor ?? 0);

console.log(`  combat-ticking: ${combatTicked ? 'YES' : 'NO'}`);

await page.screenshot({ path: SHOT, fullPage: false });
console.log(`\nScreenshot: ${SHOT}`);

console.log(`\n=== ERRORS (${errors.length}) ===`);
errors.slice(0, 20).forEach(e => console.log(e));

await browser.close();
server.close();

const ok = errors.length === 0 && stage1.hasGame && stage3.enemyCount > 0 && combatTicked;
console.log(`\nResult: ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
