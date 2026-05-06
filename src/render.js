import { spriteKeyForClass, loadSprite, getSpriteSync, drawSprite, drawPlaceholder, FRAME_W, FRAME_H } from './sprites.js';

const SCALE = 0.42;
const SPRITE_W = FRAME_W * SCALE;
const SPRITE_H = FRAME_H * SCALE;

const FAMILY_COLOR = {
  tank: '#a1a1aa', fighter: '#ef4444', healer: '#86efac', marksman: '#84cc16',
  rogue: '#f87171', magician: '#c4b5fd', mystic: '#fbbf24', farlands: '#f0abfc',
  enemy: '#ef4444'
};

export function preloadBattleSprites(battle) {
  const keys = battle.playerUnits.map(u => spriteKeyForClass(u.classId)).filter(Boolean);
  return Promise.all(keys.map(k => loadSprite(k).catch(() => null)));
}

export function placeUnits(battle, canvasW, canvasH) {
  const margin = 60;
  const playerCenterX = canvasW * 0.28;
  const enemyCenterX = canvasW * 0.72;
  const rowYFront = canvasH * 0.66;
  const rowYBack = canvasH * 0.40;
  const colSpacing = 110;

  for (const u of battle.playerUnits) {
    u.screen = {
      x: playerCenterX - colSpacing + u.col * colSpacing - (u.row === 'back' ? 24 : 0),
      y: u.row === 'front' ? rowYFront : rowYBack,
      mirror: false
    };
  }
  for (const u of battle.enemyUnits) {
    u.screen = {
      x: enemyCenterX - colSpacing + u.col * colSpacing + (u.row === 'back' ? 24 : 0),
      y: u.row === 'front' ? rowYFront : rowYBack,
      mirror: true
    };
  }
}

export function renderBattle(ctx, battle, canvasW, canvasH, time) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  drawBackground(ctx, canvasW, canvasH);

  const all = [...battle.playerUnits, ...battle.enemyUnits];
  // depth sort by y so back-row draws first
  all.sort((a, b) => a.screen.y - b.screen.y);

  for (const u of all) drawShadow(ctx, u);
  for (const u of all) drawUnitSprite(ctx, u, time);
  for (const u of all) drawHpBar(ctx, u);
  drawFx(ctx, battle);
}

function drawBackground(ctx, w, h) {
  // floor band
  ctx.fillStyle = '#13121f';
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  ctx.strokeStyle = 'rgba(200, 152, 96, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.55); ctx.lineTo(w, h * 0.55);
  ctx.stroke();
  // dim divider between sides
  const grad = ctx.createLinearGradient(w * 0.5, 0, w * 0.5, h);
  grad.addColorStop(0, 'rgba(200, 152, 96, 0)');
  grad.addColorStop(0.5, 'rgba(200, 152, 96, 0.08)');
  grad.addColorStop(1, 'rgba(200, 152, 96, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(w * 0.5 - 0.5, 0, 1, h);
}

function drawShadow(ctx, u) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(u.screen.x, u.screen.y + SPRITE_H / 2 - 6, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUnitSprite(ctx, u, time) {
  if (u.dead) {
    ctx.save();
    ctx.globalAlpha = 0.25;
  }
  if (u.isEnemy) {
    drawEnemyGlyph(ctx, u);
  } else {
    const key = spriteKeyForClass(u.classId);
    const img = key ? getSpriteSync(key) : null;
    if (img) {
      drawSprite(ctx, img, u.screen.x, u.screen.y, time, SCALE, u.screen.mirror);
    } else {
      drawPlaceholder(ctx, u.screen.x, u.screen.y, SCALE, FAMILY_COLOR[u.family] || '#888');
    }
  }
  if (u.dead) ctx.restore();
}

function drawEnemyGlyph(ctx, u) {
  const w = SPRITE_W * 0.7, h = SPRITE_H * 0.85;
  const x = u.screen.x - w / 2, y = u.screen.y - h / 2;
  ctx.save();
  ctx.fillStyle = '#2b1414';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#7a2222';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // simple eyes
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + w * 0.30, y + h * 0.30, 5, 5);
  ctx.fillRect(x + w * 0.62, y + h * 0.30, 5, 5);
  ctx.restore();
}

function drawHpBar(ctx, u) {
  const w = 70, h = 6;
  const x = u.screen.x - w / 2;
  const y = u.screen.y - SPRITE_H / 2 - 18;
  ctx.fillStyle = '#0a0b14';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = u.dead ? '#3a1a1a' : '#d63b3b';
  ctx.fillRect(x, y, w * (u.hp / u.maxHp), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(x, y, w, h);

  if (u.maxMp > 0) {
    ctx.fillStyle = '#0a0b14';
    ctx.fillRect(x, y + h + 2, w, 3);
    ctx.fillStyle = '#4a8fc0';
    ctx.fillRect(x, y + h + 2, w * (u.mp / u.maxMp), 3);
  }

  ctx.fillStyle = u.dead ? '#6b6b78' : '#e8e6d8';
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(u.displayName, u.screen.x, y - 4);
}

function drawFx(ctx, battle) {
  for (const f of battle.fx) {
    const age = battle.now - f.t;
    if (age < 0 || age > 1.4) continue;
    const u = f.target;
    if (!u || !u.screen) continue;
    const yLift = age * 38;
    const alpha = Math.max(0, 1 - age / 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px ui-monospace, monospace';
    ctx.textAlign = 'center';
    if (f.type === 'dmg')   { ctx.fillStyle = '#ffe2c8'; ctx.fillText(`-${f.amount}`, u.screen.x, u.screen.y - 32 - yLift); }
    if (f.type === 'heal')  { ctx.fillStyle = '#86efac'; ctx.fillText(`+${f.amount}`, u.screen.x, u.screen.y - 32 - yLift); }
    if (f.type === 'death') { ctx.fillStyle = '#d63b3b'; ctx.font = 'bold 13px ui-monospace, monospace'; ctx.fillText('[DOWNED]', u.screen.x, u.screen.y - 32 - yLift); }
    ctx.restore();
  }
}
