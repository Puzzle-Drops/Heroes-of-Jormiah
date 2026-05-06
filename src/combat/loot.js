import { getData } from '../state.js';

const STATS = ['hp', 'mp', 'patk', 'matk', 'pdef', 'mdef'];
let _idCounter = 1;
const newId = () => `it_${Date.now().toString(36)}_${_idCounter++}`;

export function generateItemForDungeon(dungeonId, floor) {
  const data = getData();
  const dungeon = data.dungeonsById[dungeonId];
  const slotId = pickRandom(dungeon.drops);
  return generateItem(slotId, floor);
}

export function generateItem(slotId, itemLevel) {
  const slot = getData().slotsById[slotId];
  const namesake = pickNamesake(slot);
  const stats = {};
  for (const s of STATS) {
    const max = (s === namesake) ? 2 * itemLevel : itemLevel;
    stats[s] = Math.round(Math.random() * max);
  }
  const qualityScore = computeQualityScore(stats, namesake, itemLevel);
  const rarity = computeRarity(qualityScore);
  const item = {
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
  if (slot.category === 'stone') {
    item.abilityLevel = Math.min(100, itemLevel);
  }
  return item;
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
