import { getData } from './state.js';

export const FRAME_W = 200;
export const FRAME_H = 220;
const FRAMES = 8;
const BREATH_PERIOD = Math.PI;

const cache = new Map();

export function spriteKeyForClass(classId) {
  const data = getData();
  return data.sprite_mapping.classes[classId]?.spriteKey ?? null;
}

export function loadSprite(spriteKey) {
  if (cache.has(spriteKey)) return cache.get(spriteKey);
  const img = new Image();
  const promise = new Promise((resolve, reject) => {
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite: ${spriteKey}`));
  });
  img.src = `./assets/sprites/sheets/${spriteKey}.png`;
  cache.set(spriteKey, promise);
  return promise;
}

export function preloadClassSprites(classIds) {
  const keys = classIds.map(spriteKeyForClass).filter(Boolean);
  return Promise.allSettled(keys.map(loadSprite));
}

export function getSpriteSync(spriteKey) {
  const entry = cache.get(spriteKey);
  if (!entry) return null;
  if (typeof entry.then === 'function') {
    if (entry._resolved) return entry._resolved;
    entry.then(img => { entry._resolved = img; });
    return null;
  }
  return entry;
}

export function drawSprite(ctx, img, x, y, time, scale = 0.45, mirror = false) {
  const idx = Math.floor((time % BREATH_PERIOD) / BREATH_PERIOD * FRAMES) % FRAMES;
  const dw = FRAME_W * scale, dh = FRAME_H * scale;
  ctx.save();
  if (mirror) {
    ctx.translate(x + dw / 2, y - dh / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(img, idx * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, idx * FRAME_W, 0, FRAME_W, FRAME_H, x - dw / 2, y - dh / 2, dw, dh);
  }
  ctx.restore();
}

export function drawPlaceholder(ctx, x, y, scale = 0.45, color = '#6366f1') {
  const w = FRAME_W * scale, h = FRAME_H * scale;
  ctx.save();
  ctx.fillStyle = 'rgba(20, 21, 42, 0.6)';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.restore();
}
