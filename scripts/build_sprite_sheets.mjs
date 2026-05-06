#!/usr/bin/env node
// Bake idle-animation sprite sheets from assets/sprites/class_sprites.html.
//
// Loads class_sprites.html in a headless browser, samples N frames of the
// breathe cycle for each className in CLASS_SPRITES, composites them into a
// horizontal strip, and writes one PNG per class to assets/sprites/sheets/
// alongside a manifest.json describing the layout.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE_HTML = join(ROOT, 'assets', 'sprites', 'class_sprites.html');
const OUT_DIR = join(ROOT, 'assets', 'sprites', 'sheets');

// Frame layout. The in-page render uses a 100x110 logical area scaled 2x to
// 200x220 px. Breath cycle is `Math.sin(time * 2)` with period = PI seconds.
const FRAME_W = 200;
const FRAME_H = 220;
const FRAMES = 8;
const BREATH_PERIOD = Math.PI;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') {
      console.log(`[page:${t}]`, msg.text());
    }
  });

  // Block external resources (Google Fonts etc.) — we don't need them, and
  // they hang in offline / restricted environments.
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.startsWith('file://') || url === 'about:blank') {
      req.continue();
    } else {
      req.abort();
    }
  });

  // The source HTML declares `const CLASS_SPRITES = {...}` inside a classic
  // <script> tag, so it's script-scoped and NOT exposed on window. Read the
  // file, splice in a window assignment right after the object literal closes,
  // then setContent so we can reach it from page.evaluate.
  const rawHtml = await readFile(SOURCE_HTML, 'utf8');
  const patchedHtml = rawHtml.replace(
    'const CLASS_SPRITES = {',
    'window.CLASS_SPRITES = {',
  );
  if (patchedHtml === rawHtml) {
    throw new Error('Failed to patch CLASS_SPRITES into window scope.');
  }

  await page.setContent(patchedHtml, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => typeof window.CLASS_SPRITES === 'object' && window.CLASS_SPRITES !== null,
    { timeout: 15000 },
  );

  // Stop the page's own RAF render loop so its work doesn't fight ours and so
  // the page stays quiet while we render off-screen.
  await page.evaluate(() => {
    const noop = () => 0;
    window.requestAnimationFrame = noop;
    window.webkitRequestAnimationFrame = noop;
  });

  const classNames = await page.evaluate(() => Object.keys(window.CLASS_SPRITES));
  console.log(`Found ${classNames.length} classes in CLASS_SPRITES.`);

  const sheets = [];

  for (const className of classNames) {
    const dataUrl = await page.evaluate(
      ({ className, FRAME_W, FRAME_H, FRAMES, BREATH_PERIOD }) => {
        const draw = window.CLASS_SPRITES[className];
        if (typeof draw !== 'function') {
          throw new Error(`CLASS_SPRITES[${className}] is not a function`);
        }
        const sheet = document.createElement('canvas');
        sheet.width = FRAME_W * FRAMES;
        sheet.height = FRAME_H;
        const sctx = sheet.getContext('2d');

        const frame = document.createElement('canvas');
        frame.width = FRAME_W;
        frame.height = FRAME_H;
        const fctx = frame.getContext('2d');
        fctx.scale(2, 2); // match viewer's 100x110 logical → 200x220 px

        for (let i = 0; i < FRAMES; i++) {
          const time = (i / FRAMES) * BREATH_PERIOD;
          const breathe = Math.sin(time * 2) * 0.5;
          fctx.clearRect(0, 0, FRAME_W, FRAME_H);
          // Draw at the same (50, 55) logical center the viewer uses. Shadow
          // is intentionally omitted — runtime draws it dynamically.
          draw(fctx, 50, 55, time, breathe);
          sctx.drawImage(frame, i * FRAME_W, 0);
        }

        return sheet.toDataURL('image/png');
      },
      { className, FRAME_W, FRAME_H, FRAMES, BREATH_PERIOD },
    );

    const b64 = dataUrl.slice('data:image/png;base64,'.length);
    const buf = Buffer.from(b64, 'base64');
    const outPath = join(OUT_DIR, `${className}.png`);
    await writeFile(outPath, buf);
    sheets.push({ className, file: `${className}.png`, bytes: buf.length });
    console.log(`  wrote ${className}.png (${buf.length} bytes)`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'assets/sprites/class_sprites.html',
    state: 'idle',
    frame: { width: FRAME_W, height: FRAME_H },
    frames: FRAMES,
    layout: 'horizontal-strip',
    breath: {
      period_seconds: BREATH_PERIOD,
      formula: 'breathe = sin(time * 2) * 0.5; sampled at time = i/FRAMES * PI',
    },
    note:
      'Frame center is (100, 110) px (logical 50, 55). Shadow ellipse is NOT baked — render it dynamically beneath the sprite at runtime.',
    sheets,
  };
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nWrote manifest.json with ${sheets.length} entries.`);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
