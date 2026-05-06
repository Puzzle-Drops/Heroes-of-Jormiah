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
    saveVersion: 1,
    currencies: { gold: 0, dust: 0, spirit: 0 },
    roster,
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
    },
    inventory: []
  };
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
