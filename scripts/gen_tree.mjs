#!/usr/bin/env node
// Generates data/tree.json — a shared POE-style passive tree.
// Layout: 8 arms (one per family) radiating from a central root, with
// cross-connections at two radii so paths from one arm can dip into a
// neighbour. ~80 active nodes covering all 8 archetype clusters.
//
// Re-run: `node scripts/gen_tree.mjs > data/tree.json`

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const ROOT_POS = [1000, 1000];
const RADII = [120, 220, 320, 420, 520, 620, 720, 820, 920, 1020]; // 10 nodes per arm
const NOTABLE_INDEX = 5;
const KEYSTONE_INDEX = 9;
const CROSS_INDEXES = [2, 6]; // adjacent-arm bridges

const ARMS = [
  {
    family: 'tank', angleDeg: 270,
    statPattern: [
      { stat: 'hp',   amount: 8 },
      { stat: 'pdef', amount: 4 },
      { stat: 'hp',   amount: 12 },
      { stat: 'pdef', amount: 6 },
      { stat: 'hp',   amount: 14 },
      { stat: 'mdef', amount: 5 },
      { stat: 'hp',   amount: 18 },
      { stat: 'pdef', amount: 8 }
    ],
    notable:  { name: 'Iron Bones',  effects: [{ type:'stat', stat:'hp',   amountPct: 12 }, { type:'stat', stat:'pdef', amount: 4 }] },
    keystone: { name: 'Living Wall', effects: [{ type:'keystone', flag:'living_wall' }, { type:'stat', stat:'hp', amountPct: 5 }] }
  },
  {
    family: 'fighter', angleDeg: 315,
    statPattern: [
      { stat: 'patk', amount: 3 },
      { stat: 'hp',   amount: 6 },
      { stat: 'patk', amount: 4 },
      { stat: 'hp',   amount: 8 },
      { stat: 'patk', amount: 5 },
      { stat: 'patk', amount: 6 },
      { stat: 'hp',   amount: 10 },
      { stat: 'patk', amount: 7 }
    ],
    notable:  { name: 'Blood Cleaver',     effects: [{ type:'stat', stat:'patk', amountPct: 10 }] },
    keystone: { name: 'Resolute Technique',effects: [{ type:'keystone', flag:'resolute_technique' }, { type:'stat', stat:'patk', amountPct: 25 }] }
  },
  {
    family: 'rogue', angleDeg: 0,
    statPattern: [
      { stat: 'patk', amount: 4 },
      { stat: 'mp',   amount: 4 },
      { stat: 'patk', amount: 5 },
      { stat: 'patk', amount: 6 },
      { stat: 'mp',   amount: 5 },
      { stat: 'patk', amount: 6 },
      { stat: 'patk', amount: 7 },
      { stat: 'patk', amount: 8 }
    ],
    notable:  { name: 'Liquid Form',  effects: [{ type:'stat', stat:'dodgePct', amountPct: 8 }] },
    keystone: { name: 'Shadow Strike',effects: [{ type:'keystone', flag:'shadow_strike' }, { type:'stat', stat:'critChancePct', amountPct: 10 }] }
  },
  {
    family: 'marksman', angleDeg: 45,
    statPattern: [
      { stat: 'patk', amount: 4 },
      { stat: 'patk', amount: 5 },
      { stat: 'patk', amount: 6 },
      { stat: 'mp',   amount: 4 },
      { stat: 'patk', amount: 6 },
      { stat: 'patk', amount: 7 },
      { stat: 'patk', amount: 7 },
      { stat: 'patk', amount: 8 }
    ],
    notable:  { name: 'Eagle Eye',   effects: [{ type:'stat', stat:'critChancePct', amountPct: 10 }] },
    keystone: { name: 'Point Blank', effects: [{ type:'keystone', flag:'point_blank' }, { type:'stat', stat:'critDamagePct', amountPct: 25 }] }
  },
  {
    family: 'magician', angleDeg: 90,
    statPattern: [
      { stat: 'matk', amount: 4 },
      { stat: 'mp',   amount: 6 },
      { stat: 'matk', amount: 5 },
      { stat: 'mp',   amount: 8 },
      { stat: 'matk', amount: 6 },
      { stat: 'mp',   amount: 8 },
      { stat: 'matk', amount: 7 },
      { stat: 'matk', amount: 8 }
    ],
    notable:  { name: 'Arcane Power',     effects: [{ type:'stat', stat:'matk', amountPct: 12 }] },
    keystone: { name: 'Mind Over Matter', effects: [{ type:'keystone', flag:'mind_over_matter' }, { type:'stat', stat:'mp', amountPct: 20 }] }
  },
  {
    family: 'healer', angleDeg: 135,
    statPattern: [
      { stat: 'mp',   amount: 6 },
      { stat: 'matk', amount: 4 },
      { stat: 'mdef', amount: 4 },
      { stat: 'mp',   amount: 8 },
      { stat: 'matk', amount: 5 },
      { stat: 'mdef', amount: 5 },
      { stat: 'mp',   amount: 10 },
      { stat: 'matk', amount: 6 }
    ],
    notable:  { name: 'Devout Channel', effects: [{ type:'stat', stat:'matk', amount: 6 }, { type:'stat', stat:'mp', amountPct: 8 }] },
    keystone: { name: 'Vital Spring',   effects: [{ type:'keystone', flag:'vital_spring' }, { type:'stat', stat:'mdef', amountPct: 15 }] }
  },
  {
    family: 'mystic', angleDeg: 180,
    statPattern: [
      { stat: 'matk', amount: 3 },
      { stat: 'mdef', amount: 4 },
      { stat: 'matk', amount: 4 },
      { stat: 'mdef', amount: 5 },
      { stat: 'mp',   amount: 6 },
      { stat: 'mdef', amount: 6 },
      { stat: 'matk', amount: 6 },
      { stat: 'mdef', amount: 7 }
    ],
    notable:  { name: 'Hex Mastery',    effects: [{ type:'stat', stat:'matk', amount: 5 }, { type:'stat', stat:'mdef', amount: 5 }] },
    keystone: { name: 'Wisdom of Ages', effects: [{ type:'keystone', flag:'wisdom_of_ages' }, { type:'stat', stat:'mdef', amountPct: 10 }] }
  },
  {
    family: 'farlands', angleDeg: 225,
    statPattern: [
      { stat: 'patk', amount: 3 },
      { stat: 'matk', amount: 3 },
      { stat: 'patk', amount: 4 },
      { stat: 'matk', amount: 4 },
      { stat: 'mp',   amount: 5 },
      { stat: 'hp',   amount: 8 },
      { stat: 'patk', amount: 5 },
      { stat: 'matk', amount: 5 }
    ],
    notable:  { name: 'Versatility', effects: [{ type:'stat', stat:'patk', amount: 4 }, { type:'stat', stat:'matk', amount: 4 }] },
    keystone: { name: 'From Beyond', effects: [{ type:'keystone', flag:'from_beyond' }, { type:'stat', stat:'hp', amountPct: 8 }] }
  }
];

const nodes = [];
const startNodes = {};

nodes.push({ id: 'root', pos: ROOT_POS, kind: 'connector', name: 'Crucible', effects: [], edges: [] });

for (const arm of ARMS) {
  const rad = arm.angleDeg * Math.PI / 180;
  const baseEdgeJitter = (Math.PI / 180) * 4; // ±4° to spread arm slightly
  let prev = 'root';
  for (let i = 0; i < RADII.length; i++) {
    const r = RADII[i];
    // a tiny lateral spread so arms don't render as perfect lines (keeps tree readable at high zoom)
    const ang = rad + (i % 2 === 0 ? -baseEdgeJitter : baseEdgeJitter) * (i / RADII.length);
    const x = Math.round(ROOT_POS[0] + Math.cos(ang) * r);
    const y = Math.round(ROOT_POS[1] + Math.sin(ang) * r);

    let kind = 'stat';
    let name;
    let effects;
    if (i === NOTABLE_INDEX)        { kind = 'notable';  name = arm.notable.name;  effects = arm.notable.effects; }
    else if (i === KEYSTONE_INDEX)  { kind = 'keystone'; name = arm.keystone.name; effects = arm.keystone.effects; }
    else {
      const slot = arm.statPattern[i > NOTABLE_INDEX ? i - 1 : i];
      effects = [{ type: 'stat', stat: slot.stat, amount: slot.amount }];
    }
    const id = `${arm.family}_${i}`;
    nodes.push({ id, pos: [x, y], kind, name, effects, edges: [prev] });
    prev = id;
    if (i === 0) startNodes[arm.family] = id;
  }
}

// Cross-connections between adjacent arms at the chosen radii
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

// Connect each arm's start to root
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
console.log(`Wrote ${nodes.length} nodes to ${target}`);
console.log(`Start nodes:`, startNodes);
