import { getData, getState } from '../state.js';
import {
  executeAbility, buffMultiplier, effectiveStat, pruneExpired,
  isIncapacitated, isSilenced, tickDots, applyPassiveBuffs,
  recomputeDynamicBuffs, getHandler
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
      { name: 'Iron Sentinel',         baseHp: 60,  baseDmg: 6,  basePdef: 8,  baseMdef: 4 },
      { name: 'Castellan',             baseHp: 75,  baseDmg: 7,  basePdef: 10, baseMdef: 4 },
      { name: 'Siege Captain',         baseHp: 90,  baseDmg: 8,  basePdef: 12, baseMdef: 5 },
      { name: 'Warden of Iron',        baseHp: 110, baseDmg: 9,  basePdef: 14, baseMdef: 6 },
      { name: 'Fortress Marshal',      baseHp: 125, baseDmg: 10, basePdef: 14, baseMdef: 6 },
      { name: 'Mailed Lieutenant',     baseHp: 160, baseDmg: 9,  basePdef: 13, baseMdef: 6, special: 'summon_on_death' },
      { name: 'Steelguard Champion',   baseHp: 100, baseDmg: 10, basePdef: 22, baseMdef: 10, special: 'ironskin' },
      { name: 'Shieldbreaker Berserker',baseHp: 110, baseDmg: 11, basePdef: 10, baseMdef: 5, special: 'enrage' }
    ],
    minions: [
      { name: 'Fortress Soldier',   baseHp: 24, baseDmg: 3, basePdef: 4, baseMdef: 2 },
      { name: 'Crossbow Conscript', baseHp: 20, baseDmg: 4, basePdef: 3, baseMdef: 2 }
    ]
  },
  shattered_spire: {
    attackTpl: ENEMY_MAG_ATTACK_TPL,
    bosses: [
      { name: 'Aetheric Construct',    baseHp: 80,  baseDmg: 7,  basePdef: 4, baseMdef: 12 },
      { name: 'Reality Twister',       baseHp: 100, baseDmg: 8,  basePdef: 5, baseMdef: 14 },
      { name: 'Spire Anomaly',         baseHp: 120, baseDmg: 9,  basePdef: 6, baseMdef: 16 },
      { name: 'Warden of the Spire',   baseHp: 140, baseDmg: 10, basePdef: 7, baseMdef: 18 },
      { name: 'Reality Shifter',       baseHp: 130, baseDmg: 11, basePdef: 6, baseMdef: 17, special: 'phase_shift' },
      { name: 'Echo Phantom',          baseHp: 110, baseDmg: 10, basePdef: 4, baseMdef: 26 },
      { name: 'Spire Crystal',         baseHp: 90,  baseDmg: 9,  basePdef: 16, baseMdef: 22, special: 'ironskin' },
      { name: 'Anomaly Spawn',         baseHp: 115, baseDmg: 10, basePdef: 6, baseMdef: 14, special: 'spawner' }
    ],
    minions: [
      { name: 'Echo Wisp',    baseHp: 22, baseDmg: 4, basePdef: 2, baseMdef: 5 },
      { name: 'Fractal Imp',  baseHp: 26, baseDmg: 5, basePdef: 3, baseMdef: 4 }
    ]
  },
  whispering_spires: {
    attackTpl: ENEMY_MAG_ATTACK_TPL,
    bosses: [
      { name: 'Spire Sage',            baseHp: 70,  baseDmg: 8,  basePdef: 3, baseMdef: 14 },
      { name: 'Crystal Wraith',        baseHp: 85,  baseDmg: 9,  basePdef: 4, baseMdef: 16 },
      { name: 'Aether Conjurer',       baseHp: 100, baseDmg: 10, basePdef: 5, baseMdef: 18 },
      { name: 'Archon of Whispers',    baseHp: 130, baseDmg: 11, basePdef: 6, baseMdef: 22 },
      { name: 'Tower Magister',        baseHp: 120, baseDmg: 12, basePdef: 5, baseMdef: 20, special: 'phase_shift' },
      { name: 'Crystal Sage',          baseHp: 95,  baseDmg: 10, basePdef: 4, baseMdef: 28 },
      { name: 'Aether Adept',          baseHp: 110, baseDmg: 11, basePdef: 5, baseMdef: 18, special: 'spawner' },
      { name: 'Sky Reaver',            baseHp: 105, baseDmg: 11, basePdef: 5, baseMdef: 17, special: 'enrage' }
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
      { name: 'Tangle Warden',         baseHp: 90,  baseDmg: 8,  basePdef: 10, baseMdef: 6 },
      { name: 'Bramble Tyrant',        baseHp: 115, baseDmg: 10, basePdef: 12, baseMdef: 7 },
      { name: 'Rotgrove Drake',        baseHp: 145, baseDmg: 12, basePdef: 14, baseMdef: 8 },
      { name: 'Mother of Vines',       baseHp: 175, baseDmg: 14, basePdef: 16, baseMdef: 9 },
      { name: 'Briar Lord',            baseHp: 130, baseDmg: 11, basePdef: 13, baseMdef: 7 },
      { name: 'Vine Strangler',        baseHp: 140, baseDmg: 11, basePdef: 13, baseMdef: 7, special: 'spawner' },
      { name: 'Rotmaw Beast',          baseHp: 125, baseDmg: 13, basePdef: 12, baseMdef: 7, special: 'enrage' },
      { name: 'Mother Tree',           baseHp: 220, baseDmg: 12, basePdef: 14, baseMdef: 8, special: 'summon_on_death' }
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
    // count player kills only (not enemy-on-player) for achievement progress
    if (caster.side === 'player' && target.side === 'enemy') {
      battle.kills = (battle.kills ?? 0) + 1;
    }
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

  // Wisdom of Ages keystone: passive party regen whenever any party member owns it.
  // 0.5% max HP per second, ticking out of the regen array so existing tick loop handles it.
  const anyWisdom = battle.playerUnits.some(u => u.keystones?.has?.('wisdom_of_ages'));
  if (anyWisdom) {
    for (const u of battle.playerUnits) {
      u.regen.push({ pct: 0.005, expires: Infinity, lastTick: -1, source: 'wisdom_of_ages' });
    }
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
  tickSummonExpiry(battle);
  for (const u of [...battle.playerUnits, ...battle.enemyUnits]) {
    if (u.dead) continue;
    pruneExpired(u, battle.now);
    recomputeDynamicBuffs(u);
    regenMana(u, dt);
    tickHots(u, battle);
    tickRegen(u, battle);
    tickDots(u, battle);
    tickChannel(u, battle);
    tickAuras(u, battle);
    if (u.dead) continue;
    if (u.isBoss && u.special) tickBossSpecial(u, battle);
    if (!isIncapacitated(u, battle.now) && !isChanneling(u, battle.now)) tickAbilities(u, battle, dt);
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

  // From Beyond keystone: 20% chance to refund the cooldown of the cast.
  if (caster.keystones?.has?.('from_beyond') && Math.random() < 0.20) {
    slot.cooldown = 0;
    battle.fx?.push({ type: 'absorb', target: caster, amount: 0, t: battle.now });
  }

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
    onHealHandlers: [],
    onParryHandlers: [],
    onHotCompleteHandlers: [],
    onMinionDeathHandlers: [],
    onPartyHitHandlers: [],
    dynamicBuffSpecs: [],
    castedThisFight: 0,
    resources: { rage: 0, combo: 0, charges: 0 },
    songs: [],
    channelState: null,
    auras: [],
    nextHitMods: [],
    deathSavesUsed: 0,
    parryChanceFromStat: null,
    drFromStat: null,
    overhealConvertPct: 0,
    refundCdOnDodgePct: 0
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

// ============================================================================
// Summoned entities — pets, deployables, totems, traps, illusions, skeletons.
// Each is a first-class unit added to battle.playerUnits / enemyUnits with
// isMinion=true and an expiresAt timestamp. Engine prunes expired ones each
// tick. Positions are picked from free formation slots; if none free, the
// minion sits in the back row at a high col index.
// ============================================================================
const SUMMON_ATTACK_PHYS = {
  type: 'attack', school: 'physical', manaCost: 0,
  scaling: { cooldown: { min: 2.0, max: 1.0 }, abilityPower: { min: 0.6, max: 0.6 } },
  effects: [{ type: 'damage', targets: 'single_enemy_front', stat: 'patk', powerScalar: 'abilityPower' }]
};
const SUMMON_ATTACK_MAG = {
  type: 'attack', school: 'magical', manaCost: 0,
  scaling: { cooldown: { min: 2.5, max: 1.5 }, abilityPower: { min: 0.5, max: 0.5 } },
  effects: [{ type: 'damage', targets: 'single_enemy', stat: 'matk', powerScalar: 'abilityPower' }]
};

export function buildSummon(owner, battle, opts = {}) {
  const statScale = (opts.statScalePct ?? 30) / 100;
  const ownerHp = (owner.maxHp ?? 80);
  const hp = Math.max(8, Math.round(ownerHp * statScale * (opts.hpMul ?? 1)));
  const stats = {
    hp,
    mp: 0,
    patk: Math.round((owner.stats?.patk ?? 8) * statScale),
    matk: Math.round((owner.stats?.matk ?? 8) * statScale),
    pdef: Math.round((owner.stats?.pdef ?? 8) * statScale),
    mdef: Math.round((owner.stats?.mdef ?? 8) * statScale)
  };
  const pos = pickFreeSlot(battle, owner.side === 'player' ? 'player' : 'enemy', opts.preferredRow ?? 'back');
  const attackTpl = opts.school === 'magical' ? SUMMON_ATTACK_MAG : SUMMON_ATTACK_PHYS;
  return {
    classId: null,
    displayName: opts.name ?? 'Minion',
    family: opts.family ?? 'minion',
    kind: opts.kind ?? 'minion',
    level: owner.level ?? 1,
    side: owner.side,
    row: pos.row, col: pos.col,
    hp, maxHp: hp, mp: 0, maxMp: 0,
    stats,
    abilities: { attack: { id: 'summon_attack', ability: attackTpl, stoneLevel: Math.min(100, (owner.level ?? 1) + 5), cooldown: 0 } },
    buffs: [], hots: [], regen: [],
    dots: [], shields: [], marks: [],
    statuses: {},
    tauntedBy: null,
    dead: false,
    isEnemy: owner.side === 'enemy',
    isMinion: true,
    minionOwner: owner,
    expiresAt: opts.duration ? battle.now + opts.duration : Infinity,
    immobile: !!opts.immobile,
    auraSpec: opts.auraSpec ?? null,
    trapSpec: opts.trapSpec ?? null,
    illusion: !!opts.illusion,
    onHitTakenHandlers: [], onKillHandlers: [], onDodgeHandlers: [],
    onHealHandlers: [], onParryHandlers: [], onHotCompleteHandlers: [],
    onMinionDeathHandlers: [], onPartyHitHandlers: [],
    dynamicBuffSpecs: [],
    castedThisFight: 0,
    resources: { rage: 0, combo: 0, charges: 0 },
    songs: [], channelState: null, auras: [],
    nextHitMods: [], deathSavesUsed: 0,
    displayHp: hp,
    lungeT: -10
  };
}

// Pick the first free formation slot for a side, preferring back rows so
// summons cluster behind the owner. Falls back to a back-row overflow column
// past the standard 0-2 layout if all 6 are taken.
function pickFreeSlot(battle, side, preferredRow = 'back') {
  const list = side === 'player' ? battle.playerUnits : battle.enemyUnits;
  const taken = new Set(list.filter(u => !u.dead).map(u => `${u.row}:${u.col}`));
  const order = preferredRow === 'back'
    ? [['back', 1], ['back', 0], ['back', 2], ['front', 0], ['front', 2], ['front', 1]]
    : [['front', 0], ['front', 2], ['front', 1], ['back', 1], ['back', 0], ['back', 2]];
  for (const [row, col] of order) if (!taken.has(`${row}:${col}`)) return { row, col };
  return { row: 'back', col: 3 + list.length }; // overflow
}

export function tickSummonExpiry(battle) {
  const now = battle.now;
  for (const list of [battle.playerUnits, battle.enemyUnits]) {
    for (const u of list) {
      if (u.dead || !u.isMinion) continue;
      if (u.expiresAt && now >= u.expiresAt) {
        u.dead = true;
        battle.fx?.push({ type: 'death', target: u, t: now });
      }
      // Trap arming + trigger.
      if (u.trapSpec) tickTrap(u, battle);
    }
  }
}

function tickTrap(trap, battle) {
  const spec = trap.trapSpec;
  if (!spec) return;
  if (battle.now < spec.armedAt) return;
  // Once armed, the trap fires when any enemy is in front row of the opposing side.
  const enemies = trap.side === 'player' ? battle.enemyUnits : battle.playerUnits;
  const aliveFront = enemies.filter(e => !e.dead && e.row === 'front');
  if (!aliveFront.length) return;
  // Detonate: damage the front line then mark dead so it gets cleaned up.
  const ctx = {
    ability: spec.ability,
    caster: trap.minionOwner ?? trap,
    allies: trap.side === 'player' ? battle.playerUnits : battle.enemyUnits,
    enemies,
    stoneLevel: spec.stoneLevel,
    floor: battle.floor,
    now: battle.now,
    fx: battle.fx,
    battle,
    onKill: battle.onKill,
    killsThisCast: 0
  };
  const handler = getHandler('damage');
  if (handler) {
    handler({
      type: 'damage',
      targets: 'all_enemies',
      stat: 'patk',
      powerScalar: spec.powerScalar
    }, ctx);
  }
  trap.dead = true;
  battle.fx?.push({ type: 'death', target: trap, t: battle.now });
}

// ============================================================================
// Channeled spells & auras
// ============================================================================
export function isChanneling(unit, now) {
  return unit.channelState && unit.channelState.until > now;
}

function tickChannel(unit, battle) {
  const cs = unit.channelState;
  if (!cs) return;
  if (battle.now >= cs.until) {
    unit.channelState = null;
    return;
  }
  // Re-fire the inner damage/heal/tick effect periodically.
  if (battle.now >= cs.nextTick) {
    cs.nextTick += cs.tickInterval;
    const ctx = {
      ability: cs.ability,
      caster: unit,
      allies: unit.isEnemy ? battle.enemyUnits : battle.playerUnits,
      enemies: unit.isEnemy ? battle.playerUnits : battle.enemyUnits,
      stoneLevel: cs.stoneLevel,
      floor: battle.floor,
      now: battle.now,
      fx: battle.fx,
      battle,
      onKill: battle.onKill,
      killsThisCast: 0,
      _channelTick: true
    };
    const innerEffect = cs.innerEffect;
    const handler = getHandler(innerEffect.type);
    if (handler) handler(innerEffect, ctx);
    // Channel HP-cost tick (e.g. Abyssal Maw drains caster).
    if (cs.selfHpCostPctPerTick) {
      const cost = Math.round(unit.maxHp * cs.selfHpCostPctPerTick / 100);
      unit.hp = Math.max(1, unit.hp - cost);
    }
  }
}

function tickAuras(unit, battle) {
  if (!unit.auras || !unit.auras.length) return;
  for (const aura of unit.auras) {
    if (battle.now >= aura.until) continue;
    if (battle.now >= aura.nextTick) {
      aura.nextTick += aura.tickInterval;
      // Heal allies in range.
      if (aura.healPctMax > 0) {
        const allies = unit.isEnemy ? battle.enemyUnits : battle.playerUnits;
        for (const a of allies) {
          if (a.dead) continue;
          const amt = Math.round(a.maxHp * aura.healPctMax / 100);
          const before = a.hp;
          a.hp = Math.min(a.maxHp, a.hp + amt);
          if (a.hp - before > 0) battle.fx?.push({ type: 'heal', target: a, amount: a.hp - before, t: battle.now });
        }
      }
    }
  }
  unit.auras = unit.auras.filter(a => a.until > battle.now);
}

function tickBossSpecial(boss, battle) {
  const hpPct = boss.hp / boss.maxHp;
  const state = boss.specialState ??= {};

  if (boss.special === 'enrage' && !state.enraged && hpPct <= 0.30) {
    state.enraged = true;
    boss.buffs.push({ stat: 'patk', amountPct: 50, expires: Infinity, source: 'enrage' });
    boss.buffs.push({ stat: 'matk', amountPct: 50, expires: Infinity, source: 'enrage' });
    battle.log.push({ type: 'kill', text: `${boss.displayName} enrages!`, t: battle.now });
  }

  if (boss.special === 'phase_shift' && !state.phaseShifted && hpPct <= 0.50) {
    state.phaseShifted = true;
    const cur = boss.abilities.attack.ability;
    const flipped = cur === ENEMY_PHYS_ATTACK_TPL ? ENEMY_MAG_ATTACK_TPL : ENEMY_PHYS_ATTACK_TPL;
    boss.abilities.attack.ability = flipped;
    boss.abilities.attack.cooldown = 0;
    const newSchool = flipped === ENEMY_MAG_ATTACK_TPL ? 'magical' : 'physical';
    battle.log.push({ type: 'kill', text: `${boss.displayName} shifts to ${newSchool} attacks!`, t: battle.now });
  }

  if (boss.special === 'spawner' && !state.spawned && hpPct <= 0.50) {
    state.spawned = true;
    const set = ENEMIES[boss.dungeonId] || ENEMIES.iron_vaults;
    const tpl = set.minions[Math.floor(Math.random() * set.minions.length)];
    // pick a free slot in the enemy formation
    const taken = new Set(battle.enemyUnits.filter(e => !e.dead).map(e => `${e.row}:${e.col}`));
    const positions = [
      { row: 'back', col: 1 }, { row: 'back', col: 0 }, { row: 'back', col: 2 },
      { row: 'front', col: 0 }, { row: 'front', col: 2 }
    ];
    const pos = positions.find(p => !taken.has(`${p.row}:${p.col}`));
    if (pos) {
      const minion = buildEnemy(tpl, boss.level, pos.row, pos.col, set.attackTpl);
      battle.enemyUnits.push(minion);
      battle.log.push({ type: 'kill', text: `${boss.displayName} summons ${tpl.name}.`, t: battle.now });
    }
  }
}

function spawnFloor(dungeonId, floor) {
  const set = ENEMIES[dungeonId] || ENEMIES.iron_vaults;
  const boss = set.bosses[floor % set.bosses.length];
  const minionCount = floor < 5 ? 0 : floor < 15 ? 1 : floor < 30 ? 2 : 3;
  const out = [];
  out.push(buildEnemy(boss, floor, 'front', 1, set.attackTpl, { isBoss: true, dungeonId }));
  for (let i = 0; i < minionCount; i++) {
    const m = set.minions[i % set.minions.length];
    const positions = [{ row: 'front', col: 0 }, { row: 'front', col: 2 }, { row: 'back', col: 1 }];
    const pos = positions[i] || { row: 'back', col: i };
    out.push(buildEnemy(m, floor, pos.row, pos.col, set.attackTpl));
  }
  return out;
}

function buildEnemy(template, floor, row, col, attackTpl, opts = {}) {
  const hp = Math.round(F.enemyHP(template.baseHp, floor));
  const dmg = Math.round(F.enemyDmg(template.baseDmg, floor));
  const pdef = Math.round(F.enemyDef(template.basePdef, floor));
  const mdef = Math.round(F.enemyDef(template.baseMdef, floor));
  const unit = {
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
    isBoss: !!opts.isBoss,
    dungeonId: opts.dungeonId ?? null,
    special: template.special ?? null,
    specialState: {},
    displayHp: hp,
    lungeT: -10,
    onHitTakenHandlers: [],
    onKillHandlers: [],
    onDodgeHandlers: [],
    onHealHandlers: [],
    onParryHandlers: [],
    onHotCompleteHandlers: [],
    onMinionDeathHandlers: [],
    onPartyHitHandlers: [],
    dynamicBuffSpecs: [],
    castedThisFight: 0,
    resources: { rage: 0, combo: 0, charges: 0 },
    songs: [],
    channelState: null,
    auras: [],
    nextHitMods: [],
    deathSavesUsed: 0
  };
  // Iron Skin special: apply at spawn — passive +30% to defenses (already
  // visible in the buffMultiplier path).
  if (unit.special === 'ironskin') {
    unit.buffs.push({ stat: 'pdef', amountPct: 30, expires: Infinity, source: 'special' });
    unit.buffs.push({ stat: 'mdef', amountPct: 30, expires: Infinity, source: 'special' });
  }
  // Summon-on-death: bind a death hook so the dying boss spawns reinforcements.
  if (unit.special === 'summon_on_death' && opts.isBoss) {
    unit.onDeathHandler = (ctx) => {
      const set = ENEMIES[unit.dungeonId] || ENEMIES.iron_vaults;
      const battle = ctx.battle;
      if (!battle) return;
      const taken = new Set(battle.enemyUnits.filter(e => !e.dead).map(e => `${e.row}:${e.col}`));
      const positions = [
        { row: 'back', col: 1 }, { row: 'back', col: 0 }, { row: 'back', col: 2 },
        { row: 'front', col: 0 }, { row: 'front', col: 2 }
      ];
      const count = 1 + (Math.random() < 0.5 ? 1 : 0); // 1 or 2 minions
      for (let i = 0; i < count; i++) {
        const pos = positions.find(p => !taken.has(`${p.row}:${p.col}`));
        if (!pos) break;
        const tpl = set.minions[Math.floor(Math.random() * set.minions.length)];
        const minion = buildEnemy(tpl, unit.level, pos.row, pos.col, set.attackTpl);
        battle.enemyUnits.push(minion);
        taken.add(`${pos.row}:${pos.col}`);
      }
      battle.log.push({ type: 'kill', text: `${unit.displayName}'s death echoes — ${count} minion${count>1?'s':''} appear.`, t: battle.now });
    };
  }
  return unit;
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
    u.onHitTakenHandlers = []; u.onKillHandlers = []; u.onDodgeHandlers = [];
    u.onHealHandlers = []; u.onParryHandlers = []; u.onHotCompleteHandlers = [];
    u.onMinionDeathHandlers = []; u.onPartyHitHandlers = [];
    u.dynamicBuffSpecs = [];
    u.castedThisFight = 0;
    u.resources = { rage: 0, combo: 0, charges: 0 };
    u.songs = []; u.channelState = null; u.auras = [];
    u.nextHitMods = []; u.deathSavesUsed = 0;
    for (const slot of Object.keys(u.abilities)) u.abilities[slot].cooldown = 0;
  }
}

export { buffMultiplier, effectiveStat };

// Returns metadata for the boss the player would meet at `floor` of `dungeonId`.
// Used by the hub for boss-preview hints (no spoilers past the boss list cycle).
export function peekFloorBoss(dungeonId, floor) {
  const set = ENEMIES[dungeonId];
  if (!set || floor < 1) return null;
  const tpl = set.bosses[floor % set.bosses.length];
  return { name: tpl.name, special: tpl.special ?? null };
}
