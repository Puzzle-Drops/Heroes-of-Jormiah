import { storage } from './storage.js';
import { computeQualityScore, computeRarity } from './combat/loot.js';

const STAT_KEYS_LOCAL = ['hp', 'mp', 'patk', 'matk', 'pdef', 'mdef'];

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
  { floor: 3,   classId: 'bard' },
  { floor: 6,   classId: 'engineer' },
  { floor: 10,  classId: 'druid' },
  { floor: 15,  classId: 'sniper' },
  { floor: 20,  classId: 'necromancer' },
  { floor: 25,  classId: 'crusader' },
  { floor: 30,  classId: 'samurai' },
  { floor: 40,  classId: 'shadowdancer' },
  { floor: 50,  classId: 'paladin' },
  { floor: 60,  classId: 'sentinel' },
  { floor: 70,  classId: 'cryomancer' },
  { floor: 80,  classId: 'bloodpriest' },
  { floor: 90,  classId: 'hunter' },
  { floor: 100, classId: 'reaper' },
  { floor: 115, classId: 'stormcaller' },
  { floor: 130, classId: 'inquisitor' },
  { floor: 145, classId: 'alchemist' },
  { floor: 160, classId: 'spellblade' },
  { floor: 175, classId: 'witch' },
  { floor: 200, classId: 'geomancer' }
];

// Achievement definitions. Each has a check(state, data) that runs against the
// current game state; once it returns true, the achievement locks in. Authors
// can grow this list — checkAchievements walks every entry on each event.
export const ACHIEVEMENTS = [
  { id: 'first_steps',     name: 'First Steps',     desc: 'Clear floor 1.',                    check: (s) => maxFloor(s) >= 1,
    progress: (s) => ({ current: Math.min(1, maxFloor(s)), target: 1 }) },
  { id: 'diving_deeper',   name: 'Diving Deeper',   desc: 'Clear floor 10.',                   check: (s) => maxFloor(s) >= 10,
    progress: (s) => ({ current: Math.min(10, maxFloor(s)), target: 10 }) },
  { id: 'veteran',         name: 'Veteran',         desc: 'Clear floor 25.',                   check: (s) => maxFloor(s) >= 25,
    progress: (s) => ({ current: Math.min(25, maxFloor(s)), target: 25 }) },
  { id: 'master_of_iron',  name: 'Master of Iron',  desc: 'Clear floor 50.',                   check: (s) => maxFloor(s) >= 50,
    progress: (s) => ({ current: Math.min(50, maxFloor(s)), target: 50 }) },
  { id: 'centurion',       name: 'Centurion',       desc: 'Clear floor 100.',                  check: (s) => maxFloor(s) >= 100,
    progress: (s) => ({ current: Math.min(100, maxFloor(s)), target: 100 }) },
  { id: 'first_radiant',   name: 'Star Aligned',    desc: 'Drop your first Radiant item.',     check: (s) => s._eventCounters?.radiantDrops >= 1 },
  { id: 'treasure_hoard',  name: 'Treasure Hoard',  desc: 'Accumulate 100 dust.',              check: (s) => (s.currencies?.dust ?? 0) >= 100,
    progress: (s) => ({ current: Math.min(100, s.currencies?.dust ?? 0), target: 100 }) },
  { id: 'tinkerer',        name: 'Tinkerer',        desc: 'Reroll a stat 5 times.',            check: (s) => (s._eventCounters?.rerolls ?? 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s._eventCounters?.rerolls ?? 0), target: 5 }) },
  { id: 'polymath',        name: 'Polymath',        desc: 'Unlock 12 classes.',                check: (s) => (s.unlockedClasses?.length ?? 0) >= 12,
    progress: (s) => ({ current: Math.min(12, s.unlockedClasses?.length ?? 0), target: 12 }) },
  { id: 'specialist',      name: 'Specialist',      desc: 'Allocate 20 tree nodes on a single class.', check: (s) => Object.values(s.roster ?? {}).some(u => (u.allocatedNodes?.length ?? 0) >= 21),
    progress: (s) => {
      let m = 0; for (const u of Object.values(s.roster ?? {})) m = Math.max(m, (u.allocatedNodes?.length ?? 1) - 1);
      return { current: Math.min(20, m), target: 20 };
    } },
  { id: 'cornerstone',     name: 'Cornerstone',     desc: 'Reach a Keystone on any class.',    check: (s, data) => Object.values(s.roster ?? {}).some(u => (u.allocatedNodes ?? []).some(id => data.treeNodesById?.[id]?.kind === 'keystone')) },
  { id: 'dust_to_dust',    name: 'Dust to Dust',    desc: 'Salvage 25 items.',                 check: (s) => (s._eventCounters?.salvages ?? 0) >= 25,
    progress: (s) => ({ current: Math.min(25, s._eventCounters?.salvages ?? 0), target: 25 }) },

  // endgame
  { id: 'deep_diver',      name: 'Deep Diver',      desc: 'Clear floor 200.',                  check: (s) => maxFloor(s) >= 200,
    progress: (s) => ({ current: Math.min(200, maxFloor(s)), target: 200 }) },
  { id: 'wealthy',         name: 'Wealthy',         desc: 'Accumulate 1000 dust.',             check: (s) => (s.currencies?.dust ?? 0) >= 1000,
    progress: (s) => ({ current: Math.min(1000, s.currencies?.dust ?? 0), target: 1000 }) },
  { id: 'spendthrift',     name: 'Spendthrift',     desc: 'Reroll 50 stats.',                  check: (s) => (s._eventCounters?.rerolls ?? 0) >= 50,
    progress: (s) => ({ current: Math.min(50, s._eventCounters?.rerolls ?? 0), target: 50 }) },
  { id: 'tree_walker',     name: 'Tree Walker',     desc: 'Allocate 50 tree nodes on a single class.', check: (s) => Object.values(s.roster ?? {}).some(u => (u.allocatedNodes?.length ?? 0) >= 51),
    progress: (s) => {
      let m = 0; for (const u of Object.values(s.roster ?? {})) m = Math.max(m, (u.allocatedNodes?.length ?? 1) - 1);
      return { current: Math.min(50, m), target: 50 };
    } },
  { id: 'octopath',        name: 'Octopath',        desc: 'Reach a notable in every arm across your roster.',
    check: (s, data) => {
      if (!data?.treeNodesById) return false;
      const families = ['tank','fighter','rogue','marksman','magician','healer','mystic','farlands'];
      const reached = new Set();
      for (const u of Object.values(s.roster ?? {})) {
        for (const id of u.allocatedNodes ?? []) {
          const node = data.treeNodesById[id];
          if (!node || node.kind !== 'notable') continue;
          for (const fam of families) if (id.startsWith(`${fam}_`)) reached.add(fam);
        }
      }
      return families.every(f => reached.has(f));
    }
  },
  { id: 'crystallized',    name: 'Crystallized',    desc: 'Drop 5 Radiant items.',             check: (s) => (s._eventCounters?.radiantDrops ?? 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s._eventCounters?.radiantDrops ?? 0), target: 5 }) },

  // exploration / cumulative
  { id: 'four_corners',    name: 'Four Corners',    desc: 'Clear floor 1 in every dungeon.',
    check: (s) => Object.values(s.dungeons ?? {}).filter(d => (d.highestFloor ?? 0) >= 1).length >= 4 },
  { id: 'campaigner',      name: 'Campaigner',      desc: 'Clear 100 floors total across all dungeons.',
    check: (s) => Object.values(s.dungeons ?? {}).reduce((a, d) => a + (d.highestFloor ?? 0), 0) >= 100,
    progress: (s) => ({ current: Math.min(100, Object.values(s.dungeons ?? {}).reduce((a, d) => a + (d.highestFloor ?? 0), 0)), target: 100 }) },
  { id: 'first_blood',     name: 'First Blood',     desc: 'Land your first kill.',
    check: (s) => (s._eventCounters?.kills ?? 0) >= 1 },
  { id: 'butcher',         name: 'Butcher',         desc: 'Land 500 kills.',
    check: (s) => (s._eventCounters?.kills ?? 0) >= 500,
    progress: (s) => ({ current: Math.min(500, s._eventCounters?.kills ?? 0), target: 500 }) },
  { id: 'enlightened',     name: 'Enlightened',     desc: 'Reach all 8 Keystones across the roster.',
    check: (s, data) => {
      if (!data?.treeNodesById) return false;
      const seen = new Set();
      for (const u of Object.values(s.roster ?? {})) {
        for (const id of u.allocatedNodes ?? []) {
          if (data.treeNodesById[id]?.kind === 'keystone') seen.add(id);
        }
      }
      return seen.size >= 8;
    },
    progress: (s, data) => {
      const seen = new Set();
      if (data?.treeNodesById) {
        for (const u of Object.values(s.roster ?? {})) {
          for (const id of u.allocatedNodes ?? []) {
            if (data.treeNodesById[id]?.kind === 'keystone') seen.add(id);
          }
        }
      }
      return { current: seen.size, target: 8 };
    }
  }
];

function maxFloor(state) {
  let m = 0;
  for (const d of Object.values(state.dungeons ?? {})) {
    if ((d.highestFloor ?? 0) > m) m = d.highestFloor;
  }
  return m;
}

// Walks the achievements list, marks any newly-met as unlocked, returns the
// list of newly-unlocked entries so the UI can toast them.
export function checkAchievements() {
  const state = _state;
  if (!state.achievements) state.achievements = {};
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]?.unlocked) continue;
    let met = false;
    try { met = !!a.check(state, _data); } catch { met = false; }
    if (met) {
      state.achievements[a.id] = { unlocked: true, ts: Date.now() };
      newly.push(a);
    }
  }
  if (newly.length) persist();
  return newly;
}

// Convenience: bump a named counter and re-run the achievement check.
export function recordEvent(key, delta = 1) {
  if (!_state._eventCounters) _state._eventCounters = {};
  _state._eventCounters[key] = (_state._eventCounters[key] ?? 0) + delta;
  const newly = checkAchievements();
  persist();
  return newly;
}

function defaultSave(data) {
  const starters = data.starter_classes.verticalSlice_M1.classIds;
  const roster = {};
  for (const id of starters) {
    const cls = data.classesById[id];
    if (cls) roster[id] = makeFreshUnit(cls);
  }
  return {
    saveVersion: 6,
    currencies: { gold: 0, dust: 0, spirit: 0 },
    roster,
    sharedStash: [],
    unlockedClasses: starters.slice(),
    party: starters.slice(0, 6),
    dungeons: {
      iron_vaults:       { highestFloor: 0, currentRunFloor: null },
      whispering_spires: { highestFloor: 0, currentRunFloor: null },
      hollowed_wilds:    { highestFloor: 0, currentRunFloor: null },
      shattered_spire:   { highestFloor: 0, currentRunFloor: null }
    },
    achievements: {},
    _eventCounters: { radiantDrops: 0, rerolls: 0, salvages: 0 },
    settings: { speed: 1, autoCast: true, autoProgress: false, muted: false, selectedDungeon: 'iron_vaults' }
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
  // v0.4 -> v0.5 migration: whispering_spires + hollowed_wilds + autoProgress
  if (!state.dungeons.whispering_spires) state.dungeons.whispering_spires = { highestFloor: 0, currentRunFloor: null };
  if (!state.dungeons.hollowed_wilds)    state.dungeons.hollowed_wilds    = { highestFloor: 0, currentRunFloor: null };
  if (typeof state.settings.autoProgress !== 'boolean') state.settings.autoProgress = false;
  if (typeof state.settings.muted !== 'boolean') state.settings.muted = false;
  // v0.5 -> v0.6 migration: passive tree allocations
  for (const id in state.roster) {
    const u = state.roster[id];
    const cls = data.classesById[id];
    const startId = data.tree?.startNodes?.[cls?.family];
    if (!Array.isArray(u.allocatedNodes)) u.allocatedNodes = startId ? [startId] : [];
    else if (startId && !u.allocatedNodes.includes(startId)) u.allocatedNodes.unshift(startId);
  }
  // v0.5 -> v0.6 / v0.6 -> v0.7 migration: achievements + counters
  if (!state.achievements) state.achievements = {};
  if (!state._eventCounters) state._eventCounters = { radiantDrops: 0, rerolls: 0, salvages: 0 };
  state.saveVersion = 6;
}

function makeFreshUnit(cls) {
  // Start node is auto-allocated for free; further points spent per class level.
  const startId = _data?.tree?.startNodes?.[cls.family] ?? null;
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
    },
    allocatedNodes: startId ? [startId] : []
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
  recordEvent('salvages');
  return dust;
}

// ----- Reroll a single stat on an equipped item (GDD §15.3) -----

export function rerollCost(item) {
  if (!item || item.isStarter) return Infinity;
  return 10 + Math.round((item.level || 1) * 2);
}

export function rerollItemStat(classId, slotId, stat) {
  const unit = _state.roster[classId];
  if (!unit) return null;
  const item = unit.equipment[slotId];
  if (!item || item.isStarter) return null;
  if (!STAT_KEYS_LOCAL.includes(stat)) return null;
  const cost = rerollCost(item);
  if (_state.currencies.dust < cost) return null;

  const max = (stat === item.namesake) ? 2 * item.level : item.level;
  const oldValue = item.stats[stat] ?? 0;
  let newValue = Math.round(Math.random() * max);
  // tiny anti-frustration: never roll the exact same value twice in a row when there's room to vary
  if (newValue === oldValue && max > 1) newValue = (newValue + 1) % (max + 1);
  item.stats[stat] = newValue;
  item.qualityScore = computeQualityScore(item.stats, item.namesake, item.level);
  item.rarity = computeRarity(item.qualityScore);

  _state.currencies.dust -= cost;
  recordEvent('rerolls');
  return { oldValue, newValue, cost, newRarity: item.rarity, newQuality: item.qualityScore };
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

// ----- Equipment loadouts (up to 3 saved snapshots per class) -----
export const LOADOUT_MAX = 3;

export function getLoadouts(classId) {
  const u = _state.roster[classId];
  if (!u) return [];
  if (!Array.isArray(u.loadouts)) u.loadouts = [];
  return u.loadouts;
}

export function saveLoadout(classId, name) {
  const unit = _state.roster[classId];
  if (!unit) return false;
  if (!Array.isArray(unit.loadouts)) unit.loadouts = [];
  if (unit.loadouts.length >= LOADOUT_MAX) return false;
  const slots = {};
  for (const slotId in unit.equipment) {
    const it = unit.equipment[slotId];
    slots[slotId] = (it && !it.isStarter) ? it.id : null;
  }
  unit.loadouts.push({
    name: (name || `Loadout ${unit.loadouts.length + 1}`).slice(0, 24),
    slots,
    savedAt: Date.now()
  });
  persist();
  return true;
}

export function loadLoadout(classId, idx) {
  const unit = _state.roster[classId];
  if (!unit || !Array.isArray(unit.loadouts) || !unit.loadouts[idx]) return { ok: false, missing: [] };
  const target = unit.loadouts[idx].slots;
  // Unequip all current non-starter items to stash
  for (const slotId of Object.keys(unit.equipment)) {
    const it = unit.equipment[slotId];
    if (it && !it.isStarter) {
      unit.equipment[slotId] = null;
      _state.sharedStash.push(it);
    }
  }
  // Equip from snapshot if items are still findable + compatible
  const missing = [];
  for (const slotId in target) {
    const id = target[slotId];
    if (!id) continue;
    const stashIdx = _state.sharedStash.findIndex(s => s.id === id);
    if (stashIdx === -1) { missing.push(slotId); continue; }
    const item = _state.sharedStash[stashIdx];
    if (!canEquip(item, classId, slotId)) { missing.push(slotId); continue; }
    _state.sharedStash.splice(stashIdx, 1);
    unit.equipment[slotId] = item;
  }
  persist();
  return { ok: true, missing };
}

export function deleteLoadout(classId, idx) {
  const unit = _state.roster[classId];
  if (!unit || !Array.isArray(unit.loadouts)) return false;
  if (idx < 0 || idx >= unit.loadouts.length) return false;
  unit.loadouts.splice(idx, 1);
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
