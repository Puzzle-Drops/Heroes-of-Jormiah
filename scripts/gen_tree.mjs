#!/usr/bin/env node
// Generates data/tree.json — a shared POE-style passive tree.
// Layout: 8 arms (one per family) radiating from a central root, with
// cross-connections at two radii so paths can dip into a neighbouring arm.
//
// Re-run: `node scripts/gen_tree.mjs`

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const ROOT_POS = [1000, 1000];
const RADII = [120, 220, 320, 420, 520, 620, 720, 820, 920, 1020];
const CROSS_INDEXES = [2, 6];

// Helpers for compact arm authoring.
const stat   = (s, a)            => ({ kind: 'stat',     effects: [{ type:'stat', stat: s, amount: a }] });
const statP  = (s, p)            => ({ kind: 'stat',     effects: [{ type:'stat', stat: s, amountPct: p }] });
const note   = (name, effects)   => ({ kind: 'notable',  name, effects });
const key    = (name, flag, eff) => ({ kind: 'keystone', name, effects: [{ type:'keystone', flag }, ...eff] });

// Each arm declares 10 nodes from the start (index 0) outward to the keystone (index 9).
// Index 0 is the auto-allocated start node; indexes 1-8 are stats/notables; index 9 is the keystone tip.
const ARMS = [
  {
    family: 'tank', angleDeg: 270,
    nodes: [
      { kind: 'connector' },
      stat('hp', 8),
      note('Stout',     [{ type:'stat', stat:'hp', amount: 20 }]),
      stat('pdef', 6),
      stat('hp', 14),
      note('Iron Bones',[{ type:'stat', stat:'hp', amountPct: 12 }, { type:'stat', stat:'pdef', amount: 4 }]),
      stat('mdef', 5),
      note('Aegis',     [{ type:'stat', stat:'pdef', amount: 12 }, { type:'stat', stat:'mdef', amount: 6 }]),
      stat('hp', 18),
      key ('Living Wall', 'living_wall', [{ type:'stat', stat:'hp', amountPct: 5 }])
    ]
  },
  {
    family: 'fighter', angleDeg: 315,
    nodes: [
      { kind: 'connector' },
      stat('patk', 3),
      note('Aggression',  [{ type:'stat', stat:'patk', amountPct: 8 }]),
      stat('hp', 8),
      stat('patk', 5),
      note('Blood Cleaver',[{ type:'stat', stat:'patk', amountPct: 10 }]),
      stat('patk', 6),
      note('Hot Blooded', [{ type:'stat', stat:'patk', amount: 4 }, { type:'stat', stat:'hp', amount: 14 }]),
      stat('patk', 7),
      key ('Resolute Technique', 'resolute_technique', [{ type:'stat', stat:'patk', amountPct: 25 }])
    ]
  },
  {
    family: 'rogue', angleDeg: 0,
    nodes: [
      { kind: 'connector' },
      stat('patk', 4),
      note('Quick Hands', [{ type:'stat', stat:'attackSpeedPct', amountPct: 5 }]),
      stat('patk', 6),
      stat('mp', 5),
      note('Liquid Form', [{ type:'stat', stat:'dodgePct', amountPct: 8 }]),
      stat('patk', 7),
      note('Coup de Grace', [{ type:'stat', stat:'critDamagePct', amountPct: 20 }]),
      stat('patk', 8),
      key ('Shadow Strike', 'shadow_strike', [{ type:'stat', stat:'critChancePct', amountPct: 10 }])
    ]
  },
  {
    family: 'marksman', angleDeg: 45,
    nodes: [
      { kind: 'connector' },
      stat('patk', 4),
      note('Steady Hand', [{ type:'stat', stat:'critChancePct', amountPct: 5 }]),
      stat('patk', 6),
      stat('patk', 6),
      note('Eagle Eye',   [{ type:'stat', stat:'critChancePct', amountPct: 10 }]),
      stat('patk', 7),
      note('Heavy Draw',  [{ type:'stat', stat:'patk', amount: 8 }, { type:'stat', stat:'critDamagePct', amountPct: 15 }]),
      stat('patk', 8),
      key ('Point Blank', 'point_blank', [{ type:'stat', stat:'critDamagePct', amountPct: 25 }])
    ]
  },
  {
    family: 'magician', angleDeg: 90,
    nodes: [
      { kind: 'connector' },
      stat('matk', 4),
      note('Spell Focus', [{ type:'stat', stat:'matk', amountPct: 8 }]),
      stat('mp', 8),
      stat('matk', 6),
      note('Arcane Power', [{ type:'stat', stat:'matk', amountPct: 12 }]),
      stat('matk', 7),
      note('Mana Pool',   [{ type:'stat', stat:'mp', amount: 30 }, { type:'stat', stat:'mp', amountPct: 10 }]),
      stat('matk', 8),
      key ('Mind Over Matter', 'mind_over_matter', [{ type:'stat', stat:'mp', amountPct: 20 }])
    ]
  },
  {
    family: 'healer', angleDeg: 135,
    nodes: [
      { kind: 'connector' },
      stat('mp', 6),
      note('Devoted',     [{ type:'stat', stat:'mp', amountPct: 12 }]),
      stat('mdef', 4),
      stat('matk', 5),
      note('Devout Channel', [{ type:'stat', stat:'matk', amount: 6 }, { type:'stat', stat:'mp', amountPct: 8 }]),
      stat('mp', 10),
      note('Sanctified',  [{ type:'stat', stat:'mdef', amount: 12 }, { type:'stat', stat:'mp', amount: 12 }]),
      stat('matk', 6),
      key ('Vital Spring', 'vital_spring', [{ type:'stat', stat:'mdef', amountPct: 15 }])
    ]
  },
  {
    family: 'mystic', angleDeg: 180,
    nodes: [
      { kind: 'connector' },
      stat('matk', 3),
      note('Hexer',       [{ type:'stat', stat:'matk', amount: 6 }]),
      stat('mdef', 5),
      stat('matk', 4),
      note('Hex Mastery', [{ type:'stat', stat:'matk', amount: 5 }, { type:'stat', stat:'mdef', amount: 5 }]),
      stat('mdef', 6),
      note('Spirit Ward', [{ type:'stat', stat:'mdef', amount: 14 }, { type:'stat', stat:'matk', amount: 4 }]),
      stat('mdef', 7),
      key ('Wisdom of Ages', 'wisdom_of_ages', [{ type:'stat', stat:'mdef', amountPct: 10 }])
    ]
  },
  {
    family: 'farlands', angleDeg: 225,
    nodes: [
      { kind: 'connector' },
      stat('patk', 3),
      note('Adaptable',   [{ type:'stat', stat:'patk', amount: 5 }, { type:'stat', stat:'matk', amount: 5 }]),
      stat('matk', 4),
      stat('mp', 5),
      note('Versatility', [{ type:'stat', stat:'patk', amount: 4 }, { type:'stat', stat:'matk', amount: 4 }]),
      stat('hp', 8),
      note('Outlandish',  [{ type:'stat', stat:'patk', amountPct: 5 }, { type:'stat', stat:'matk', amountPct: 5 }, { type:'stat', stat:'hp', amountPct: 5 }]),
      stat('matk', 5),
      key ('From Beyond', 'from_beyond', [{ type:'stat', stat:'hp', amountPct: 8 }])
    ]
  }
];

const nodes = [];
const startNodes = {};

nodes.push({ id: 'root', pos: ROOT_POS, kind: 'connector', name: 'Crucible', effects: [], edges: [] });

for (const arm of ARMS) {
  const rad = arm.angleDeg * Math.PI / 180;
  const baseEdgeJitter = (Math.PI / 180) * 4;
  let prev = 'root';
  for (let i = 0; i < arm.nodes.length; i++) {
    const r = RADII[i];
    const ang = rad + (i % 2 === 0 ? -baseEdgeJitter : baseEdgeJitter) * (i / RADII.length);
    const x = Math.round(ROOT_POS[0] + Math.cos(ang) * r);
    const y = Math.round(ROOT_POS[1] + Math.sin(ang) * r);
    const tpl = arm.nodes[i];
    const id = `${arm.family}_${i}`;
    nodes.push({
      id,
      pos: [x, y],
      kind: tpl.kind,
      name: tpl.name,
      effects: tpl.effects ?? [],
      edges: [prev]
    });
    prev = id;
    if (i === 0) startNodes[arm.family] = id;
  }
}

function addEdge(aId, bId) {
  const a = nodes.find(n => n.id === aId);
  const b = nodes.find(n => n.id === bId);
  if (!a || !b) return;
  if (!a.edges.includes(bId)) a.edges.push(bId);
  if (!b.edges.includes(aId)) b.edges.push(aId);
}
for (let i = 0; i < ARMS.length; i++) {
  const next = (i + 1) % ARMS.length;
  for (const ix of CROSS_INDEXES) {
    addEdge(`${ARMS[i].family}_${ix}`, `${ARMS[next].family}_${ix}`);
  }
}
for (const arm of ARMS) addEdge('root', `${arm.family}_0`);

const out = {
  $comment: 'Shared passive tree. Generated by scripts/gen_tree.mjs.',
  rootId: 'root',
  startNodes,
  nodes
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, '..', 'data', 'tree.json');
await writeFile(target, JSON.stringify(out, null, 2));
const counts = nodes.reduce((acc, n) => ({ ...acc, [n.kind]: (acc[n.kind] ?? 0) + 1 }), {});
console.log(`Wrote ${nodes.length} nodes to ${target}`);
console.log(`Kind counts:`, counts);
