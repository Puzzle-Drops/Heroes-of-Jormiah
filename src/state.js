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

// Class unlocks earned by clearing a floor. Order matters for "next unlock"
// hints. Keep additions to this list intentional — designers will tune.
export const FLOOR_UNLOCKS = [
  { floor: 3,  classId: 'bard' },
  { floor: 6,  classId: 'engineer' },
  { floor: 10, classId: 'druid' },
  { floor: 15, classId: 'sniper' },
  { floor: 20, classId: 'necromancer' },
  { floor: 25, classId: 'crusader' },
  { floor: 30, classId: 'samurai' },
  { floor: 40, classId: 'shadowdancer' },
  { floor: 50, classId: 'paladin' }
];

function defaultSave(data) {
  const starters = data.starter_classes.verticalSlice_M1.classIds;
  const roster = {};
  for (const id of starters) {
    const cls = data.classesById[id];
    if (cls) roster[id] = makeFreshUnit(cls);
  }
  return {
    saveVersion: 4,
    currencies: { gold: 0, dust: 0, spirit: 0 },
    roster,
    sharedStash: [],
    unlockedClasses: starters.slice(),
    party: starters.slice(0, 6),
    dungeons: {
      iron_vaults:     { highestFloor: 0, currentRunFloor: null },
      shattered_spire: { highestFloor: 0, currentRunFloor: null }
    },
    settings: { speed: 1, autoCast: true, selectedDungeon: 'iron_vaults' }
  };
}

function ensureRosterCovers(state, data) {
  const starters = data.starter_classes.verticalSlice_M1.classIds;
  for (const id of starters) {
    if (!state.roster[id]) state.roster[id] = makeFreshUnit(data.classesById[id]);
  }
  if (!state.party || state.party.length === 0) state.party = starters.slice(0, 6);
  if (!Array.isArray(state.sharedStash)) state.sharedStash = [];
  // v0.1 -> v0.2 migration
  for (const id in state.roster) {
    const u = state.roster[id];
    if (Array.isArray(u.inventory) && u.inventory.length) {
      for (const item of u.inventory) state.sharedStash.push(item);
      u.inventory = [];
    }
    delete u.inventory;
  }
  // v0.2 -> v0.3 migration
  if (!Array.isArray(state.unlockedClasses)) state.unlockedClasses = Object.keys(state.roster);
  // v0.3 -> v0.4 migration: shattered_spire dungeon + selectedDungeon
  if (!state.dungeons.shattered_spire) state.dungeons.shattered_spire = { highestFloor: 0, currentRunFloor: null };
  if (!state.settings.selectedDungeon) state.settings.selectedDungeon = 'iron_vaults';
  state.saveVersion = 4;
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

// Stones are class-locked: a Fireball Stone (Pyromancer's spell1 ability) only
// fits Pyromancer's stone_spell1 slot. Non-stone items are class-agnostic.
export function canEquip(item, classId, slotId) {
  if (!slotsForItem(item).includes(slotId)) return false;
  if (item.kind !== 'stone') return true;
  const cls = _data.classesById[classId];
  if (!cls) return false;
  const slotKey = slotId.replace('stone_', '');
  return cls.abilities[slotKey] === item.abilityId;
}

export function isItemUsableBy(item, classId) {
  return slotsForItem(item).some(slot => canEquip(item, classId, slot));
}

export function equipItem(classId, item, preferredSlot) {
  const unit = _state.roster[classId];
  if (!unit) return false;
  const candidates = slotsForItem(item).filter(slot => canEquip(item, classId, slot));
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
    const candidates = slotsForItem(item).filter(slot => canEquip(item, classId, slot));
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

// ============================================================================
// Salvage — convert stash items to Dust per GDD §15.2
// ============================================================================
const SALVAGE_MULT = {
  rusted: 0.20, common: 0.50, rare: 1.00,
  epic:   2.50, mythic: 6.00, legendary: 15.0, radiant: 40.0
};

export function salvageValue(item) {
  const mult = SALVAGE_MULT[item.rarity] ?? 0.5;
  return Math.max(1, Math.round((item.level || 1) * mult));
}

export function salvageItem(itemId) {
  const idx = _state.sharedStash.findIndex(s => s.id === itemId);
  if (idx === -1) return 0;
  const item = _state.sharedStash[idx];
  const dust = salvageValue(item);
  _state.sharedStash.splice(idx, 1);
  _state.currencies.dust += dust;
  persist();
  return dust;
}

export function bulkSalvage(rarities) {
  let totalDust = 0;
  let count = 0;
  // iterate copy so we don't mutate the array we're iterating
  const ids = _state.sharedStash.filter(it => rarities.includes(it.rarity)).map(it => it.id);
  for (const id of ids) {
    const got = salvageItem(id);
    if (got > 0) { totalDust += got; count++; }
  }
  return { count, dust: totalDust };
}

// ============================================================================
// Class unlock + party management
// ============================================================================

export function isUnlocked(classId)  { return _state.unlockedClasses.includes(classId); }
export function isInParty(classId)   { return _state.party.includes(classId); }
export function getBench()           { return _state.unlockedClasses.filter(id => !_state.party.includes(id)); }

export function unlockClass(classId) {
  if (_state.unlockedClasses.includes(classId)) return false;
  _state.unlockedClasses.push(classId);
  if (!_state.roster[classId]) {
    const cls = _data.classesById[classId];
    if (cls) _state.roster[classId] = makeFreshUnit(cls);
  }
  persist();
  return true;
}

// Process unlocks earned by clearing a floor. Returns the list of newly
// unlocked class ids.
export function processFloorUnlocks(floor) {
  const newly = [];
  for (const u of FLOOR_UNLOCKS) {
    if (u.floor === floor && !_state.unlockedClasses.includes(u.classId)) {
      if (unlockClass(u.classId)) newly.push(u.classId);
    }
  }
  return newly;
}

export function getNextUnlock(currentMaxFloor) {
  for (const u of FLOOR_UNLOCKS) {
    if (u.floor > currentMaxFloor && !_state.unlockedClasses.includes(u.classId)) return u;
  }
  return null;
}

export function addToParty(classId) {
  if (!isUnlocked(classId) || isInParty(classId)) return false;
  if (_state.party.length >= 6) return false;
  _state.party.push(classId);
  persist();
  return true;
}

export function removeFromParty(classId) {
  const idx = _state.party.indexOf(classId);
  if (idx === -1) return false;
  if (_state.party.length <= 1) return false;
  _state.party.splice(idx, 1);
  persist();
  return true;
}

export function swapPartyAt(slotIdx, newClassId) {
  if (slotIdx < 0 || slotIdx >= _state.party.length) return false;
  if (!isUnlocked(newClassId)) return false;
  const existingIdx = _state.party.indexOf(newClassId);
  if (existingIdx === slotIdx) return false;
  if (existingIdx !== -1) {
    // already in party — swap positions
    const old = _state.party[slotIdx];
    _state.party[slotIdx] = newClassId;
    _state.party[existingIdx] = old;
  } else {
    _state.party[slotIdx] = newClassId;
  }
  persist();
  return true;
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
