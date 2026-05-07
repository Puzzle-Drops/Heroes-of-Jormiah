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

  // Ensure every unit (including mid-battle summons) has a screen position.
  const all = [...battle.playerUnits, ...battle.enemyUnits];
  if (all.some(u => !u.screen)) placeUnits(battle, canvasW, canvasH);

  // smooth HP interpolation toward actual hp
  for (const u of all) {
    if (typeof u.displayHp !== 'number') u.displayHp = u.hp;
    const lerp = 0.18;
    u.displayHp += (u.hp - u.displayHp) * lerp;
    if (Math.abs(u.displayHp - u.hp) < 0.5) u.displayHp = u.hp;
  }

  // depth sort by y so back-row draws first
  all.sort((a, b) => a.screen.y - b.screen.y);

  for (const u of all) drawShadow(ctx, u);
  for (const u of all) drawUnitSprite(ctx, u, time, battle.now);
  for (const u of all) drawHpBar(ctx, u);
  drawFx(ctx, battle);

  if (battle.floorClearedT && battle.now - battle.floorClearedT < 1.6) {
    drawFloorClearedBanner(ctx, canvasW, canvasH, battle);
  }
}

function lungeOffset(unit, now) {
  const age = now - (unit.lungeT ?? -10);
  if (age < 0 || age > 0.32) return 0;
  const dir = unit.side === 'player' ? 1 : -1;
  return Math.sin((age / 0.32) * Math.PI) * 14 * dir;
}

function drawFloorClearedBanner(ctx, w, h, battle) {
  const age = battle.now - battle.floorClearedT;
  const t = age / 1.6;
  const alpha = t < 0.2 ? t / 0.2 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
  ctx.fillRect(0, h * 0.3, w, h * 0.18);
  ctx.fillStyle = '#e3b878';
  ctx.font = 'bold 32px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`FLOOR ${battle.floor} CLEARED`, w / 2, h * 0.39);
  ctx.restore();
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

function drawUnitSprite(ctx, u, time, now) {
  if (u.dead) {
    ctx.save();
    ctx.globalAlpha = 0.25;
  }
  const lx = u.screen.x + lungeOffset(u, now);
  if (u.isEnemy) {
    drawEnemyGlyph(ctx, { ...u, screen: { ...u.screen, x: lx } });
  } else {
    const key = spriteKeyForClass(u.classId);
    const img = key ? getSpriteSync(key) : null;
    if (img) {
      drawSprite(ctx, img, lx, u.screen.y, time, SCALE, u.screen.mirror);
    } else {
      drawPlaceholder(ctx, lx, u.screen.y, SCALE, FAMILY_COLOR[u.family] || '#888');
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
  // "lag" bar (white) shows the smoothed displayHp; the red foreground shows the actual hp
  if (u.displayHp > u.hp) {
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(x, y, w * Math.max(0, u.displayHp / u.maxHp), h);
  }
  ctx.fillStyle = u.dead ? '#3a1a1a' : '#d63b3b';
  ctx.fillRect(x, y, w * Math.max(0, u.hp / u.maxHp), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(x, y, w, h);

  if (u.maxMp > 0) {
    ctx.fillStyle = '#0a0b14';
    ctx.fillRect(x, y + h + 2, w, 3);
    ctx.fillStyle = '#4a8fc0';
    ctx.fillRect(x, y + h + 2, w * (u.mp / u.maxMp), 3);
  }

  // shield bar segment on top of hp bar
  if ((u.shields ?? []).length) {
    const total = u.shields.reduce((a, s) => a + Math.max(0, s.amount), 0);
    if (total > 0) {
      const sw = Math.min(w, w * (total / u.maxHp));
      ctx.fillStyle = '#a3e0ff';
      ctx.fillRect(x, y - 3, sw, 2);
    }
  }

  ctx.fillStyle = u.dead ? '#6b6b78' : '#e8e6d8';
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(u.displayName, u.screen.x, y - 6);
}

function drawFx(ctx, battle) {
  for (const f of battle.fx) {
    const age = battle.now - f.t;
    if (age < 0) continue;
    const u = f.target;
    if (!u || !u.screen) continue;

    if (f.type === 'impact') {
      // short burst — radial dots fading + scaling
      const dur = 0.35;
      if (age > dur) continue;
      const t = age / dur;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#ffe2c8';
      const r = 6 + t * 18;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const dx = Math.cos(a) * r;
        const dy = Math.sin(a) * r;
        ctx.beginPath();
        ctx.arc(u.screen.x + dx, u.screen.y + dy, 2.2 * (1 - t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      continue;
    }

    if (age > 1.4) continue;
    const yLift = age * 38;
    const alpha = Math.max(0, 1 - age / 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px ui-monospace, monospace';
    ctx.textAlign = 'center';
    if (f.type === 'dmg')    { ctx.fillStyle = '#ffe2c8'; ctx.fillText(`-${f.amount}`, u.screen.x, u.screen.y - 32 - yLift); }
    if (f.type === 'heal')   { ctx.fillStyle = '#86efac'; ctx.fillText(`+${f.amount}`, u.screen.x, u.screen.y - 32 - yLift); }
    if (f.type === 'absorb') { ctx.fillStyle = '#a3e0ff'; ctx.font = 'bold 13px ui-monospace, monospace'; ctx.fillText(`absorbed ${f.amount}`, u.screen.x, u.screen.y - 32 - yLift); }
    if (f.type === 'death')  { ctx.fillStyle = '#d63b3b'; ctx.font = 'bold 13px ui-monospace, monospace'; ctx.fillText('[DOWNED]', u.screen.x, u.screen.y - 32 - yLift); }
    if (f.type === 'dodge')  { ctx.fillStyle = '#a3e0ff'; ctx.font = 'bold 13px ui-monospace, monospace'; ctx.fillText('dodged!', u.screen.x, u.screen.y - 24 - yLift); }
    if (f.type === 'crit')   { ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 20px ui-monospace, monospace'; ctx.fillText('CRIT!', u.screen.x + 28, u.screen.y - 32 - yLift); }
    ctx.restore();
  }
}
