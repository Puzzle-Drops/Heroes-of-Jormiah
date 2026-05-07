import {
  getData, getState, persist, resetSave,
  dropItemToStash, equipItem, unequipSlot, equipBestByScore, slotsForItem,
  canEquip, isItemUsableBy,
  salvageItem, salvageValue, bulkSalvage,
  rerollCost, rerollItemStat,
  isInParty, addToParty, removeFromParty, swapPartyAt, getNextUnlock,
  processFloorUnlocks, FLOOR_UNLOCKS
} from './state.js';
import { createBattle, tickBattle, reviveSurvivors } from './combat/engine.js';
import { generateItemForDungeon } from './combat/loot.js';
import { renderBattle, placeUnits, preloadBattleSprites } from './render.js';
import { preloadClassSprites } from './sprites.js';
import { attachTooltip, hideTooltip, showTooltipAt, updateTooltipContent, isTooltipShowing } from './tooltip.js';
import { humanizeEffect, prettyAbility, statLabel, humanizeScalingKey, formatScalingValue } from './humanize.js';
import { scaleParam } from './combat/formulas.js';
import { effectiveStat, sumBuffPct } from './combat/abilities.js';
import { createTreeView } from './tree_render.js';
import { allocateNode, refundAll, pointsAvailable, getAllocated, canAllocate, startNodeFor } from './tree.js';

const root = () => document.getElementById('app');

let _activeBattle = null;
let _renderHandle = null;
let _lastFrame = 0;

// ============================================================================
// HUB SCREEN
// ============================================================================
export function showHub() {
  hideTooltip();
  stopBattle();
  const data = getData();
  const state = getState();
  const dungeon = data.dungeonsById.iron_vaults;
  const highest = state.dungeons.iron_vaults?.highestFloor ?? 0;
  const nextUnlock = getNextUnlock(highest);
  const partySet = new Set(state.party);
  const rosterIds = state.unlockedClasses.slice().sort((a, b) => {
    const ai = state.party.indexOf(a), bi = state.party.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  root().innerHTML = `
    <div class="hub">
      ${renderTopbar()}
      <div class="hub-main">
        <div class="panel">
          <div class="roster-head">
            <h2>Roster</h2>
            <div class="roster-meta">${state.unlockedClasses.length} unlocked / ${data.classes.classes.length} total</div>
          </div>
          <div class="roster-grid">
            ${rosterIds.map(id => renderRosterCard(id, partySet.has(id))).join('')}
          </div>
          ${nextUnlock ? `
            <div class="next-unlock">
              <span class="lbl">Next unlock:</span>
              <b>${data.classesById[nextUnlock.classId]?.displayName ?? nextUnlock.classId}</b>
              <span class="lbl">at floor ${nextUnlock.floor}</span>
            </div>
          ` : ''}
        </div>
        <div class="panel">
          <h2>Party Formation</h2>
          <div class="party-formation">
            <div class="party-row">${[3,4,5].map(i => renderPartySlot(state.party[i])).join('')}</div>
            <div class="party-row">${[0,1,2].map(i => renderPartySlot(state.party[i])).join('')}</div>
          </div>
          <div style="font-size: 11px; color: var(--ink-muted); margin-top: 8px; font-family: var(--mono);">
            Top row = Back. Bottom row = Front. Slots 0–2 are Front (take hits).<br>
            Click a roster card to manage equipment and party membership.
          </div>
        </div>
      </div>
      <div class="dungeon-bar">
        <div class="dungeon-list">
          ${renderDungeonBtn('iron_vaults',       state, 'armor')}
          ${renderDungeonBtn('whispering_spires', state, 'jewelry')}
          ${renderDungeonBtn('hollowed_wilds',    state, 'weapons')}
          ${renderDungeonBtn('shattered_spire',   state, 'stones')}
        </div>
        <button class="enter-btn" id="enter-btn">Enter ${getData().dungeonsById[state.settings.selectedDungeon]?.name ?? 'Dungeon'} ▸</button>
      </div>
    </div>
  `;
  bindHub();
}

function renderDungeonBtn(dungeonId, state, dropLabel) {
  const dungeon = getData().dungeonsById[dungeonId];
  const isActive = state.settings.selectedDungeon === dungeonId;
  const ds = state.dungeons[dungeonId] ?? { highestFloor: 0 };
  return `
    <button class="dungeon-btn ${isActive ? 'active' : ''}" data-dungeon="${dungeonId}">
      <div class="name">${dungeon.name}</div>
      <div class="meta">Highest floor: ${ds.highestFloor} · Drops: ${dropLabel}</div>
    </button>
  `;
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
    <div class="party-slot" data-class="${classId}">
      <div>${cls.displayName}</div>
      <div class="role">${cls.tagline}</div>
    </div>
  `;
}

function bindHub() {
  document.getElementById('enter-btn').addEventListener('click', () => {
    enterDungeon(getState().settings.selectedDungeon || 'iron_vaults');
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Reset save and return to fresh state?')) {
      resetSave();
      showHub();
    }
  });
  for (const card of document.querySelectorAll('.roster-card[data-class]')) {
    const id = card.dataset.class;
    card.addEventListener('click', () => showUnitDetail(id));
    attachTooltip(card, () => buildClassTooltip(id));
  }
  for (const slot of document.querySelectorAll('.party-slot[data-class]')) {
    const id = slot.dataset.class;
    attachTooltip(slot, () => buildClassTooltip(id));
  }
  for (const btn of document.querySelectorAll('.dungeon-btn[data-dungeon]')) {
    btn.addEventListener('click', () => {
      getState().settings.selectedDungeon = btn.dataset.dungeon;
      persist();
      showHub();
    });
  }
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
  hideTooltip();
  stopBattle();
  const data = getData();
  const state = getState();
  const cls = data.classesById[classId];
  const unit = state.roster[classId];
  if (!cls || !unit) { showHub(); return; }

  const totalStats = computeUnitStats(cls, unit);
  const sortedStash = state.sharedStash.slice().sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

  const inParty = isInParty(classId);
  const party = state.party;
  const fullParty = party.length >= 6;

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
              ${STAT_KEYS.map(s => `<div class="stat" data-stat="${s}"><span class="k">${STAT_LABEL[s]}</span><b>${Math.round(totalStats[s])}</b></div>`).join('')}
            </div>
          </div>
          <div class="party-controls">
            ${renderPartyControls(classId, inParty, fullParty, party)}
            <button id="tree-btn" class="tree-btn-inline">Passive Tree (${pointsAvailable(classId)} pts)</button>
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
            <h2>Shared Stash <span class="stash-count">${sortedStash.length}</span></h2>
            <div class="stash-actions">
              <button id="salvage-rusted-btn" class="ghost">Salvage Rusted</button>
              <button id="salvage-common-btn" class="ghost">Salvage Rusted+Common</button>
              <button id="best-btn">Equip Best by Score</button>
            </div>
          </div>
          <div class="stash-list">
            ${sortedStash.length
              ? sortedStash.map(it => renderStashRow(it, classId)).join('')
              : `<div class="empty">No items yet — clear floors to fill the stash.</div>`}
          </div>
        </div>
      </div>
      <div class="dungeon-bar"><button id="hub-back-btn">Return to Hub</button></div>
    </div>
  `;
  bindUnitDetail(classId);
}

function renderPartyControls(classId, inParty, fullParty, party) {
  if (inParty) {
    const canRemove = party.length > 1;
    return `
      <div class="party-state in">In Party</div>
      <button id="remove-party-btn" ${canRemove ? '' : 'disabled'}>Remove from Party</button>
    `;
  }
  if (!fullParty) {
    return `
      <div class="party-state out">On Bench</div>
      <button id="add-party-btn">Add to Party</button>
    `;
  }
  return `
    <div class="party-state out">On Bench · party full</div>
    <div class="swap-grid">
      ${party.map((id, i) => `<button class="swap-btn" data-slot="${i}">Replace #${i + 1}: ${getData().classesById[id]?.displayName ?? id}</button>`).join('')}
    </div>
  `;
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
    <div class="ability-chip" data-slot-key="${slot}">
      <div class="chip-slot">${slot.toUpperCase()}</div>
      <div class="chip-name">${prettyAbility(aId)}</div>
      <div class="chip-lvl">stone L${lvl}</div>
    </div>
  `;
}

function renderStashRow(item, classId) {
  const usable = isItemUsableBy(item, classId);
  const dust = salvageValue(item);
  const stoneTag = item.kind === 'stone'
    ? `<span class="stone-tag${usable ? '' : ' incompat'}">${stoneLabel(item)}</span>`
    : '';
  return `
    <div class="stash-row r-${item.rarity}${usable ? '' : ' incompat'}" data-item="${item.id}">
      <div class="rcol name r-${item.rarity}">${item.displayName} ${stoneTag}</div>
      <div class="rcol stats">${itemStatsLine(item)}</div>
      <div class="rcol meta">Q ${(item.qualityScore * 100).toFixed(0)}%</div>
      <div class="rcol act">
        <button class="equip-btn" data-item="${item.id}" ${usable ? '' : 'disabled title="not compatible with this class"'}>Equip</button>
        <button class="salvage-btn" data-item="${item.id}" title="Salvage for ${dust} dust">↯ ${dust}</button>
      </div>
    </div>
  `;
}

function stoneLabel(item) {
  const cls = getData().classesById[item.forClassId];
  return `for ${cls?.displayName ?? '?'}`;
}

function itemStatsLine(item) {
  if (!item.stats) return '';
  return STAT_KEYS
    .filter(s => (item.stats[s] ?? 0) > 0)
    .map(s => `<span>${STAT_LABEL[s]} +${item.stats[s]}</span>`)
    .join(' ');
}

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

  // party controls
  const addBtn = document.getElementById('add-party-btn');
  if (addBtn) addBtn.addEventListener('click', () => { addToParty(classId); showUnitDetail(classId); });
  const remBtn = document.getElementById('remove-party-btn');
  if (remBtn) remBtn.addEventListener('click', () => { removeFromParty(classId); showUnitDetail(classId); });
  for (const btn of document.querySelectorAll('.swap-btn')) {
    btn.addEventListener('click', () => {
      swapPartyAt(Number(btn.dataset.slot), classId);
      showUnitDetail(classId);
    });
  }
  const treeBtn = document.getElementById('tree-btn');
  if (treeBtn) treeBtn.addEventListener('click', () => showTreeScreen(classId));

  // stash rows
  const salvageRusted = document.getElementById('salvage-rusted-btn');
  if (salvageRusted) salvageRusted.addEventListener('click', () => {
    const r = bulkSalvage(['rusted']);
    showUnitDetail(classId);
    if (r.count) flash(`Salvaged ${r.count} item(s) for ${r.dust} dust.`);
    else flash('No rusted items to salvage.');
  });
  const salvageCommon = document.getElementById('salvage-common-btn');
  if (salvageCommon) salvageCommon.addEventListener('click', () => {
    if (!confirm('Salvage all Rusted and Common items?')) return;
    const r = bulkSalvage(['rusted', 'common']);
    showUnitDetail(classId);
    if (r.count) flash(`Salvaged ${r.count} item(s) for ${r.dust} dust.`);
  });
  for (const row of document.querySelectorAll('.stash-row')) {
    const id = row.dataset.item;
    const item = getState().sharedStash.find(s => s.id === id);
    if (!item) continue;
    const equipBtn = row.querySelector('.equip-btn');
    if (equipBtn && !equipBtn.disabled) equipBtn.addEventListener('click', () => {
      equipItem(classId, item);
      showUnitDetail(classId);
    });
    const salvageBtn = row.querySelector('.salvage-btn');
    if (salvageBtn) salvageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dust = salvageItem(item.id);
      showUnitDetail(classId);
      flash(`Salvaged for ${dust} dust.`);
    });
    attachTooltip(row, () => buildStashTooltip(item, classId));
  }

  // equipped slots — click opens the item-management modal (reroll / unequip / salvage)
  for (const slot of document.querySelectorAll('.equip-slot:not(.empty):not(.starter)')) {
    slot.style.cursor = 'pointer';
    slot.title = 'Click to manage (reroll, unequip, salvage)';
    const itemId = slot.dataset.item;
    const item = Object.values(getState().roster[classId].equipment).find(it => it && it.id === itemId);
    slot.addEventListener('click', () => showItemModal(classId, slot.dataset.slot));
    if (item) attachTooltip(slot, () => buildEquippedTooltip(item));
  }

  // ability chips
  for (const chip of document.querySelectorAll('.ability-chip[data-slot-key]')) {
    attachTooltip(chip, () => buildAbilityTooltip(classId, chip.dataset.slotKey));
  }

  // detail-stats — base/per-level breakdown
  for (const stat of document.querySelectorAll('.detail-stats .stat[data-stat]')) {
    attachTooltip(stat, () => buildStatTooltip(classId, stat.dataset.stat));
  }
}

function bestSlotForItem(item, unit) {
  const candidates = slotsForItem(item);
  let best = candidates[0];
  let bestScore = currentSlotScore(unit, best);
  for (const s of candidates.slice(1)) {
    const score = currentSlotScore(unit, s);
    if (score < bestScore) { best = s; bestScore = score; }
  }
  return best;
}
function currentSlotScore(unit, slotId) {
  const it = unit.equipment[slotId];
  if (!it || it.isStarter) return -1;
  return it.qualityScore ?? 0;
}

function buildStashTooltip(item, classId) {
  const unit = getState().roster[classId];
  const usable = isItemUsableBy(item, classId);
  const dust = salvageValue(item);
  const stoneSection = item.kind === 'stone' ? buildStoneSection(item, classId, usable) : '';

  if (!usable) {
    return `
      <div class="t-title r-${item.rarity}">${item.displayName}</div>
      <div class="t-sub">${item.rarity.toUpperCase()} · ${item.kind}</div>
      ${stoneSection}
      <div class="t-section">STAT ROLLS</div>
      <div class="t-grid">${STAT_KEYS.map(s => `<div class="t-row"><span>${STAT_LABEL[s]}</span><span>${item.stats[s] ?? 0}</span></div>`).join('')}</div>
      <div class="t-foot">Not equippable on this class · Salvage for ${dust} dust</div>
    `;
  }

  const slot = bestSlotForItem(item, unit);
  const cur = unit.equipment[slot];
  const showStarter = cur && cur.isStarter;
  const lines = STAT_KEYS.map(s => {
    const a = (cur && !cur.isStarter) ? (cur.stats[s] ?? 0) : 0;
    const b = item.stats[s] ?? 0;
    const diff = b - a;
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'eq';
    const sign = diff > 0 ? '+' : '';
    return `<div class="t-row"><span>${STAT_LABEL[s]}</span><span class="${cls}">${sign}${diff}</span></div>`;
  }).join('');
  return `
    <div class="t-title r-${item.rarity}">${item.displayName}</div>
    <div class="t-sub">${item.rarity.toUpperCase()} · target slot: ${SLOT_LABEL[slot] ?? slot}</div>
    ${stoneSection}
    <div class="t-section">STAT DIFF vs EQUIPPED</div>
    <div class="t-grid">${lines}</div>
    <div class="t-foot">${showStarter ? 'Replaces starter (no stats lost)' : (cur ? `Replaces ${cur.displayName}` : 'Equips into empty slot')} · Salvage ${dust} dust</div>
  `;
}

function buildStoneSection(item, classId, usable) {
  const data = getData();
  const cls = data.classesById[item.forClassId];
  const ability = data.abilitiesById[item.abilityId];
  if (!ability) return '';
  return `
    <div class="t-section">STONE</div>
    <div class="t-row"><span>For class</span><span>${cls?.displayName ?? item.forClassId} ${usable ? '' : '<span class="dim">(not this unit)</span>'}</span></div>
    <div class="t-row"><span>Boosts ability</span><span>${prettyAbility(item.abilityId)}</span></div>
    <div class="t-row"><span>Ability level</span><span>${item.abilityLevel} / 100</span></div>
  `;
}

function buildEquippedTooltip(item) {
  const lines = STAT_KEYS
    .filter(s => (item.stats?.[s] ?? 0) > 0)
    .map(s => `<div class="t-row"><span>${STAT_LABEL[s]}</span><span>+${item.stats[s]}</span></div>`)
    .join('');
  return `
    <div class="t-title r-${item.rarity}">${item.displayName}</div>
    <div class="t-sub">${item.rarity.toUpperCase()} · Quality ${(item.qualityScore * 100).toFixed(0)}%</div>
    <div class="t-grid">${lines || '<div class="t-row"><span>(no stat rolls)</span></div>'}</div>
    <div class="t-foot">Click to unequip → stash</div>
  `;
}

// ============================================================================
// Ability / class / stat tooltip builders
// ============================================================================

const STAT_HELP = {
  hp:   ['Health', 'Pool of damage you can absorb. 0 HP = downed.'],
  mp:   ['Mana', 'Spell currency. Regenerates at 5%/sec in combat.'],
  patk: ['Physical Attack', 'Scales physical damage abilities.'],
  matk: ['Magical Attack', 'Scales magical damage abilities.'],
  pdef: ['Physical Defense', 'Reduces physical damage taken.'],
  mdef: ['Magical Defense', 'Reduces magical damage taken.']
};

function buildStatTooltip(classId, stat) {
  const data = getData();
  const cls = data.classesById[classId];
  const unit = getState().roster[classId];
  const base = cls.baseStats[stat] ?? 0;
  const perLvl = cls.perLevelStats[stat] ?? 0;
  const fromLevel = perLvl * (unit.level - 1);
  const fromGear = STAT_KEYS.reduce((acc, _) => acc, 0); // placeholder
  let gear = 0;
  for (const slotId in unit.equipment) {
    const it = unit.equipment[slotId];
    if (it && it.stats) gear += it.stats[stat] ?? 0;
  }
  const total = base + fromLevel + gear;
  const help = STAT_HELP[stat] ?? [STAT_LABEL[stat], ''];
  return `
    <div class="t-title">${help[0]}</div>
    <div class="t-sub">${STAT_LABEL[stat]} · total <b>${Math.round(total)}</b></div>
    ${help[1] ? `<div class="t-desc">${help[1]}</div>` : ''}
    <div class="t-grid">
      <div class="t-row"><span>Base</span><span>${base}</span></div>
      <div class="t-row"><span>From level (${unit.level - 1} × ${perLvl})</span><span>${fromLevel.toFixed(1)}</span></div>
      <div class="t-row"><span>From gear</span><span>${gear}</span></div>
    </div>
  `;
}

function buildAbilityTooltip(classId, slotKey) {
  const data = getData();
  const cls = data.classesById[classId];
  const unit = getState().roster[classId];
  const abilityId = cls.abilities[slotKey];
  const ability = data.abilitiesById[abilityId];
  if (!ability) return `<div class="t-title">${prettyAbility(abilityId)}</div>`;
  const stoneItem = unit.equipment[`stone_${slotKey}`];
  const stoneLevel = stoneItem?.abilityLevel ?? 1;
  const isStarter = !!stoneItem?.isStarter;

  const scalingRows = Object.entries(ability.scaling || {})
    .map(([k, ep]) => {
      const cur = scaleParam(ability.scaling, k, stoneLevel);
      const min = ep.min, max = ep.max;
      const same = min === max;
      return `<div class="t-row">
        <span>${humanizeScalingKey(k)}</span>
        <span><b>${formatScalingValue(k, cur)}</b>${same ? '' : ` <span class="dim">(${formatScalingValue(k, min)}→${formatScalingValue(k, max)})</span>`}</span>
      </div>`;
    }).join('');

  const effectsList = ability.effects
    .map(e => `<li>${humanizeEffect(e, ability, stoneLevel)}</li>`)
    .join('');

  const slotLabels = { attack: 'ATTACK', spell1: 'SPELL I', spell2: 'SPELL II', passive: 'PASSIVE' };
  const meta = [
    slotLabels[slotKey],
    ability.school,
    ability.type === 'passive' ? null : (ability.manaCost > 0 ? `${ability.manaCost} MP` : 'no cost')
  ].filter(Boolean).join(' · ');

  return `
    <div class="t-title">${prettyAbility(abilityId)}</div>
    <div class="t-sub">${meta}</div>
    ${scalingRows ? `<div class="t-section">SCALING (stone L${stoneLevel}${isStarter ? ' · starter' : ''})</div><div class="t-grid">${scalingRows}</div>` : ''}
    <div class="t-section">EFFECTS</div>
    <ul class="t-effects">${effectsList}</ul>
  `;
}

function buildClassTooltip(classId) {
  const data = getData();
  const cls = data.classesById[classId];
  if (!cls) return '';
  const unit = getState().roster[classId];
  const fam = data.familiesById[cls.family];
  const inParty = isInParty(classId);
  const slotLabels = { attack: 'Attack', spell1: 'Spell I', spell2: 'Spell II', passive: 'Passive' };
  const abilities = ['attack', 'spell1', 'spell2', 'passive'].map(s =>
    `<div class="t-row"><span>${slotLabels[s]}</span><span>${prettyAbility(cls.abilities[s])}</span></div>`
  ).join('');
  return `
    <div class="t-title">${cls.displayName}</div>
    <div class="t-sub">${fam?.name ?? cls.family} · ${cls.statFocus.map(s => STAT_LABEL[s]).join(' / ')}</div>
    <div class="t-desc">${cls.tagline}.</div>
    <div class="t-section">ABILITIES</div>
    <div class="t-grid">${abilities}</div>
    ${unit ? `<div class="t-foot">Lvl ${unit.level} · ${inParty ? 'In party' : 'On bench'}</div>` : ''}
  `;
}

function flash(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// ============================================================================
// ITEM MANAGEMENT MODAL (reroll / unequip / salvage)
// ============================================================================
function showItemModal(classId, slotId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay item-modal-overlay';
  document.body.appendChild(overlay);

  const renderInner = () => {
    const item = getState().roster[classId].equipment[slotId];
    if (!item) { overlay.remove(); showUnitDetail(classId); return; }
    const cost = rerollCost(item);
    const dust = getState().currencies.dust;
    const dustVal = salvageValue(item);
    overlay.innerHTML = `
      <div class="modal item-modal r-${item.rarity}">
        <h1 class="r-${item.rarity}">${item.displayName}</h1>
        <div class="sub">${item.rarity.toUpperCase()} · Quality <b>${(item.qualityScore * 100).toFixed(0)}%</b> · Lvl ${item.level} · slot ${SLOT_LABEL[slotId] ?? slotId}</div>
        ${item.kind === 'stone' ? `<div class="sub stone">Boosts ${prettyAbility(item.abilityId)} · ability L${item.abilityLevel}/100</div>` : ''}
        <div class="reroll-grid">
          ${STAT_KEYS.map(s => {
            const max = (s === item.namesake) ? 2 * item.level : item.level;
            const cur = item.stats[s] ?? 0;
            const isNamesake = s === item.namesake;
            return `
              <div class="reroll-row${isNamesake ? ' namesake' : ''}">
                <span class="rstat">${STAT_LABEL[s]}${isNamesake ? ' ★' : ''}</span>
                <span class="rval">+${cur}<span class="dim"> / ${max}</span></span>
                <button class="reroll-btn" data-stat="${s}" ${dust < cost ? 'disabled title="not enough dust"' : ''}>↻ ${cost} dust</button>
              </div>
            `;
          }).join('')}
        </div>
        <div class="modal-foot">Dust: <b>${dust}</b> · Salvaging this item yields <b>${dustVal} dust</b></div>
        <div class="actions">
          <button id="modal-unequip">Unequip</button>
          <button id="modal-salvage" class="ghost">Salvage</button>
          <button id="modal-close">Close</button>
        </div>
      </div>
    `;
    for (const btn of overlay.querySelectorAll('.reroll-btn')) {
      btn.addEventListener('click', () => {
        const r = rerollItemStat(classId, slotId, btn.dataset.stat);
        if (r) flash(`${STAT_LABEL[btn.dataset.stat]} rerolled: ${r.oldValue} → ${r.newValue} (${r.cost} dust)`);
        renderInner();
      });
    }
    overlay.querySelector('#modal-unequip').addEventListener('click', () => {
      unequipSlot(classId, slotId);
      overlay.remove();
      showUnitDetail(classId);
    });
    overlay.querySelector('#modal-salvage').addEventListener('click', () => {
      if (!confirm('Salvage this item for dust?')) return;
      // Move to stash first, then salvage by id
      unequipSlot(classId, slotId);
      const stash = getState().sharedStash;
      const last = stash[stash.length - 1];
      if (last) {
        const got = salvageItem(last.id);
        if (got > 0) flash(`Salvaged for ${got} dust.`);
      }
      overlay.remove();
      showUnitDetail(classId);
    });
    overlay.querySelector('#modal-close').addEventListener('click', () => {
      overlay.remove();
      showUnitDetail(classId);
    });
  };

  renderInner();
  // Click outside the inner modal to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      showUnitDetail(classId);
    }
  });
}

// ============================================================================
// PASSIVE-TREE SCREEN
// ============================================================================
let _treeView = null;

function showTreeScreen(classId) {
  hideTooltip();
  stopBattle();
  destroyTreeView();

  const data = getData();
  const cls = data.classesById[classId];
  if (!cls) { showHub(); return; }
  const unit = getState().roster[classId];

  root().innerHTML = `
    <div class="tree-screen">
      <div class="topbar">
        <button id="tree-back" class="back" style="margin-right: 16px;">← ${cls.displayName}</button>
        <div class="title">PASSIVE TREE</div>
        <div class="currencies">
          <div class="cur">Lvl <b>${unit.level}</b></div>
          <div class="cur">Allocated <b id="tree-alloc-count">${unit.allocatedNodes.length}</b></div>
          <div class="cur">Points <b id="tree-points">${pointsAvailable(classId)}</b></div>
        </div>
        <button id="tree-refund" style="margin-left: 16px;">Refund All</button>
      </div>
      <div class="tree-stage">
        <canvas id="tree-canvas"></canvas>
        <div class="tree-legend">
          <div><span class="dot stat"></span> Stat</div>
          <div><span class="dot notable"></span> Notable</div>
          <div><span class="dot keystone"></span> Keystone</div>
          <div class="hint">Drag to pan · Scroll to zoom · Click node to allocate</div>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('tree-canvas');
  _treeView = createTreeView(canvas, classId, {
    onClickNode(node) {
      if (canAllocate(classId, node.id)) {
        if (allocateNode(classId, node.id)) {
          updateTreeHud(classId);
          _treeView?.draw();
        }
      } else if (getAllocated(classId).has(node.id)) {
        flash('Already allocated · use Refund All to reset.');
      } else {
        const reason = pointsAvailable(classId) <= 0
          ? 'No points available — level up to earn more.'
          : 'Path not connected to your tree yet.';
        flash(reason);
      }
    },
    onHover(node, e) {
      if (!node || !e) { hideTooltip(); return; }
      showTooltipAt(buildNodeTooltip(node, classId), e.clientX, e.clientY, '__tree__');
    }
  });
  _treeView.resize();

  document.getElementById('tree-back').addEventListener('click', () => {
    destroyTreeView();
    showUnitDetail(classId);
  });
  document.getElementById('tree-refund').addEventListener('click', () => {
    if (!confirm('Refund all allocated nodes? Start node stays.')) return;
    refundAll(classId);
    updateTreeHud(classId);
    _treeView?.draw();
  });
  window.addEventListener('resize', onTreeResize);
}

function onTreeResize() { _treeView?.resize(); }
function destroyTreeView() {
  window.removeEventListener('resize', onTreeResize);
  if (_treeView) { _treeView.destroy(); _treeView = null; }
}

function updateTreeHud(classId) {
  const unit = getState().roster[classId];
  const ptsEl = document.getElementById('tree-points');
  const allocEl = document.getElementById('tree-alloc-count');
  if (ptsEl) ptsEl.textContent = pointsAvailable(classId);
  if (allocEl) allocEl.textContent = unit.allocatedNodes.length;
}

function buildNodeTooltip(node, classId) {
  const allocated = getAllocated(classId);
  const isAlloc = allocated.has(node.id);
  const canAlloc = !isAlloc && canAllocate(classId, node.id);
  const kindLabel = ({ stat: 'STAT', notable: 'NOTABLE', keystone: 'KEYSTONE', connector: 'CONNECTOR' })[node.kind] ?? node.kind.toUpperCase();
  const statLines = (node.effects ?? []).map(eff => {
    if (eff.type === 'stat') {
      if (eff.amount !== undefined)    return `<div class="t-row"><span>${statLabel(eff.stat)}</span><span class="up">+${eff.amount}</span></div>`;
      if (eff.amountPct !== undefined) return `<div class="t-row"><span>${statLabel(eff.stat)}</span><span class="up">+${eff.amountPct}%</span></div>`;
    }
    if (eff.type === 'keystone') {
      return `<div class="t-row"><span>Keystone</span><span><b>${eff.flag}</b></span></div>`;
    }
    return '';
  }).join('');
  const status = isAlloc ? '<span class="up">ALLOCATED</span>' : (canAlloc ? '<span class="dim">Available · click to allocate</span>' : '<span class="down">Locked · path not reached</span>');
  return `
    <div class="t-title">${node.name ?? kindLabel}</div>
    <div class="t-sub">${kindLabel}</div>
    <div class="t-grid">${statLines || '<div class="t-row"><span>(no effects)</span></div>'}</div>
    <div class="t-foot">${status}</div>
  `;
}

// ============================================================================
// BATTLE-SIDE TOOLTIP CONTENT
// ============================================================================
const STATUS_LABEL = {
  stunned: 'Stunned', frozen: 'Frozen', silenced: 'Silenced', blinded: 'Blinded',
  rooted: 'Rooted', slowed: 'Slowed', untargetable: 'Untargetable'
};

function buildBattleTooltip(unit, battle) {
  const now = battle.now;
  const isEnemy = !!unit.isEnemy;
  const buffs   = (unit.buffs ?? []).filter(b => b.expires > now && !b.dynamic && (b.amountPct ?? 0) !== 0);
  const dynamic = (unit.buffs ?? []).filter(b => b.dynamic && (b.amountPct ?? 0) !== 0);
  const dots    = (unit.dots ?? []).filter(d => d.expires > now);
  const shields = (unit.shields ?? []).filter(s => s.expires > now && s.amount > 0);
  const statuses = Object.entries(unit.statuses ?? {}).filter(([_, t]) => t > now);
  const tauntedBy = unit.tauntedBy && unit.tauntedBy.expires > now ? unit.tauntedBy.caster?.displayName : null;

  const stat = (k) => Math.round(effectiveStat(unit, k, now));
  const critChance = sumBuffPct(unit, 'critChancePct', now);
  const dodgeChance = sumBuffPct(unit, 'dodgePct', now);

  const cdRows = !isEnemy ? Object.entries(unit.abilities ?? {})
    .filter(([slot, a]) => a && a.ability && a.ability.type !== 'passive')
    .map(([slot, a]) => `<div class="t-row"><span>${slotShort(slot)}: ${prettyAbility(a.id)}</span><span>${a.cooldown > 0.05 ? a.cooldown.toFixed(1) + 's' : '<b style="color:var(--verdant)">ready</b>'}${a.ability.manaCost > unit.mp ? ' <span class="dim">(no MP)</span>' : ''}</span></div>`)
    .join('') : '';

  return `
    <div class="t-title">${unit.displayName} ${isEnemy ? '<span class="dim" style="font-size:10px">— enemy</span>' : ''}</div>
    <div class="t-sub">${isEnemy ? 'enemy' : 'party'} · ${unit.row} row · lvl ${unit.level}${tauntedBy ? ` · taunted by ${tauntedBy}` : ''}</div>
    <div class="t-section">RESOURCES</div>
    <div class="t-grid">
      <div class="t-row"><span>HP</span><span><b>${Math.round(unit.hp)}</b> / ${unit.maxHp}</span></div>
      ${unit.maxMp ? `<div class="t-row"><span>MP</span><span><b>${Math.round(unit.mp)}</b> / ${unit.maxMp}</span></div>` : ''}
      ${shields.length ? `<div class="t-row"><span>Shields</span><span>${shields.reduce((a, s) => a + Math.max(0, Math.round(s.amount)), 0)}</span></div>` : ''}
    </div>
    <div class="t-section">STATS (effective)</div>
    <div class="t-grid">
      <div class="t-row"><span>P.ATK</span><span>${stat('patk')}</span></div>
      <div class="t-row"><span>P.DEF</span><span>${stat('pdef')}</span></div>
      <div class="t-row"><span>M.ATK</span><span>${stat('matk')}</span></div>
      <div class="t-row"><span>M.DEF</span><span>${stat('mdef')}</span></div>
      ${critChance ? `<div class="t-row"><span>Crit</span><span>${critChance.toFixed(0)}%</span></div>` : ''}
      ${dodgeChance ? `<div class="t-row"><span>Dodge</span><span>${dodgeChance.toFixed(0)}%</span></div>` : ''}
    </div>
    ${buffs.length ? `<div class="t-section">BUFFS</div><div class="t-list">${buffs.map(b => `<div class="t-row"><span>${statLabel(b.stat)}</span><span><span class="${b.amountPct > 0 ? 'up' : 'down'}">${b.amountPct > 0 ? '+' : ''}${b.amountPct.toFixed(0)}%</span> · ${b.expires === Infinity ? '∞' : (b.expires - now).toFixed(1) + 's'}</span></div>`).join('')}</div>` : ''}
    ${dynamic.length ? `<div class="t-section">SCALED</div><div class="t-list">${dynamic.map(b => `<div class="t-row"><span>${statLabel(b.stat)}</span><span class="${b.amountPct > 0 ? 'up' : 'down'}">${b.amountPct > 0 ? '+' : ''}${b.amountPct.toFixed(0)}%</span></div>`).join('')}</div>` : ''}
    ${dots.length ? `<div class="t-section">DOTS</div><div class="t-list">${dots.map(d => `<div class="t-row"><span>${d.tag}</span><span>${(d.dpsPct * 100).toFixed(1)}%/s · ${(d.expires - now).toFixed(1)}s</span></div>`).join('')}</div>` : ''}
    ${statuses.length ? `<div class="t-section">STATUS</div><div class="t-list">${statuses.map(([k, t]) => `<div class="t-row"><span>${STATUS_LABEL[k] ?? prettyKey(k)}</span><span>${(t - now).toFixed(1)}s</span></div>`).join('')}</div>` : ''}
    ${cdRows ? `<div class="t-section">COOLDOWNS</div><div class="t-list">${cdRows}</div>` : ''}
  `;
}

function slotShort(slot) {
  return ({ attack: 'Atk', spell1: 'S1', spell2: 'S2' })[slot] ?? slot;
}
function prettyKey(s) { return (s ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

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
        <button id="auto-btn" class="${state.settings.autoProgress ? 'active' : ''}" title="Auto-dismiss loot/unlock cards between floors">Auto ${state.settings.autoProgress ? 'on' : 'off'}</button>
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
  document.getElementById('auto-btn').addEventListener('click', () => {
    const s = getState().settings;
    s.autoProgress = !s.autoProgress;
    persist();
    const btn = document.getElementById('auto-btn');
    btn.classList.toggle('active', s.autoProgress);
    btn.textContent = `Auto ${s.autoProgress ? 'on' : 'off'}`;
  });
  document.getElementById('hub-btn').addEventListener('click', () => {
    if (confirm('Return to hub? Run will be paused; you can re-enter the dungeon to continue.')) {
      stopBattle();
      showHub();
    }
  });
  window.addEventListener('resize', resizeCanvas);

  // canvas hover → battle tooltip (live-updated by render loop)
  const canvas = document.getElementById('battle-canvas');
  canvas.addEventListener('mousemove', onCanvasMove);
  canvas.addEventListener('mouseleave', () => {
    _hoveredUnit = null;
    canvas.style.cursor = 'default';
    hideTooltip();
  });
}

let _hoveredUnit = null;
let _hoverEvent = null;

function onCanvasMove(e) {
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const unit = findUnitAt(_activeBattle, x, y);
  _hoveredUnit = unit;
  _hoverEvent = e;
  if (unit) {
    canvas.style.cursor = 'help';
    showTooltipAt(buildBattleTooltip(unit, _activeBattle), e.clientX, e.clientY, '__battle__');
  } else {
    canvas.style.cursor = 'default';
    hideTooltip();
  }
}

function findUnitAt(battle, x, y) {
  if (!battle) return null;
  const HW = 50, HH = 60;
  // enemies first so they win ties when overlapping a player slot
  for (const u of [...battle.enemyUnits, ...battle.playerUnits]) {
    if (!u.screen) continue;
    if (Math.abs(x - u.screen.x) < HW && Math.abs(y - u.screen.y) < HH) return u;
  }
  return null;
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
      // refresh battle tooltip in place if hovering a unit (HP, CDs, dots tick live)
      if (_hoveredUnit && !_hoveredUnit.dead && isTooltipShowing()) {
        updateTooltipContent(buildBattleTooltip(_hoveredUnit, _activeBattle));
      } else if (_hoveredUnit && _hoveredUnit.dead) {
        _hoveredUnit = null;
        hideTooltip();
      }
    }
    _renderHandle = requestAnimationFrame(frame);
  };
  _renderHandle = requestAnimationFrame(frame);
}

function stopBattle() {
  cancelAnimationFrame(_renderHandle);
  _renderHandle = null;
  _activeBattle = null;
  _hoveredUnit = null;
  hideTooltip();
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
    setTimeout(() => { if (_activeBattle === b) onFloorCleared(); }, 1100);
  } else if (b.status === 'wiped' && !b._handled) {
    b._handled = true;
    setTimeout(() => { if (_activeBattle === b) onWipe(); }, 800);
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

  // class-unlock milestones
  const newlyUnlocked = processFloorUnlocks(battle.floor);
  for (const id of newlyUnlocked) {
    battle.log.push({ type: 'floor', text: `Class unlocked: ${getData().classesById[id]?.displayName ?? id}.`, t: battle.now });
  }

  ds.currentRunFloor = battle.floor + 1;
  persist();
  showLootCard(loot, () => {
    if (newlyUnlocked.length) {
      showClassUnlockCard(newlyUnlocked, () => advanceFloor());
    } else {
      advanceFloor();
    }
  });
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
  const auto = getState().settings.autoProgress;
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
        <button id="loot-continue">${auto ? 'Continue ▸ (auto)' : 'Continue ▸'}</button>
      </div>
    </div>
  `;
  stage.appendChild(overlay);
  let timer = null;
  const trigger = () => {
    if (timer) clearTimeout(timer);
    overlay.remove();
    onClose();
  };
  overlay.querySelector('#loot-continue').addEventListener('click', trigger);
  if (auto) timer = setTimeout(trigger, 1500);
}

function showClassUnlockCard(classIds, onClose) {
  const data = getData();
  const stage = document.getElementById('stage');
  const overlay = document.createElement('div');
  overlay.className = 'loot-overlay';
  const auto = getState().settings.autoProgress;
  overlay.innerHTML = `
    <div class="loot-card r-legendary">
      <div class="title">CLASS UNLOCKED</div>
      ${classIds.map(id => {
        const cls = data.classesById[id];
        if (!cls) return '';
        const fam = data.familiesById[cls.family];
        return `
          <div class="name r-legendary">${cls.displayName}</div>
          <div class="lvl">${fam?.name ?? cls.family} · ${cls.tagline}</div>
        `;
      }).join('<hr style="border:none;border-top:1px solid var(--ink-muted);margin:14px 0;opacity:0.4">')}
      <div class="quality" style="margin-top: 16px">Available in your roster. Visit the hub to add to party.</div>
      <div class="actions">
        <button id="unlock-continue">${auto ? 'Continue ▸ (auto)' : 'Continue ▸'}</button>
      </div>
    </div>
  `;
  stage.appendChild(overlay);
  let timer = null;
  const trigger = () => {
    if (timer) clearTimeout(timer);
    overlay.remove();
    onClose();
  };
  overlay.querySelector('#unlock-continue').addEventListener('click', trigger);
  // class unlocks get a slightly longer auto-pause so the player notices the new class
  if (auto) timer = setTimeout(trigger, 2200);
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
