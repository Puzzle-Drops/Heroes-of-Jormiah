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

export const REFUND_ALL_COST_SPIRIT = 5;
export const REFUND_NODE_COST_SPIRIT = 1;

// Returns the number of refundable nodes (i.e. excludes the start node) so the
// UI can disable the button when there's nothing to refund.
export function refundableCount(classId) {
  const start = startNodeFor(classId);
  const unit = getState().roster[classId];
  if (!unit) return 0;
  return (unit.allocatedNodes ?? []).filter(id => id !== start).length;
}

export function refundAll(classId) {
  const unit = getState().roster[classId];
  if (!unit) return { ok: false, reason: 'no unit', refunded: 0 };
  if (refundableCount(classId) === 0) return { ok: false, reason: 'nothing to refund', refunded: 0 };
  const state = getState();
  if ((state.currencies.spirit ?? 0) < REFUND_ALL_COST_SPIRIT) {
    return { ok: false, reason: 'not enough spirit', refunded: 0 };
  }
  const start = startNodeFor(classId);
  const before = unit.allocatedNodes.length;
  unit.allocatedNodes = start ? [start] : [];
  state.currencies.spirit -= REFUND_ALL_COST_SPIRIT;
  persist();
  return { ok: true, refunded: before - unit.allocatedNodes.length };
}

// Per-node refund (POE-style): allowed only if removing the node leaves every
// remaining allocated node still reachable from the class's start node.
export function canRefundNode(classId, nodeId) {
  const allocated = getAllocated(classId);
  if (!allocated.has(nodeId)) return false;
  const start = startNodeFor(classId);
  if (nodeId === start) return false;
  const sim = new Set(allocated);
  sim.delete(nodeId);
  const idx = nodesById();
  const visited = new Set();
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    const node = idx[cur];
    if (!node) continue;
    for (const e of node.edges) {
      if (sim.has(e) && !visited.has(e)) queue.push(e);
    }
  }
  return [...sim].every(id => visited.has(id));
}

export function refundNode(classId, nodeId) {
  if (!canRefundNode(classId, nodeId)) return false;
  const state = getState();
  if ((state.currencies.spirit ?? 0) < REFUND_NODE_COST_SPIRIT) return false;
  const unit = state.roster[classId];
  const idx = (unit.allocatedNodes ?? []).indexOf(nodeId);
  if (idx === -1) return false;
  unit.allocatedNodes.splice(idx, 1);
  state.currencies.spirit -= REFUND_NODE_COST_SPIRIT;
  persist();
  return true;
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
