import { getData, getState, persist } from './state.js';

export function getTree() {
  return getData().tree;
}

export function nodesById() {
  return getData().treeNodesById;
}

export function startNodeFor(classId) {
  const data = getData();
  const cls = data.classesById[classId];
  if (!cls) return null;
  return data.tree.startNodes[cls.family] ?? data.tree.rootId;
}

export function getAllocated(classId) {
  const unit = getState().roster[classId];
  if (!unit) return new Set();
  if (!Array.isArray(unit.allocatedNodes)) unit.allocatedNodes = [startNodeFor(classId)].filter(Boolean);
  return new Set(unit.allocatedNodes);
}

export function pointsAvailable(classId) {
  const unit = getState().roster[classId];
  if (!unit) return 0;
  // 1 point per character level. The class's start node is auto-allocated for free,
  // so total allocated must be <= level + 1.
  const free = 1; // start node freebie
  const allocatedCount = (unit.allocatedNodes ?? []).length;
  return Math.max(0, unit.level + free - allocatedCount);
}

export function canAllocate(classId, nodeId) {
  const allocated = getAllocated(classId);
  if (allocated.has(nodeId)) return false;
  if (pointsAvailable(classId) <= 0) return false;
  const node = nodesById()[nodeId];
  if (!node) return false;
  // must connect to something already allocated
  return node.edges.some(e => allocated.has(e));
}

export function allocateNode(classId, nodeId) {
  if (!canAllocate(classId, nodeId)) return false;
  const unit = getState().roster[classId];
  if (!Array.isArray(unit.allocatedNodes)) unit.allocatedNodes = [startNodeFor(classId)].filter(Boolean);
  unit.allocatedNodes.push(nodeId);
  persist();
  return true;
}

export function refundAll(classId) {
  const unit = getState().roster[classId];
  if (!unit) return 0;
  const start = startNodeFor(classId);
  const before = (unit.allocatedNodes ?? []).length;
  unit.allocatedNodes = start ? [start] : [];
  persist();
  return before - unit.allocatedNodes.length;
}

// Sum tree-derived stat additions for a unit. Used by combat.computeStats.
// Treats `amount` as flat additive and `amountPct` as a multiplier added to 1.
const STAT_KEYS = ['hp', 'mp', 'patk', 'matk', 'pdef', 'mdef'];
const PCT_STAT_KEYS = ['critChancePct', 'critDamagePct', 'dodgePct', 'attackSpeedPct'];

export function applyTreeToBaseStats(allocatedNodes, base) {
  const out = { ...base };
  const idx = nodesById();
  // pass 1: flat additions
  for (const id of allocatedNodes) {
    const node = idx[id];
    if (!node) continue;
    for (const eff of node.effects ?? []) {
      if (eff.type !== 'stat') continue;
      if (typeof eff.amount === 'number' && STAT_KEYS.includes(eff.stat)) {
        out[eff.stat] = (out[eff.stat] ?? 0) + eff.amount;
      }
    }
  }
  // pass 2: percent additions (apply after flat so they compound on the boosted base)
  for (const id of allocatedNodes) {
    const node = idx[id];
    if (!node) continue;
    for (const eff of node.effects ?? []) {
      if (eff.type !== 'stat') continue;
      if (typeof eff.amountPct === 'number' && STAT_KEYS.includes(eff.stat)) {
        out[eff.stat] = (out[eff.stat] ?? 0) * (1 + eff.amountPct / 100);
      }
    }
  }
  return out;
}

// Returns extra percentage-stat buffs from tree (dodgePct, critChancePct, etc.)
// that the engine should treat as persistent buffs applied at battle start.
export function treePctBuffs(allocatedNodes) {
  const out = [];
  const idx = nodesById();
  for (const id of allocatedNodes) {
    const node = idx[id];
    if (!node) continue;
    for (const eff of node.effects ?? []) {
      if (eff.type !== 'stat') continue;
      if (typeof eff.amountPct === 'number' && PCT_STAT_KEYS.includes(eff.stat)) {
        out.push({ stat: eff.stat, amountPct: eff.amountPct });
      }
    }
  }
  return out;
}

export function treeKeystoneFlags(allocatedNodes) {
  const flags = new Set();
  const idx = nodesById();
  for (const id of allocatedNodes) {
    const node = idx[id];
    if (!node) continue;
    for (const eff of node.effects ?? []) {
      if (eff.type === 'keystone' && eff.flag) flags.add(eff.flag);
    }
  }
  return flags;
}
