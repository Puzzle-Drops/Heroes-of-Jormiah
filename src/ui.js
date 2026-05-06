import {
  getData, getState, persist, resetSave,
  dropItemToStash, equipItem, unequipSlot, equipBestByScore, slotsForItem
} from './state.js';
import { createBattle, tickBattle, reviveSurvivors } from './combat/engine.js';
import { generateItemForDungeon } from './combat/loot.js';
import { renderBattle, placeUnits, preloadBattleSprites } from './render.js';
import { preloadClassSprites } from './sprites.js';

const root = () => document.getElementById('app');

let _activeBattle = null;
let _renderHandle = null;
let _lastFrame = 0;

// ============================================================================
// HUB SCREEN
// ============================================================================
export function showHub() {
  stopBattle();
  const data = getData();
  const state = getState();
  const dungeon = data.dungeonsById.iron_vaults;

  root().innerHTML = `
    <div class="hub">
      ${renderTopbar()}
      <div class="hub-main">
        <div class="panel">
          <h2>Roster</h2>
          <div class="roster-grid">
            ${state.party.map(id => renderRosterCard(id, true)).join('')}
          </div>
        </div>
        <div class="panel">
          <h2>Party Formation</h2>
          <div class="party-formation">
            <div class="party-row">${[3,4,5].map(i => renderPartySlot(state.party[i])).join('')}</div>
            <div class="party-row">${[0,1,2].map(i => renderPartySlot(state.party[i])).join('')}</div>
          </div>
          <div style="font-size: 11px; color: var(--ink-muted); margin-top: 8px; font-family: var(--mono);">
            Top row = Back. Bottom row = Front. Slots 0–2 are Front (take hits).
          </div>
        </div>
      </div>
      <div class="dungeon-bar">
        <div class="dungeon-list">
          <button class="dungeon-btn active">
            <div class="name">${dungeon.name}</div>
            <div class="meta">Highest floor: ${state.dungeons.iron_vaults?.highestFloor ?? 0} · Drops: armor</div>
          </button>
          <button class="dungeon-btn" disabled><div class="name">Whispering Spires</div><div class="meta">Locked (M2)</div></button>
          <button class="dungeon-btn" disabled><div class="name">Hollowed Wilds</div><div class="meta">Locked (M2)</div></button>
          <button class="dungeon-btn" disabled><div class="name">Shattered Spire</div><div class="meta">Locked (M2)</div></button>
        </div>
        <button class="enter-btn" id="enter-btn">Enter Dungeon ▸</button>
      </div>
    </div>
  `;
  bindHub();
}

function renderTopbar() {
  const state = getState();
  const stashCount = state.sharedStash?.length ?? 0;
  return `
    <div class="topbar">
      <div class="title">CRUCIBLE</div>
      <div class="currencies">
        <div class="cur">Gold <b>${state.currencies.gold}</b></div>
        <div class="cur">Dust <b>${state.currencies.dust}</b></div>
        <div class="cur">Spirit <b>${state.currencies.spirit}</b></div>
        <div class="cur">Stash <b>${stashCount}</b></div>
      </div>
      <button id="reset-btn" style="margin-left: 16px; font-size: 10px; padding: 6px 10px;">Reset Save</button>
    </div>
  `;
}

function renderRosterCard(classId, inParty) {
  const data = getData();
  const cls = data.classesById[classId];
  const unit = getState().roster[classId];
  if (!cls || !unit) return '';
  const fam = data.familiesById[cls.family];
  const equippedNonStarter = Object.values(unit.equipment).filter(it => it && !it.isStarter).length;
  return `
    <div class="roster-card ${inParty ? 'in-party' : ''}" data-class="${classId}">
      <div class="name">${cls.displayName}</div>
      <div class="family">${fam?.name ?? cls.family}</div>
      <div class="lvl">Lvl ${unit.level} · XP ${unit.xp}${equippedNonStarter ? ` · ${equippedNonStarter} eq` : ''}</div>
    </div>
  `;
}

function renderPartySlot(classId) {
  if (!classId) return `<div class="party-slot empty">empty</div>`;
  const data = getData();
  const cls = data.classesById[classId];
  if (!cls) return `<div class="party-slot empty">unknown</div>`;
  return `
    <div class="party-slot">
      <div>${cls.displayName}</div>
      <div class="role">${cls.tagline}</div>
    </div>
  `;
}

function bindHub() {
  document.getElementById('enter-btn').addEventListener('click', () => enterDungeon('iron_vaults'));
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Reset save and return to fresh state?')) {
      resetSave();
      showHub();
    }
  });
  for (const card of document.querySelectorAll('.roster-card[data-class]')) {
    card.addEventListener('click', () => showUnitDetail(card.dataset.class));
  }
  const stashBtn = document.getElementById('stash-btn');
  if (stashBtn) stashBtn.addEventListener('click', () => showUnitDetail(getState().party[0]));
}

// ============================================================================
// UNIT DETAIL SCREEN
// ============================================================================
const SLOT_LAYOUT_TOP = ['weapon', 'helm', 'chest', 'legs', 'gloves', 'boots'];
const SLOT_LAYOUT_BOTTOM = ['ring1', 'ring2', 'amulet', 'stone_attack', 'stone_spell1', 'stone_spell2', 'stone_passive'];
const STAT_KEYS = ['hp', 'mp', 'patk', 'matk', 'pdef', 'mdef'];
const STAT_LABEL = { hp: 'HP', mp: 'MP', patk: 'P.ATK', matk: 'M.ATK', pdef: 'P.DEF', mdef: 'M.DEF' };
const SLOT_LABEL = {
  weapon: 'Wpn', helm: 'Helm', chest: 'Chest', legs: 'Legs', gloves: 'Gloves', boots: 'Boots',
  ring1: 'Ring 1', ring2: 'Ring 2', amulet: 'Amulet',
  stone_attack: 'Atk Stone', stone_spell1: 'Spell I Stone', stone_spell2: 'Spell II Stone', stone_passive: 'Passive Stone'
};

export function showUnitDetail(classId) {
  stopBattle();
  const data = getData();
  const state = getState();
  const cls = data.classesById[classId];
  const unit = state.roster[classId];
  if (!cls || !unit) { showHub(); return; }

  const totalStats = computeUnitStats(cls, unit);
  const sortedStash = state.sharedStash.slice().sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

  root().innerHTML = `
    <div class="hub">
      ${renderTopbar()}
      <div class="hub-main detail">
        <div class="panel">
          <div class="detail-head">
            <button id="back-btn" class="back">← Roster</button>
            <div class="detail-title">
              <div class="display">${cls.displayName}</div>
              <div class="sub">${data.familiesById[cls.family]?.name ?? cls.family} · ${cls.tagline}</div>
            </div>
            <div class="detail-stats">
              ${STAT_KEYS.map(s => `<div class="stat"><span class="k">${STAT_LABEL[s]}</span><b>${Math.round(totalStats[s])}</b></div>`).join('')}
            </div>
          </div>
          <div class="paper-doll">
            <div class="row">${SLOT_LAYOUT_TOP.map(s => renderEquipSlot(s, unit.equipment[s])).join('')}</div>
            <div class="row">${SLOT_LAYOUT_BOTTOM.map(s => renderEquipSlot(s, unit.equipment[s])).join('')}</div>
          </div>
          <div class="abilities-strip">
            ${['attack','spell1','spell2','passive'].map(slot => renderAbilityChip(cls, unit, slot)).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="stash-head">
            <h2>Shared Stash</h2>
            <button id="best-btn">Equip Best by Score</button>
          </div>
          <div class="stash-list">
            ${sortedStash.length
              ? sortedStash.map(it => renderStashRow(it)).join('')
              : `<div class="empty">No items yet — clear floors to fill the stash.</div>`}
          </div>
        </div>
      </div>
      <div class="dungeon-bar"><button id="hub-back-btn">Return to Hub</button></div>
    </div>
  `;
  bindUnitDetail(classId);
}

function renderEquipSlot(slotId, item) {
  if (!item) {
    return `<div class="equip-slot empty" data-slot="${slotId}"><div class="slot-label">${SLOT_LABEL[slotId]}</div><div class="slot-empty">empty</div></div>`;
  }
  const starter = item.isStarter ? ' starter' : '';
  return `
    <div class="equip-slot r-${item.rarity}${starter}" data-slot="${slotId}" data-item="${item.id}">
      <div class="slot-label">${SLOT_LABEL[slotId]}</div>
      <div class="slot-name r-${item.rarity}">${item.displayName ?? (item.isStarter ? 'Starter Stone' : 'Unknown')}</div>
      <div class="slot-stats">${itemStatsLine(item)}</div>
      ${item.isStarter ? '<div class="slot-tag">starter · level 1</div>' : `<div class="slot-tag">${item.rarity}</div>`}
    </div>
  `;
}

function renderAbilityChip(cls, unit, slot) {
  const aId = cls.abilities[slot];
  const stoneItem = unit.equipment[`stone_${slot}`];
  const lvl = stoneItem?.abilityLevel ?? 0;
  return `
    <div class="ability-chip">
      <div class="chip-slot">${slot.toUpperCase()}</div>
      <div class="chip-name">${prettyAbility(aId)}</div>
      <div class="chip-lvl">stone L${lvl}</div>
    </div>
  `;
}

function renderStashRow(item) {
  return `
    <div class="stash-row r-${item.rarity}" data-item="${item.id}">
      <div class="rcol name r-${item.rarity}">${item.displayName}</div>
      <div class="rcol stats">${itemStatsLine(item)}</div>
      <div class="rcol meta">Q ${(item.qualityScore * 100).toFixed(0)}%</div>
      <div class="rcol act"><button class="equip-btn" data-item="${item.id}">Equip</button></div>
    </div>
  `;
}

function itemStatsLine(item) {
  if (!item.stats) return '';
  return STAT_KEYS
    .filter(s => (item.stats[s] ?? 0) > 0)
    .map(s => `<span>${STAT_LABEL[s]} +${item.stats[s]}</span>`)
    .join(' ');
}

function prettyAbility(id) { return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function computeUnitStats(cls, unit) {
  const out = {};
  for (const k of STAT_KEYS) out[k] = (cls.baseStats[k] ?? 0) + (cls.perLevelStats[k] ?? 0) * (unit.level - 1);
  for (const slot in unit.equipment) {
    const it = unit.equipment[slot];
    if (!it || !it.stats) continue;
    for (const k of STAT_KEYS) out[k] += it.stats[k] ?? 0;
  }
  return out;
}

function bindUnitDetail(classId) {
  document.getElementById('back-btn').addEventListener('click', showHub);
  document.getElementById('hub-back-btn').addEventListener('click', showHub);
  document.getElementById('best-btn').addEventListener('click', () => {
    const n = equipBestByScore(classId);
    showUnitDetail(classId);
    if (!n) flash('No upgrades found in stash.');
  });
  for (const row of document.querySelectorAll('.stash-row')) {
    const id = row.dataset.item;
    const item = getState().sharedStash.find(s => s.id === id);
    if (!item) continue;
    row.querySelector('.equip-btn').addEventListener('click', () => {
      equipItem(classId, item);
      showUnitDetail(classId);
    });
  }
  for (const slot of document.querySelectorAll('.equip-slot:not(.empty):not(.starter)')) {
    slot.style.cursor = 'pointer';
    slot.title = 'Click to unequip';
    slot.addEventListener('click', () => {
      unequipSlot(classId, slot.dataset.slot);
      showUnitDetail(classId);
    });
  }
}

function flash(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// ============================================================================
// BATTLE SCREEN
// ============================================================================
async function enterDungeon(dungeonId) {
  const state = getState();
  const dungeonState = state.dungeons[dungeonId] ??= { highestFloor: 0, currentRunFloor: null };
  const startFloor = (dungeonState.currentRunFloor && dungeonState.currentRunFloor > 0) ? dungeonState.currentRunFloor : 1;
  dungeonState.currentRunFloor = startFloor;
  persist();

  await preloadClassSprites(state.party);
  startBattle(dungeonId, startFloor);
}

function startBattle(dungeonId, floor) {
  _activeBattle = createBattle({ dungeonId, floor });
  renderBattleScreen();
  preloadBattleSprites(_activeBattle);
  startRenderLoop();
}

function renderBattleScreen() {
  const battle = _activeBattle;
  const state = getState();
  root().innerHTML = `
    <div class="battle">
      <div class="topbar">
        <div class="floor">FLOOR ${battle.floor}</div>
        <div class="stage">— ${getData().dungeonsById[battle.dungeonId].name}</div>
        <div class="currencies">
          <div class="cur">Gold <b>${state.currencies.gold}</b></div>
          <div class="cur">Spirit <b>${state.currencies.spirit}</b></div>
        </div>
      </div>
      <div class="battle-main">
        <div class="battle-stage" id="stage">
          <canvas id="battle-canvas"></canvas>
        </div>
        <div class="combat-log" id="log"></div>
      </div>
      <div class="battle-bar">
        <div class="speed-controls">
          <button data-speed="1" class="${battle.speed === 1 ? 'active' : ''}">1×</button>
          <button data-speed="2" class="${battle.speed === 2 ? 'active' : ''}">2×</button>
          <button data-speed="4" class="${battle.speed === 4 ? 'active' : ''}">4×</button>
        </div>
        <button id="pause-btn">${battle.paused ? 'Resume' : 'Pause'}</button>
        <div class="right">
          <button id="hub-btn">Return to Hub</button>
        </div>
      </div>
    </div>
  `;
  bindBattle();
  resizeCanvas();
}

function bindBattle() {
  for (const btn of document.querySelectorAll('.speed-controls button')) {
    btn.addEventListener('click', () => {
      const sp = Number(btn.dataset.speed);
      _activeBattle.speed = sp;
      getState().settings.speed = sp;
      persist();
      for (const b of document.querySelectorAll('.speed-controls button')) b.classList.toggle('active', b === btn);
    });
  }
  document.getElementById('pause-btn').addEventListener('click', () => {
    _activeBattle.paused = !_activeBattle.paused;
    document.getElementById('pause-btn').textContent = _activeBattle.paused ? 'Resume' : 'Pause';
  });
  document.getElementById('hub-btn').addEventListener('click', () => {
    if (confirm('Return to hub? Run will be paused; you can re-enter the dungeon to continue.')) {
      stopBattle();
      showHub();
    }
  });
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const canvas = document.getElementById('battle-canvas');
  if (!canvas) return;
  const stage = document.getElementById('stage');
  const dpr = window.devicePixelRatio || 1;
  const w = stage.clientWidth, h = stage.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  placeUnits(_activeBattle, w, h);
}

function startRenderLoop() {
  cancelAnimationFrame(_renderHandle);
  _lastFrame = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.1, (now - _lastFrame) / 1000);
    _lastFrame = now;
    if (_activeBattle) {
      tickBattle(_activeBattle, dt);
      const canvas = document.getElementById('battle-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        renderBattle(ctx, _activeBattle, w, h, _activeBattle.now);
      }
      updateLog();
      handleBattleStatus();
    }
    _renderHandle = requestAnimationFrame(frame);
  };
  _renderHandle = requestAnimationFrame(frame);
}

function stopBattle() {
  cancelAnimationFrame(_renderHandle);
  _renderHandle = null;
  _activeBattle = null;
}

let _lastLogLen = 0;
function updateLog() {
  const log = document.getElementById('log');
  if (!log || _activeBattle.log.length === _lastLogLen) return;
  _lastLogLen = _activeBattle.log.length;
  const tail = _activeBattle.log.slice(-30);
  log.innerHTML = tail.map(e => `<div class="entry ${e.type}">${escapeHtml(e.text)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

function handleBattleStatus() {
  const b = _activeBattle;
  if (b.status === 'cleared' && !b._handled) {
    b._handled = true;
    onFloorCleared();
  } else if (b.status === 'wiped' && !b._handled) {
    b._handled = true;
    onWipe();
  }
}

function onFloorCleared() {
  const battle = _activeBattle;
  const state = getState();
  const ds = state.dungeons[battle.dungeonId];
  if (battle.floor > ds.highestFloor) ds.highestFloor = battle.floor;

  // grant currencies
  const goldGain = 5 + Math.floor(battle.floor * 1.5);
  const spiritGain = 1 + Math.floor(battle.floor / 5);
  state.currencies.gold += goldGain;
  state.currencies.spirit += spiritGain;
  battle.log.push({ type: 'floor', text: `+${goldGain} gold, +${spiritGain} spirit.`, t: battle.now });

  // grant XP
  const xpGain = 10 + battle.floor * 4;
  for (const cid of state.party) {
    const u = state.roster[cid];
    if (u) u.xp += xpGain;
    while (u && u.xp >= xpForLevel(u.level)) { u.xp -= xpForLevel(u.level); u.level++; }
  }

  // generate loot — drops to the party's shared stash per GDD §12.1
  const loot = generateItemForDungeon(battle.dungeonId, battle.floor);
  dropItemToStash(loot);

  ds.currentRunFloor = battle.floor + 1;
  persist();
  showLootCard(loot, () => advanceFloor());
}

function xpForLevel(level) { return 50 + level * 25; }

function advanceFloor() {
  const battle = _activeBattle;
  const next = battle.floor + 1;
  reviveSurvivors(battle.playerUnits);
  startBattle(battle.dungeonId, next);
}

function onWipe() {
  const state = getState();
  const ds = state.dungeons[_activeBattle.dungeonId];
  ds.currentRunFloor = null;
  persist();
  showWipeModal();
}

function showLootCard(item, onClose) {
  const stage = document.getElementById('stage');
  const overlay = document.createElement('div');
  overlay.className = 'loot-overlay';
  overlay.innerHTML = `
    <div class="loot-card r-${item.rarity}">
      <div class="title">LOOT</div>
      <div class="name r-${item.rarity}">${item.displayName}</div>
      <div class="lvl">${item.rarity.toUpperCase()} · ${item.kind}</div>
      <div class="stats">
        ${['hp','mp','patk','matk','pdef','mdef'].map(s =>
          `<div>${s.toUpperCase()}: <b style="color: var(--brass-hot)">${item.stats[s]}</b></div>`
        ).join('')}
      </div>
      <div class="quality">Quality: ${(item.qualityScore * 100).toFixed(1)}%</div>
      <div class="actions">
        <button id="loot-continue">Continue ▸</button>
      </div>
    </div>
  `;
  stage.appendChild(overlay);
  overlay.querySelector('#loot-continue').addEventListener('click', () => {
    overlay.remove();
    onClose();
  });
}

function showWipeModal() {
  const stage = document.getElementById('stage');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h1>PARTY WIPED</h1>
      <div class="sub">Your run ended on floor ${_activeBattle.floor}. Items kept.</div>
      <div class="actions">
        <button id="wipe-hub">Return to Hub</button>
      </div>
    </div>
  `;
  stage.appendChild(overlay);
  overlay.querySelector('#wipe-hub').addEventListener('click', () => {
    stopBattle();
    showHub();
  });
}

function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
