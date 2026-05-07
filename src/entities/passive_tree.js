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
// family's primary axis; the notable gives a themed bigger bump;
// the keystone gives a build-defining tradeoff.
const FAMILY_PROFILE = {
  tank:     { stat: { pDef: 4, hp_pct: 5 },     notable: { name: 'Iron Bones',     bonuses: { hp_pct: 25, pDef: 10 } },
              keystone: { name: 'Living Wall',     bonuses: { pDef: 25, mDef: 15, hp_pct: 30 }, description: 'Below 30% HP, party damage redirects to you; you take 50% less damage.' } },
  fighter:  { stat: { pAtk: 3, hp_pct: 3 },     notable: { name: 'Reaving Edge',   bonuses: { pAtk: 12, hp_pct: 10 } },
              keystone: { name: 'Resolute Technique', bonuses: { pAtk: 25 }, description: 'Your hits cannot crit; +25% damage.' } },
  healer:   { stat: { mAtk: 3, mp_pct: 5 },     notable: { name: 'Devout Channel', bonuses: { mAtk: 10, mp_pct: 20 } },
              keystone: { name: 'Mind Over Matter', bonuses: { mp_pct: 30 }, description: '30% damage taken hits MP first.' } },
  marksman: { stat: { pAtk: 4, mDef: 2 },       notable: { name: 'Eagle Eye',      bonuses: { pAtk: 12, attackSpeed_pct: 10 } },
              keystone: { name: 'Hunter\'s Mark',   bonuses: { pAtk: 18, attackSpeed_pct: 15 }, description: 'First hit on a target deals +50% damage.' } },
  rogue:    { stat: { pAtk: 4, attackSpeed_pct: 3 }, notable: { name: 'Liquid Movement', bonuses: { pAtk: 10, attackSpeed_pct: 15 } },
              keystone: { name: 'Ghost Step',     bonuses: { attackSpeed_pct: 25 }, description: 'Each successful dodge resets all cooldowns.' } },
  magician: { stat: { mAtk: 4, mp_pct: 4 },     notable: { name: 'Arcane Mind',    bonuses: { mAtk: 14, mp_pct: 15 } },
              keystone: { name: 'Spell Echo',     bonuses: { mAtk: 20, mp_pct: 25 }, description: 'Spells cast twice; mana cost +50%.' } },
  mystic:   { stat: { mAtk: 3, mDef: 3 },       notable: { name: 'Spirit Link',    bonuses: { mAtk: 10, mDef: 8 } },
              keystone: { name: 'Totemic Will',   bonuses: { mDef: 15, mAtk: 12 }, description: 'Your buffs and debuffs last 50% longer.' } },
  farland:  { stat: { pAtk: 2, mAtk: 2 },       notable: { name: 'Wildcard',       bonuses: { pAtk: 7, mAtk: 7 } },
              keystone: { name: 'From Beyond',    bonuses: { pAtk: 12, mAtk: 12 }, description: 'Each kill grants a random buff for 4s.' } },
};

// Build 8 arms. Each arm has a spine of 5 stat/notable nodes plus a
// keystone at the tip:
//   [start-stat] — stat — Notable — stat — stat — Keystone
// Resulting in 6 nodes per arm × 8 arms = 48 spine nodes (ids 1..48).
const ARM_LENGTH = 5;
const ARM_STRIDE = ARM_LENGTH + 1; // 5 spine + 1 keystone
let nextId = 1;
const FAMILY_START_NODE = {};
const FAMILY_KEYSTONE_NODE = {};
const FAMILY_NOTABLE_NODE = {};
for (let i = 0; i < FAMILIES.length; i++) {
  const fam = FAMILIES[i];
  const profile = FAMILY_PROFILE[fam];
  const angle = (i / FAMILIES.length) * Math.PI * 2;
  FAMILY_START_NODE[fam] = nextId;
  let prev = 0; // root
  for (let k = 0; k < ARM_LENGTH; k++) {
    const r = 100 + k * 70;
    const id = nextId++;
    const isNotable = (k === 2);
    if (isNotable) FAMILY_NOTABLE_NODE[fam] = id;
    TREE_NODES.push({
      id,
      kind: isNotable ? 'notable' : 'stat',
      family: fam,
      name: isNotable ? profile.notable.name : `${fam[0].toUpperCase() + fam.slice(1)} ${k+1}`,
      x: Math.round(Math.cos(angle) * r),
      y: Math.round(Math.sin(angle) * r),
      bonuses: isNotable ? profile.notable.bonuses : profile.stat,
    });
    TREE_EDGES.push([prev, id]);
    prev = id;
  }
  // Keystone at the tip — id sits one slot after the last spine node.
  const ksId = nextId++;
  FAMILY_KEYSTONE_NODE[fam] = ksId;
  const r = 100 + ARM_LENGTH * 70;
  TREE_NODES.push({
    id: ksId,
    kind: 'keystone',
    family: fam,
    name: profile.keystone.name,
    description: profile.keystone.description,
    x: Math.round(Math.cos(angle) * r),
    y: Math.round(Math.sin(angle) * r),
    bonuses: profile.keystone.bonuses,
  });
  TREE_EDGES.push([prev, ksId]);
}

// Cross-arm bridges per GDD §13.1 ("cross-connections at two radii so
// a class can dip into a neighbouring arm without committing to its
// full path"). Bridges sit between consecutive arms at the notable
// radius — a small bonus + an edge to BOTH adjacent arms' notables.
for (let i = 0; i < FAMILIES.length; i++) {
  const famA = FAMILIES[i];
  const famB = FAMILIES[(i + 1) % FAMILIES.length];
  const angle = ((i + 0.5) / FAMILIES.length) * Math.PI * 2;
  const r = 100 + 2 * 70;
  const id = nextId++;
  TREE_NODES.push({
    id,
    kind: 'bridge',
    bridgeBetween: [famA, famB],
    name: `${famA[0].toUpperCase()+famA.slice(1)}/${famB[0].toUpperCase()+famB.slice(1)} Bridge`,
    x: Math.round(Math.cos(angle) * r),
    y: Math.round(Math.sin(angle) * r),
    bonuses: { hp_pct: 3, mp_pct: 3 },
  });
  TREE_EDGES.push([FAMILY_NOTABLE_NODE[famA], id]);
  TREE_EDGES.push([id, FAMILY_NOTABLE_NODE[famB]]);
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

  // Phase 10.y: keystone behavioral flags. Walk the allocated set and
  // mirror each keystone's behavioral side-effects onto the character.
  // These flags are read directly by combat hooks (takeDamage, kill).
  character.keystone_cantCrit                = false;
  character.keystone_allDamageMultiplier     = 1;
  character.keystone_mpAbsorbsDamageFraction = 0;
  character.keystone_firstHitMultiplier      = 1;
  character.keystone_onKillRandomBuff        = false;
  for (const id of alloc) {
    const node = TREE_NODES.find(n => n.id === id);
    if (!node || node.kind !== 'keystone') continue;
    switch (node.name) {
      case 'Resolute Technique':
        character.keystone_cantCrit = true;
        character.keystone_allDamageMultiplier = 1.25;
        break;
      case 'Mind Over Matter':
        character.keystone_mpAbsorbsDamageFraction = 0.30;
        break;
      case "Hunter's Mark":
        character.keystone_firstHitMultiplier = 1.5;
        if (!character._hunterMarkHits) character._hunterMarkHits = new WeakSet();
        break;
      case 'From Beyond':
        character.keystone_onKillRandomBuff = true;
        break;
      // Behavioral hooks for Living Wall / Spell Echo / Ghost Step /
      // Totemic Will land in Phase 10.z; their stat bonuses already
      // apply via the aggregate above.
    }
  }
}

window.PASSIVE_TREE = {
  nodes: TREE_NODES,
  edges: TREE_EDGES,
  familyStart: FAMILY_START_NODE,
  familyKeystone: FAMILY_KEYSTONE_NODE,
  familyNotable: FAMILY_NOTABLE_NODE,
  getStartNodeForFamily,
  getNodeById,
  getNodesAdjacentTo,
  aggregateBonuses,
  applyTreeBonuses,
};
