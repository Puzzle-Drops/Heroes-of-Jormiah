// GDD §13 — shared POE-style passive tree.
//
// Phase 10 ships the data layer + allocation rules + stat application.
// The existing per-class SkillTreeViewer (iframe at game.js:951+) stays
// in place visually; once this layer is stable, the iframe view will be
// replaced by a single shared canvas. The new layer is additive — it
// does not remove the legacy skillTreeAttack / skillTreeDefense / etc.
// fields the existing system uses.
//
// Tree shape
// ----------
// 8 archetype arms radiate from a central root (id 0). One arm per
// family. Each arm has:
//   - 4 stat nodes along a spine (small +stat bonuses)
//   - 1 Notable at the mid (named cluster, larger bonus)
//
// v1 ships ~41 nodes; Phase 10.x grows toward GDD's 80+ target with
// keystones and cross-arm connections.

const FAMILIES = ['tank','fighter','healer','marksman','rogue','magician','mystic','farland'];

// Each node: { id, kind, family, name, x, y, bonuses, requires? }
// kind ∈ 'root' | 'stat' | 'notable' | 'keystone'
// bonuses: { hp:+%, mp:+%, pAtk:+, mAtk:+, pDef:+, mDef:+, ... }  flat unless _pct suffix.
// x/y are layout hints in tree-space (used by future canvas UI).

const TREE_NODES = [
  { id: 0, kind: 'root', name: 'Origin', x: 0, y: 0, bonuses: {} },
];

const TREE_EDGES = []; // [a, b] pairs — undirected.

// Per-family node bonus presets. Stat nodes give small bumps in the
// family's primary axis; the notable gives a themed bigger bump.
const FAMILY_PROFILE = {
  tank:     { stat: { pDef: 4, hp_pct: 5 },     notable: { name: 'Iron Bones',     bonuses: { hp_pct: 25, pDef: 10 } } },
  fighter:  { stat: { pAtk: 3, hp_pct: 3 },     notable: { name: 'Reaving Edge',   bonuses: { pAtk: 12, hp_pct: 10 } } },
  healer:   { stat: { mAtk: 3, mp_pct: 5 },     notable: { name: 'Devout Channel', bonuses: { mAtk: 10, mp_pct: 20 } } },
  marksman: { stat: { pAtk: 4, mDef: 2 },       notable: { name: 'Eagle Eye',      bonuses: { pAtk: 12, attackSpeed_pct: 10 } } },
  rogue:    { stat: { pAtk: 4, attackSpeed_pct: 3 }, notable: { name: 'Liquid Movement', bonuses: { pAtk: 10, attackSpeed_pct: 15 } } },
  magician: { stat: { mAtk: 4, mp_pct: 4 },     notable: { name: 'Arcane Mind',    bonuses: { mAtk: 14, mp_pct: 15 } } },
  mystic:   { stat: { mAtk: 3, mDef: 3 },       notable: { name: 'Spirit Link',    bonuses: { mAtk: 10, mDef: 8 } } },
  farland:  { stat: { pAtk: 2, mAtk: 2 },       notable: { name: 'Wildcard',       bonuses: { pAtk: 7, mAtk: 7 } } },
};

// Build 8 arms. Each arm has a spine of 5 nodes:
//   [start] — stat — stat — Notable — stat — stat
// node ids 1..40, with start nodes at ids 1, 7, 13, 19, 25, 31, 37, 43.
let nextId = 1;
const FAMILY_START_NODE = {};
const ARM_LENGTH = 5;
for (let i = 0; i < FAMILIES.length; i++) {
  const fam = FAMILIES[i];
  const profile = FAMILY_PROFILE[fam];
  const angle = (i / FAMILIES.length) * Math.PI * 2;
  const startId = nextId;
  FAMILY_START_NODE[fam] = startId;
  let prev = 0; // root
  for (let k = 0; k < ARM_LENGTH; k++) {
    const r = 100 + k * 80;
    const id = nextId++;
    const isNotable = (k === 2);
    TREE_NODES.push({
      id,
      kind: isNotable ? 'notable' : (k === 0 ? 'stat' : 'stat'),
      family: fam,
      name: isNotable ? profile.notable.name : `${fam[0].toUpperCase() + fam.slice(1)} ${k+1}`,
      x: Math.round(Math.cos(angle) * r),
      y: Math.round(Math.sin(angle) * r),
      bonuses: isNotable ? profile.notable.bonuses : profile.stat,
    });
    TREE_EDGES.push([prev, id]);
    prev = id;
  }
}

// Public helpers.
function getStartNodeForFamily(family) {
  return FAMILY_START_NODE[family] ?? 0;
}
function getNodeById(id) {
  return TREE_NODES.find(n => n.id === id) || null;
}
function getNodesAdjacentTo(id) {
  const out = new Set();
  for (const [a, b] of TREE_EDGES) {
    if (a === id) out.add(b);
    if (b === id) out.add(a);
  }
  return [...out];
}

// Apply the union of bonuses from a Set/array of allocated node ids.
// flatKeys (pAtk, mAtk, pDef, mDef, hp, mp) accumulate as direct
// addends. _pct suffixed keys (hp_pct, mp_pct, attackSpeed_pct) sum
// as percent-bonus integers; the consumer multiplies them in.
function aggregateBonuses(allocated) {
  const total = {};
  for (const id of allocated) {
    const n = getNodeById(id);
    if (!n || !n.bonuses) continue;
    for (const [k, v] of Object.entries(n.bonuses)) {
      total[k] = (total[k] || 0) + v;
    }
  }
  return total;
}

// Re-resolve a character's tree bonuses from its allocatedNodes set.
// Pushes them into the existing skillTreeX backing fields so the
// Phase-4/5 getTotal* methods pick them up without further wiring.
function applyTreeBonuses(character) {
  const alloc = character.allocatedTreeNodes || new Set();
  const total = aggregateBonuses(alloc);
  // Flat axis bonuses live on existing fields the getters already sum.
  character.skillTreePAtk = total.pAtk || 0;
  character.skillTreeMAtk = total.mAtk || 0;
  character.skillTreePDef = total.pDef || 0;
  character.skillTreeMDef = total.mDef || 0;
  character.skillTreeAttack  = (total.pAtk || 0) + (total.mAtk || 0);
  character.skillTreeDefense = (total.pDef || 0) + (total.mDef || 0);
  // Pct bonuses applied as multiplicative buffs.
  character.skillTreeHPPct  = total.hp_pct || 0;
  character.skillTreeMPPct  = total.mp_pct || 0;
  character.skillTreeAttackSpeedPct = total.attackSpeed_pct || 0;
}

window.PASSIVE_TREE = {
  nodes: TREE_NODES,
  edges: TREE_EDGES,
  familyStart: FAMILY_START_NODE,
  getStartNodeForFamily,
  getNodeById,
  getNodesAdjacentTo,
  aggregateBonuses,
  applyTreeBonuses,
};
