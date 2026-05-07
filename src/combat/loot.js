import { getData, getState } from '../state.js';
import { prettyAbility } from '../humanize.js';

const STATS = ['hp', 'mp', 'patk', 'matk', 'pdef', 'mdef'];
let _idCounter = 1;
const newId = () => `it_${Date.now().toString(36)}_${_idCounter++}`;

export function generateItemForDungeon(dungeonId, floor) {
  const data = getData();
  const dungeon = data.dungeonsById[dungeonId];
  const slotId = pickRandom(dungeon.drops);
  if (slotId.startsWith('stone_')) return generateStone(slotId, floor);
  return generateItem(slotId, floor);
}

export function generateItem(slotId, itemLevel) {
  const slot = getData().slotsById[slotId];
  const namesake = pickNamesake(slot);
  const stats = rollStats(itemLevel, namesake);
  const qualityScore = computeQualityScore(stats, namesake, itemLevel);
  const rarity = computeRarity(qualityScore);
  return {
    id: newId(),
    slotId,
    kind: slot.category,
    level: itemLevel,
    statLevel: itemLevel,
    namesake,
    stats,
    qualityScore,
    rarity,
    displayName: composeName(slot, namesake, itemLevel)
  };
}

// Generates a stone bound to a random unlocked class's matching ability slot,
// e.g. a stone_attack roll while Pyromancer is unlocked might bind to the
// Firebolt ability and only fit Pyromancer's stone_attack slot.
export function generateStone(slotId, itemLevel) {
  const data = getData();
  const state = getState();
  const candidates = state.unlockedClasses;
  const classId = pickRandom(candidates);
  const cls = data.classesById[classId];
  const slotKey = slotId.replace('stone_', '');
  const abilityId = cls.abilities[slotKey];

  const slot = data.slotsById[slotId];
  const namesake = pickNamesake(slot);
  const stats = rollStats(itemLevel, namesake);
  const qualityScore = computeQualityScore(stats, namesake, itemLevel);
  const rarity = computeRarity(qualityScore);

  return {
    id: newId(),
    slotId,
    kind: 'stone',
    level: itemLevel,
    statLevel: itemLevel,
    abilityLevel: Math.min(100, itemLevel),
    abilityId,
    forClassId: classId,
    namesake,
    stats,
    qualityScore,
    rarity,
    displayName: `Lvl ${itemLevel} ${prettyAbility(abilityId)} Stone`
  };
}

function rollStats(itemLevel, namesake) {
  const out = {};
  for (const s of STATS) {
    const max = (s === namesake) ? 2 * itemLevel : itemLevel;
    out[s] = Math.round(Math.random() * max);
  }
  return out;
}

function pickNamesake(slot) {
  if (slot.namesakeWeights === 'any' || !Array.isArray(slot.namesakeWeights)) return pickRandom(STATS);
  return pickRandom(slot.namesakeWeights);
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function computeQualityScore(stats, namesake, itemLevel) {
  const rolls = STATS.map(s => {
    const max = (s === namesake) ? 2 * itemLevel : itemLevel;
    return max ? stats[s] / max : 0;
  });
  return rolls.reduce((a, b) => a + b, 0) / rolls.length;
}

function computeRarity(score) {
  const tiers = getData().rarity.tiers.slice().sort((a, b) => b.minScore - a.minScore);
  for (const t of tiers) if (score >= t.minScore) return t.id;
  return 'rusted';
}

const NAMESAKE_PREFIX = {
  hp: 'Vital', mp: 'Mystic', patk: 'Sharp', matk: 'Arcane', pdef: 'Sturdy', mdef: 'Warded'
};
const SLOT_NOUN = {
  weapon: 'Sword', helm: 'Helm', chest: 'Cuirass', legs: 'Greaves',
  gloves: 'Gauntlets', boots: 'Boots', ring1: 'Ring', ring2: 'Ring',
  amulet: 'Amulet', stone_attack: 'Strike Stone', stone_spell1: 'Spell Stone',
  stone_spell2: 'Spell Stone', stone_passive: 'Aegis Stone'
};

function composeName(slot, namesake, level) {
  const noun = SLOT_NOUN[slot.id] || slot.id;
  const prefix = NAMESAKE_PREFIX[namesake] || '';
  return `Lvl ${level} ${prefix} ${noun}`.replace(/\s+/g, ' ').trim();
}
