import { getData, getState } from '../state.js';
import {
  executeAbility, buffMultiplier, effectiveStat, pruneExpired,
  isIncapacitated, isSilenced, tickDots, applyPassiveBuffs,
  recomputeDynamicBuffs
} from './abilities.js';
import { applyTreeToBaseStats, treePctBuffs, treeKeystoneFlags } from '../tree.js';
import * as F from './formulas.js';

const TICK_HZ = 30;
const TICK_DT = 1 / TICK_HZ;
const STAT_KEYS = ['hp', 'mp', 'patk', 'matk', 'pdef', 'mdef'];

const ENEMY_PHYS_ATTACK_TPL = {
  type: 'attack', school: 'physical', manaCost: 0,
  scaling: { cooldown: { min: 2.5, max: 1.5 }, abilityPower: { min: 0.9, max: 0.9 } },
  effects: [{ type: 'damage', targets: 'single_enemy_front', stat: 'patk', powerScalar: 'abilityPower' }]
};
const ENEMY_MAG_ATTACK_TPL = {
  type: 'attack', school: 'magical', manaCost: 0,
  scaling: { cooldown: { min: 2.8, max: 1.8 }, abilityPower: { min: 0.85, max: 0.85 } },
  effects: [{ type: 'damage', targets: 'single_enemy_front', stat: 'matk', powerScalar: 'abilityPower' }]
};

const ENEMIES = {
  iron_vaults: {
    attackTpl: ENEMY_PHYS_ATTACK_TPL,
    bosses: [
      { name: 'Iron Sentinel',  baseHp: 60,  baseDmg: 6, basePdef: 8,  baseMdef: 4 },
      { name: 'Castellan',      baseHp: 75,  baseDmg: 7, basePdef: 10, baseMdef: 4 },
      { name: 'Siege Captain',  baseHp: 90,  baseDmg: 8, basePdef: 12, baseMdef: 5 },
      { name: 'Warden of Iron', baseHp: 110, baseDmg: 9, basePdef: 14, baseMdef: 6 }
    ],
    minions: [
      { name: 'Fortress Soldier',   baseHp: 24, baseDmg: 3, basePdef: 4, baseMdef: 2 },
      { name: 'Crossbow Conscript', baseHp: 20, baseDmg: 4, basePdef: 3, baseMdef: 2 }
    ]
  },
  shattered_spire: {
    attackTpl: ENEMY_MAG_ATTACK_TPL,
    bosses: [
      { name: 'Aetheric Construct', baseHp: 80,  baseDmg: 7,  basePdef: 4, baseMdef: 12 },
      { name: 'Reality Twister',    baseHp: 100, baseDmg: 8,  basePdef: 5, baseMdef: 14 },
      { name: 'Spire Anomaly',      baseHp: 120, baseDmg: 9,  basePdef: 6, baseMdef: 16 },
      { name: 'Warden of the Spire',baseHp: 140, baseDmg: 10, basePdef: 7, baseMdef: 18 }
    ],
    minions: [
      { name: 'Echo Wisp',    baseHp: 22, baseDmg: 4, basePdef: 2, baseMdef: 5 },
      { name: 'Fractal Imp',  baseHp: 26, baseDmg: 5, basePdef: 3, baseMdef: 4 }
    ]
  },
  whispering_spires: {
    attackTpl: ENEMY_MAG_ATTACK_TPL,
    bosses: [
      { name: 'Spire Sage',         baseHp: 70,  baseDmg: 8,  basePdef: 3, baseMdef: 14 },
      { name: 'Crystal Wraith',     baseHp: 85,  baseDmg: 9,  basePdef: 4, baseMdef: 16 },
      { name: 'Aether Conjurer',    baseHp: 100, baseDmg: 10, basePdef: 5, baseMdef: 18 },
      { name: 'Archon of Whispers', baseHp: 130, baseDmg: 11, basePdef: 6, baseMdef: 22 }
    ],
    minions: [
      { name: 'Whisper Acolyte', baseHp: 18, baseDmg: 5, basePdef: 2, baseMdef: 6 },
      { name: 'Skyborn Sigil',   baseHp: 22, baseDmg: 6, basePdef: 3, baseMdef: 5 }
    ]
  },
  hollowed_wilds: {
    // Hard-hitting physical brawlers; bigger HP pools, slightly slower attacks.
    attackTpl: ENEMY_PHYS_ATTACK_TPL,
    bosses: [
      { name: 'Tangle Warden',  baseHp: 90,  baseDmg: 8,  basePdef: 10, baseMdef: 6 },
      { name: 'Bramble Tyrant', baseHp: 115, baseDmg: 10, basePdef: 12, baseMdef: 7 },
      { name: 'Rotgrove Drake', baseHp: 145, baseDmg: 12, basePdef: 14, baseMdef: 8 },
      { name: 'Mother of Vines',baseHp: 175, baseDmg: 14, basePdef: 16, baseMdef: 9 }
    ],
    minions: [
      { name: 'Husk Lurker',  baseHp: 30, baseDmg: 5, basePdef: 5, baseMdef: 3 },
      { name: 'Thornbeast',   baseHp: 36, baseDmg: 6, basePdef: 6, baseMdef: 3 }
    ]
  }
};

export function createBattle({ dungeonId, floor }) {
  const playerUnits = buildPlayerParty();
  const enemyUnits = spawnFloor(dungeonId, floor);
  const battle = {
    dungeonId, floor,
    now: 0,
    speed: getState().settings.speed || 1,
    paused: false,
    status: 'fighting', // 'fighting' | 'cleared' | 'wiped'
    playerUnits, enemyUnits,
    fx: [],
    log: [],
    onKill: null
  };
  battle.onKill = (caster, target) => {
    battle.log.push({ type: 'kill', text: `${caster.displayName} defeated ${target.displayName}.`, t: battle.now });
  };
  // apply persistent passive buffs (Aura of Valor, Inspiring Presence, etc.)
  for (const u of battle.playerUnits) applyPassiveBuffs(u, battle.playerUnits);
  for (const u of battle.enemyUnits) applyPassiveBuffs(u, battle.enemyUnits);

  // apply tree-derived persistent buffs (dodge/crit/etc.) and keystone flags
  const state = getState();
  for (const u of battle.playerUnits) {
    if (!u.classId) continue;
    const alloc = state.roster[u.classId]?.allocatedNodes ?? [];
    for (const buff of treePctBuffs(alloc)) {
      u.buffs.push({ stat: buff.stat, amountPct: buff.amountPct, expires: Infinity, source: 'tree' });
    }
    u.keystones = treeKeystoneFlags(alloc);
  }
  return battle;
}

export function tickBattle(battle, realDt) {
  if (battle.paused || battle.status !== 'fighting') return;
  let dt = realDt * battle.speed;
  while (dt > 0) {
    const step = Math.min(TICK_DT, dt);
    stepBattle(battle, step);
    dt -= step;
  }
}

function stepBattle(battle, dt) {
  battle.now += dt;
  for (const u of [...battle.playerUnits, ...battle.enemyUnits]) {
    if (u.dead) continue;
    pruneExpired(u, battle.now);
    recomputeDynamicBuffs(u);
    regenMana(u, dt);
    tickHots(u, battle);
    tickRegen(u, battle);
    tickDots(u, battle);
    if (u.dead) continue;
    if (!isIncapacitated(u, battle.now)) tickAbilities(u, battle, dt);
  }
  // expire floating fx
  battle.fx = battle.fx.filter(f => battle.now - f.t < 1.4);

  if (battle.enemyUnits.every(e => e.dead)) {
    battle.status = 'cleared';
    battle.floorClearedT = battle.now;
    battle.log.push({ type: 'floor', text: `Floor ${battle.floor} cleared.`, t: battle.now });
  } else if (battle.playerUnits.every(p => p.dead)) {
    battle.status = 'wiped';
    battle.log.push({ type: 'floor', text: `Party wiped on floor ${battle.floor}.`, t: battle.now });
  }
}

function regenMana(u, dt) {
  if (u.maxMp <= 0) return;
  u.mp = Math.min(u.maxMp, u.mp + F.manaRegenPerSecond(u.maxMp) * dt);
}

function tickHots(u, battle) {
  for (const h of u.hots) {
    while (h.ticksLeft > 0 && battle.now >= h.nextAt) {
      const heal = Math.round(u.maxHp * h.pctPerTick);
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + heal);
      if (u.hp - before > 0) battle.fx.push({ type: 'heal', target: u, amount: u.hp - before, t: battle.now });
      h.ticksLeft--;
      h.nextAt += h.tick;
    }
  }
  u.hots = u.hots.filter(h => h.ticksLeft > 0);
}

function tickRegen(u, battle) {
  for (const r of u.regen) {
    if (battle.now - r.lastTick >= 1.0) {
      const heal = Math.round(u.maxHp * r.pct);
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + heal);
      if (u.hp - before > 0) battle.fx.push({ type: 'heal', target: u, amount: u.hp - before, t: battle.now });
      r.lastTick = battle.now;
    }
  }
}

function tickAbilities(u, battle, dt) {
  // attack-speed buffs scale how fast cooldowns tick
  const speedMul = Math.max(0.1, buffMultiplier(u, 'attackSpeedPct', battle.now));
  for (const slot of Object.keys(u.abilities)) {
    const a = u.abilities[slot];
    if (a.cooldown > 0) a.cooldown = Math.max(0, a.cooldown - dt * speedMul);
  }
  const silenced = isSilenced(u, battle.now);
  const order = u.isEnemy ? ['attack'] : ['spell2', 'spell1', 'attack'];
  for (const slot of order) {
    const a = u.abilities[slot];
    if (!a || a.cooldown > 0) continue;
    if (silenced && slot !== 'attack') continue;
    if (a.ability.manaCost > u.mp) continue;
    if (a.ability.type === 'passive') continue;
    if (slot === 'attack' && a.id === 'starter_attack') continue;
    castAbility(u, a, battle);
    return;
  }
}

function castAbility(caster, slot, battle) {
  const allies = caster.isEnemy ? battle.enemyUnits : battle.playerUnits;
  const enemies = caster.isEnemy ? battle.playerUnits : battle.enemyUnits;
  if (!enemies.some(e => !e.dead)) return;

  caster.mp = Math.max(0, caster.mp - (slot.ability.manaCost || 0));
  caster.lungeT = battle.now;

  const ctx = {
    ability: slot.ability,
    caster, allies, enemies,
    stoneLevel: slot.stoneLevel,
    floor: battle.floor,
    now: battle.now,
    fx: battle.fx,
    battle,
    onKill: battle.onKill,
    killsThisCast: 0
  };
  executeAbility(ctx);

  const cdParam = slot.ability.scaling?.cooldown;
  slot.cooldown = cdParam ? F.scaleParam(slot.ability.scaling, 'cooldown', slot.stoneLevel) : 1;

  if (slot.ability.type === 'spell') {
    battle.log.push({ type: 'cast', text: `${caster.displayName} cast ${prettyName(slot.id)}.`, t: battle.now });
  }
}

function prettyName(id) { return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// ----- builders -----

function buildPlayerParty() {
  const data = getData();
  const state = getState();
  const formation = layoutFormation(state.party);
  return state.party.map((classId, i) => {
    const cls = data.classesById[classId];
    const unit = state.roster[classId];
    return buildPlayerUnit(cls, unit, formation[i]);
  });
}

function layoutFormation(party) {
  // Front row = first 3, back row = next 3 (matches roster order; UI-driven swaps later)
  return party.map((_, i) => i < 3 ? { row: 'front', col: i } : { row: 'back', col: i - 3 });
}

function buildPlayerUnit(cls, unit, slotPos) {
  const data = getData();
  const stats = computeStats(cls, unit.level, unit.equipment, unit.allocatedNodes ?? []);
  const abilities = {};
  for (const slot of ['attack', 'spell1', 'spell2', 'passive']) {
    const aId = cls.abilities[slot];
    const ability = data.abilitiesById[aId];
    const stoneItem = unit.equipment[`stone_${slot}`];
    abilities[slot] = {
      id: aId,
      ability,
      stoneLevel: stoneItem?.abilityLevel ?? 0,
      cooldown: 0
    };
  }
  return {
    classId: cls.id, displayName: cls.displayName, family: cls.family,
    level: unit.level,
    side: 'player', row: slotPos.row, col: slotPos.col,
    hp: stats.hp, maxHp: stats.hp, displayHp: stats.hp,
    mp: stats.mp, maxMp: stats.mp,
    stats,
    abilities,
    buffs: [], hots: [], regen: [],
    dots: [], shields: [], marks: [],
    statuses: {},
    tauntedBy: null,
    dead: false,
    isEnemy: false,
    lungeT: -10,
    onHitTakenHandlers: [],
    onKillHandlers: [],
    onDodgeHandlers: [],
    dynamicBuffSpecs: []
  };
}

function computeStats(cls, level, equipment, allocatedNodes) {
  let out = {};
  for (const k of STAT_KEYS) out[k] = (cls.baseStats[k] ?? 0) + (cls.perLevelStats[k] ?? 0) * (level - 1);
  if (equipment) {
    for (const slotId in equipment) {
      const item = equipment[slotId];
      if (!item || !item.stats) continue;
      for (const k of STAT_KEYS) out[k] += item.stats[k] ?? 0;
    }
  }
  if (allocatedNodes && allocatedNodes.length) out = applyTreeToBaseStats(allocatedNodes, out);
  return out;
}

function spawnFloor(dungeonId, floor) {
  const set = ENEMIES[dungeonId] || ENEMIES.iron_vaults;
  const boss = set.bosses[floor % set.bosses.length];
  const minionCount = floor < 5 ? 0 : floor < 15 ? 1 : floor < 30 ? 2 : 3;
  const out = [];
  out.push(buildEnemy(boss, floor, 'front', 1, set.attackTpl));
  for (let i = 0; i < minionCount; i++) {
    const m = set.minions[i % set.minions.length];
    const positions = [{ row: 'front', col: 0 }, { row: 'front', col: 2 }, { row: 'back', col: 1 }];
    const pos = positions[i] || { row: 'back', col: i };
    out.push(buildEnemy(m, floor, pos.row, pos.col, set.attackTpl));
  }
  return out;
}

function buildEnemy(template, floor, row, col, attackTpl) {
  const hp = Math.round(F.enemyHP(template.baseHp, floor));
  const dmg = Math.round(F.enemyDmg(template.baseDmg, floor));
  const pdef = Math.round(F.enemyDef(template.basePdef, floor));
  const mdef = Math.round(F.enemyDef(template.baseMdef, floor));
  return {
    classId: null,
    displayName: template.name,
    family: 'enemy',
    level: floor,
    side: 'enemy', row, col,
    hp, maxHp: hp, mp: 0, maxMp: 0,
    stats: { hp, mp: 0, patk: dmg, matk: dmg, pdef, mdef },
    abilities: {
      attack: { id: 'enemy_attack', ability: attackTpl ?? ENEMY_PHYS_ATTACK_TPL, stoneLevel: Math.min(100, floor + 10), cooldown: 0 }
    },
    buffs: [], hots: [], regen: [],
    dots: [], shields: [], marks: [],
    statuses: {},
    tauntedBy: null,
    dead: false,
    isEnemy: true,
    displayHp: hp,
    lungeT: -10,
    onHitTakenHandlers: [],
    onKillHandlers: [],
    onDodgeHandlers: [],
    dynamicBuffSpecs: []
  };
}

export function reviveSurvivors(playerUnits) {
  for (const u of playerUnits) {
    if (u.dead) {
      u.dead = false;
      u.hp = Math.round(u.maxHp * 0.25);
    } else {
      u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.10));
    }
    u.mp = u.maxMp;
    u.buffs = []; u.hots = []; u.regen = []; u.tauntedBy = null;
    u.dots = []; u.shields = []; u.marks = []; u.statuses = {};
    u.onHitTakenHandlers = []; u.onKillHandlers = []; u.onDodgeHandlers = []; u.dynamicBuffSpecs = [];
    for (const slot of Object.keys(u.abilities)) u.abilities[slot].cooldown = 0;
  }
}

export { buffMultiplier, effectiveStat };
