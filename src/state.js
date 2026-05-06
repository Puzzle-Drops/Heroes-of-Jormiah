import { storage } from './storage.js';

let _data = null;
let _state = null;

export function initState(data, savedState) {
  _data = data;
  _state = savedState ?? defaultSave(data);
  ensureRosterCovers(_state, data);
  return _state;
}

export function getState() { return _state; }
export function getData()  { return _data; }
export function persist()  { storage.save(_state); }

export function resetSave() {
  storage.clear();
  _state = defaultSave(_data);
  return _state;
}

function defaultSave(data) {
  const starters = data.starter_classes.verticalSlice_M1.classIds;
  const roster = {};
  for (const id of starters) {
    const cls = data.classesById[id];
    if (cls) roster[id] = makeFreshUnit(cls);
  }
  return {
    saveVersion: 2,
    currencies: { gold: 0, dust: 0, spirit: 0 },
    roster,
    sharedStash: [],
    party: starters.slice(0, 6),
    dungeons: { iron_vaults: { highestFloor: 0, currentRunFloor: null } },
    settings: { speed: 1, autoCast: true }
  };
}

function ensureRosterCovers(state, data) {
  const starters = data.starter_classes.verticalSlice_M1.classIds;
  for (const id of starters) {
    if (!state.roster[id]) state.roster[id] = makeFreshUnit(data.classesById[id]);
  }
  if (!state.party || state.party.length === 0) state.party = starters.slice(0, 6);
  // v0.1 -> v0.2 migration: move per-unit inventories into sharedStash
  if (!Array.isArray(state.sharedStash)) state.sharedStash = [];
  for (const id in state.roster) {
    const u = state.roster[id];
    if (Array.isArray(u.inventory) && u.inventory.length) {
      for (const item of u.inventory) state.sharedStash.push(item);
      u.inventory = [];
    }
    delete u.inventory;
  }
  state.saveVersion = 2;
}

function makeFreshUnit(cls) {
  return {
    classId: cls.id,
    level: 1,
    xp: 0,
    equipment: {
      weapon: null,
      helm: null, chest: null, legs: null, gloves: null, boots: null,
      ring1: null, ring2: null, amulet: null,
      stone_attack:  starterStone(cls.abilities.attack),
      stone_spell1:  starterStone(cls.abilities.spell1),
      stone_spell2:  starterStone(cls.abilities.spell2),
      stone_passive: starterStone(cls.abilities.passive)
    }
  };
}

// ============================================================================
// Inventory / equip helpers
// ============================================================================

const RING_SLOTS = ['ring1', 'ring2'];

export function dropItemToStash(item) {
  _state.sharedStash.push(item);
}

export function addItemsToStash(items) {
  for (const it of items) _state.sharedStash.push(it);
}

export function slotsForItem(item) {
  // Stones lock to their specific slot id; rings can land in either ring slot.
  if (item.kind === 'stone') return [item.slotId];
  if (item.slotId === 'ring1' || item.slotId === 'ring2') return RING_SLOTS;
  return [item.slotId];
}

export function equipItem(classId, item, preferredSlot) {
  const unit = _state.roster[classId];
  if (!unit) return false;
  const candidates = slotsForItem(item);
  const slot = candidates.includes(preferredSlot) ? preferredSlot : candidates[0];
  if (!slot) return false;
  // remove from stash
  const idx = _state.sharedStash.findIndex(s => s.id === item.id);
  if (idx === -1) return false;
  _state.sharedStash.splice(idx, 1);
  // swap whatever's there back to stash
  const previous = unit.equipment[slot];
  if (previous && !previous.isStarter) _state.sharedStash.push(previous);
  unit.equipment[slot] = item;
  persist();
  return true;
}

export function unequipSlot(classId, slotId) {
  const unit = _state.roster[classId];
  if (!unit) return false;
  const item = unit.equipment[slotId];
  if (!item || item.isStarter) return false;
  unit.equipment[slotId] = null;
  _state.sharedStash.push(item);
  persist();
  return true;
}

export function equipBestByScore(classId) {
  const unit = _state.roster[classId];
  if (!unit) return 0;
  let changes = 0;
  // Sort stash by quality desc so we eat the best items first.
  const sorted = _state.sharedStash.slice().sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
  for (const item of sorted) {
    const candidates = slotsForItem(item);
    for (const slot of candidates) {
      const cur = unit.equipment[slot];
      const curScore = cur && !cur.isStarter ? (cur.qualityScore ?? 0) : -1;
      if ((item.qualityScore ?? 0) > curScore) {
        if (equipItem(classId, item, slot)) { changes++; }
        break;
      }
    }
  }
  return changes;
}

function starterStone(abilityId) {
  return {
    id: `starter_${abilityId}`,
    kind: 'stone',
    abilityId,
    abilityLevel: 1,
    statLevel: 1,
    namesake: null,
    stats: { hp: 0, mp: 0, patk: 0, matk: 0, pdef: 0, mdef: 0 },
    qualityScore: 0,
    rarity: 'rusted',
    isStarter: true
  };
}
