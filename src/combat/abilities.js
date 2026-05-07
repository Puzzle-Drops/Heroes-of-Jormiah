import * as F from './formulas.js';

// Effect handler registry. Unknown effect types log once and no-op so the
// engine can grow safely as handlers land.

const warned = new Set();
function warnOnce(t) {
  if (warned.has(t)) return;
  warned.add(t);
  console.warn(`[abilities] no handler for effect type: ${t}`);
}

export function executeAbility(ctx) {
  for (const effect of ctx.ability.effects) {
    const fn = HANDLERS[effect.type];
    if (fn) fn(effect, ctx);
    else warnOnce(effect.type);
  }
}

function scalar(value, ability, stoneLevel) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const sign = value.startsWith('-') ? -1 : 1;
    const key = sign === -1 ? value.slice(1) : value;
    return sign * F.scaleParam(ability.scaling, key, stoneLevel);
  }
  return 0;
}

function alive(units) { return units.filter(u => !u.dead); }
function targetable(units, now) { return units.filter(u => !u.dead && !((u.statuses?.untargetable ?? 0) > now)); }

function resolveTargets(selector, ctx) {
  const { caster, allies, enemies, now } = ctx;
  switch (selector) {
    case 'self': return [caster];
    case 'party': return alive(allies);
    case 'around_self': return alive(allies);

    case 'single_enemy':
    case 'single_enemy_front':
    case 'single_enemy_front_plus_adjacent': {
      const front = targetable(enemies, now).filter(e => e.row === 'front');
      if (front.length) return [lowestHp(front)];
      const back = targetable(enemies, now);
      return back.length ? [lowestHp(back)] : [];
    }
    case 'all_enemies': return targetable(enemies, now);
    case 'enemy_line': {
      const front = targetable(enemies, now).filter(e => e.row === 'front');
      return front.length ? front : targetable(enemies, now);
    }
    case 'random_enemies': {
      const pool = targetable(enemies, now);
      return pool.length ? [pool[Math.floor(Math.random() * pool.length)]] : [];
    }

    case 'lowest_hp_ally':
    case 'single_ally':
    case 'single_ally_lowest_hp': {
      const pool = alive(allies);
      return pool.length ? [lowestHpPct(pool)] : [];
    }
    case 'two_allies': {
      const pool = alive(allies).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
      return pool.slice(0, 2);
    }
    case 'nearest_ally': {
      const pool = alive(allies).filter(a => a !== caster);
      return pool.length ? [pool[0]] : [caster];
    }
    case 'single_marked_enemy': {
      const marked = targetable(enemies, now).filter(e => (e.marks ?? []).some(m => m.expires > now));
      if (marked.length) return [marked[0]];
      return targetable(enemies, now).slice(0, 1);
    }

    default:
      return targetable(enemies, now).slice(0, 1);
  }
}

function lowestHp(units)    { return units.reduce((a, b) => a.hp <= b.hp ? a : b); }
function lowestHpPct(units) { return units.reduce((a, b) => (a.hp / a.maxHp) <= (b.hp / b.maxHp) ? a : b); }

// ============================================================================
// Effective stat with buffs applied
// ============================================================================

export function buffMultiplier(unit, stat, now) {
  let mul = 1;
  for (const b of unit.buffs) {
    if (b.expires <= now) continue;
    if (b.stat === stat) mul *= (1 + (b.amountPct ?? 0) / 100);
  }
  return mul;
}

// Additive percentage sum (for chance-style stats like dodgePct, critChancePct,
// critDamagePct). Multiple buffs add their percentages directly rather than
// multiplying a base value.
export function sumBuffPct(unit, stat, now) {
  let total = 0;
  for (const b of unit.buffs) {
    if (b.expires <= now) continue;
    if (b.stat === stat) total += (b.amountPct ?? 0);
  }
  return total;
}

export function effectiveStat(unit, stat, now) {
  return (unit.stats[stat] ?? 0) * buffMultiplier(unit, stat, now);
}

function rollDodge(target, now) {
  const chance = sumBuffPct(target, 'dodgePct', now);
  if (chance <= 0) return false;
  return Math.random() * 100 < chance;
}

function rollCritMultiplier(caster, now) {
  const chance = sumBuffPct(caster, 'critChancePct', now);
  if (chance <= 0) return 1;
  if (Math.random() * 100 >= chance) return 1;
  const bonus = sumBuffPct(caster, 'critDamagePct', now);
  return 1.5 + bonus / 100;
}

// ============================================================================
// Damage application — checks shields, damageTakenPct, status (frozen takes more)
// ============================================================================

function applyDamage(target, raw, ctx) {
  if (target.dead) return;
  let amount = raw;

  // damage taken modifier (e.g. Shield Wall reduces; Frozen amplifies via tag)
  amount *= buffMultiplier(target, 'damageTakenPct', ctx.now);
  if ((target.statuses?.frozen ?? 0) > ctx.now) amount *= 1.30;
  amount = Math.max(1, Math.round(amount));

  // shields absorb first
  let remaining = amount;
  for (const s of target.shields ?? []) {
    if (s.expires <= ctx.now || s.amount <= 0) continue;
    const absorbed = Math.min(remaining, s.amount);
    s.amount -= absorbed;
    remaining -= absorbed;
    if (remaining <= 0) break;
  }
  target.shields = (target.shields ?? []).filter(s => s.amount > 0 && s.expires > ctx.now);

  if (remaining > 0) {
    target.hp = Math.max(0, target.hp - remaining);
    ctx.fx?.push({ type: 'dmg', target, amount: remaining, t: ctx.now });
    ctx.fx?.push({ type: 'impact', target, t: ctx.now });

    // fire on-hit-taken passives
    if (target.onHitTakenHandlers?.length) {
      const evt = { target, attacker: ctx.caster, amount: remaining, ctx };
      for (const h of target.onHitTakenHandlers) h(evt);
    }

    if (target.hp <= 0) {
      target.dead = true;
      ctx.fx?.push({ type: 'death', target, t: ctx.now });
      ctx.onKill?.(ctx.caster, target);
      ctx.killsThisCast = (ctx.killsThisCast ?? 0) + 1;
      // fire on-kill passives on the killer
      if (ctx.caster?.onKillHandlers?.length) {
        const evt = { caster: ctx.caster, target, ctx };
        for (const h of ctx.caster.onKillHandlers) h(evt);
      }
    }
  } else {
    ctx.fx?.push({ type: 'absorb', target, amount, t: ctx.now });
  }
}

function applyHeal(target, amount, ctx) {
  if (target.dead || amount <= 0) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  if (target.hp - before > 0) ctx.fx?.push({ type: 'heal', target, amount: target.hp - before, t: ctx.now });
}

function setStatus(target, key, expires) {
  target.statuses ??= {};
  target.statuses[key] = Math.max(target.statuses[key] ?? 0, expires);
}

// ============================================================================
// Handlers
// ============================================================================

const HANDLERS = {

  damage(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    if (!targets.length) return;
    const power = scalar(effect.powerScalar ?? 1, ctx.ability, ctx.stoneLevel);
    const stat = effect.stat ?? 'patk';
    const atk = effectiveStat(ctx.caster, stat, ctx.now) || ctx.caster.stats.patk;
    const defStat = (effect.damageType === 'physical' || stat === 'patk') ? 'pdef' : 'mdef';
    const hits = effect.hits ? Math.max(1, Math.round(scalar(effect.hits, ctx.ability, ctx.stoneLevel))) : 1;
    const ignorePct = effect.ignoreDefPct ? scalar(effect.ignoreDefPct, ctx.ability, ctx.stoneLevel) : 0;
    for (const t of targets) {
      // dodge gates the entire hit (single roll covers all sub-hits for clarity)
      if (rollDodge(t, ctx.now)) {
        ctx.fx?.push({ type: 'dodge', target: t, t: ctx.now });
        if (t.onDodgeHandlers?.length) {
          const evt = { target: t, attacker: ctx.caster, ctx };
          for (const h of t.onDodgeHandlers) h(evt);
        }
        continue;
      }
      const def = effectiveStat(t, defStat, ctx.now) * (1 - ignorePct / 100);
      let total = 0;
      let crit = false;
      for (let i = 0; i < hits; i++) {
        let dmg = F.damage(power, atk, def, ctx.floor);
        const critMul = rollCritMultiplier(ctx.caster, ctx.now);
        if (critMul > 1) { dmg = Math.round(dmg * critMul); crit = true; }
        total += dmg;
      }
      if (crit) ctx.fx?.push({ type: 'crit', target: t, t: ctx.now });
      applyDamage(t, total, ctx);
    }
  },

  heal(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const pct = scalar(effect.amountPctMax, ctx.ability, ctx.stoneLevel) / 100;
    for (const t of targets) applyHeal(t, Math.round(t.maxHp * pct), ctx);
  },

  buff(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const amountPct = scalar(effect.amountPct ?? effect.amount ?? 0, ctx.ability, ctx.stoneLevel);
    const dur = scalar(effect.duration ?? 0, ctx.ability, ctx.stoneLevel);
    for (const t of targets) {
      t.buffs.push({
        stat: effect.stat,
        amountPct,
        expires: dur > 0 ? ctx.now + dur : Infinity
      });
    }
  },

  taunt(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 2, ctx.ability, ctx.stoneLevel);
    for (const t of targets) t.tauntedBy = { caster: ctx.caster, expires: ctx.now + dur };
  },

  hot(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const pctPerTick = scalar(effect.amountPctMaxPerTick, ctx.ability, ctx.stoneLevel) / 100;
    const tick = scalar(effect.tick ?? 1, ctx.ability, ctx.stoneLevel) || 1;
    const ticks = effect.ticks
      ? Math.max(1, Math.round(scalar(effect.ticks, ctx.ability, ctx.stoneLevel)))
      : Math.max(1, Math.round(scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel) / tick));
    for (const t of targets) t.hots.push({ pctPerTick, tick, ticksLeft: ticks, nextAt: ctx.now + tick });
  },

  regen(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const pct = scalar(effect.amountPctMax, ctx.ability, ctx.stoneLevel) / 100;
    const dur = scalar(effect.duration ?? 5, ctx.ability, ctx.stoneLevel) || 5;
    for (const t of targets) t.regen.push({ pct, expires: ctx.now + dur, lastTick: ctx.now });
  },

  // ---- v0.2: status & dot effects ----

  dot(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dpsPct = scalar(effect.dpsPct, ctx.ability, ctx.stoneLevel) / 100;
    const dur = scalar(effect.duration, ctx.ability, ctx.stoneLevel) || 4;
    const tag = effect.tag ?? 'dot';
    for (const t of targets) {
      t.dots ??= [];
      t.dots.push({ tag, dpsPct, expires: ctx.now + dur, lastTick: ctx.now, source: ctx.caster });
    }
  },

  stackDot(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dpsPct = scalar(effect.amountPct, ctx.ability, ctx.stoneLevel) / 100;
    const dur = scalar(effect.duration, ctx.ability, ctx.stoneLevel) || 4;
    const tag = effect.tag ?? 'dot';
    for (const t of targets) {
      t.dots ??= [];
      t.dots.push({ tag, dpsPct, expires: ctx.now + dur, lastTick: ctx.now, source: ctx.caster });
    }
  },

  detonateDot(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const tag = effect.tag ?? 'dot';
    const mult = scalar(effect.multiplier, ctx.ability, ctx.stoneLevel) || 1.5;
    for (const t of targets) {
      const stacks = (t.dots ?? []).filter(d => d.tag === tag && d.expires > ctx.now);
      if (!stacks.length) continue;
      let total = 0;
      for (const d of stacks) {
        const remainingTime = Math.max(0, d.expires - ctx.now);
        total += t.maxHp * d.dpsPct * remainingTime;
      }
      const dmg = Math.max(1, Math.round(total * mult));
      applyDamage(t, dmg, ctx);
      t.dots = (t.dots ?? []).filter(d => d.tag !== tag);
    }
  },

  slow(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const amountPct = scalar(effect.amountPct, ctx.ability, ctx.stoneLevel);
    const dur = scalar(effect.duration ?? 3, ctx.ability, ctx.stoneLevel);
    for (const t of targets) {
      t.buffs.push({ stat: 'attackSpeedPct', amountPct: -amountPct, expires: ctx.now + dur, tag: 'slow' });
      setStatus(t, 'slowed', ctx.now + dur);
    }
  },

  stackingSlow(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const perTickPct = scalar(effect.perTickPct, ctx.ability, ctx.stoneLevel);
    const dur = scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel);
    for (const t of targets) {
      t.buffs.push({ stat: 'attackSpeedPct', amountPct: -perTickPct, expires: ctx.now + dur, tag: 'slow' });
      setStatus(t, 'slowed', ctx.now + dur);
    }
  },

  stun(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration, ctx.ability, ctx.stoneLevel) || 1.5;
    for (const t of targets) setStatus(t, 'stunned', ctx.now + dur);
  },

  freeze(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? effect.freezeDuration ?? 2, ctx.ability, ctx.stoneLevel);
    for (const t of targets) setStatus(t, 'frozen', ctx.now + dur);
  },

  silence(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? effect.silenceDuration ?? 2, ctx.ability, ctx.stoneLevel);
    for (const t of targets) setStatus(t, 'silenced', ctx.now + dur);
  },

  blind(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 1, ctx.ability, ctx.stoneLevel);
    for (const t of targets) setStatus(t, 'blinded', ctx.now + dur);
  },

  root(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 2, ctx.ability, ctx.stoneLevel);
    for (const t of targets) setStatus(t, 'rooted', ctx.now + dur);
  },

  shield(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 5, ctx.ability, ctx.stoneLevel) || 5;
    for (const t of targets) {
      let amount;
      if (effect.amountPctMaxMP) {
        amount = Math.round((effectiveStat(t, 'mp', ctx.now) || t.maxMp) * scalar(effect.amountPctMaxMP, ctx.ability, ctx.stoneLevel) / 100);
      } else if (effect.amountPctMax) {
        amount = Math.round(t.maxHp * scalar(effect.amountPctMax, ctx.ability, ctx.stoneLevel) / 100);
      } else {
        amount = scalar(effect.amount ?? 0, ctx.ability, ctx.stoneLevel);
      }
      t.shields ??= [];
      t.shields.push({ amount, expires: ctx.now + dur });
    }
  },

  cleanse(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const count = scalar(effect.count ?? 99, ctx.ability, ctx.stoneLevel);
    for (const t of targets) {
      t.dots = [];
      t.statuses = { ...(t.statuses ?? {}) };
      for (const k of ['stunned','frozen','silenced','blinded','rooted','slowed']) delete t.statuses[k];
      // also drop debuff-like negative buffs (amountPct < 0)
      let removed = 0;
      t.buffs = t.buffs.filter(b => {
        if (removed >= count) return true;
        if (b.amountPct < 0 || b.tag === 'slow') { removed++; return false; }
        return true;
      });
    }
  },

  dispel(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const count = Math.max(1, Math.round(scalar(effect.count ?? 1, ctx.ability, ctx.stoneLevel)));
    for (const t of targets) {
      let removed = 0;
      t.buffs = t.buffs.filter(b => {
        if (removed >= count) return true;
        if ((b.amountPct ?? 0) > 0) { removed++; return false; }
        return true;
      });
    }
  },

  untargetable(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 2, ctx.ability, ctx.stoneLevel);
    for (const t of targets) setStatus(t, 'untargetable', ctx.now + dur);
  },

  immunity(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 2, ctx.ability, ctx.stoneLevel);
    const tag = effect.tag ?? 'all';
    for (const t of targets) setStatus(t, `immune_${tag}`, ctx.now + dur);
  },

  chain(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    if (!targets.length) return;
    const power = scalar(effect.powerScalar ?? 1, ctx.ability, ctx.stoneLevel);
    const hops = Math.max(1, Math.round(scalar(effect.hops ?? effect.extraTargets ?? 1, ctx.ability, ctx.stoneLevel)));
    const decayPct = scalar(effect.perHopDecayPct ?? effect.decayPct ?? 10, ctx.ability, ctx.stoneLevel) / 100;
    const stat = effect.stat ?? 'matk';
    const atk = effectiveStat(ctx.caster, stat, ctx.now);
    const defStat = stat === 'matk' ? 'mdef' : 'pdef';
    const pool = targetable(ctx.enemies, ctx.now);
    let curPower = power;
    let hit = 0;
    const hitSet = new Set();
    let cur = targets[0];
    while (cur && hit < hops + 1) {
      hitSet.add(cur);
      const def = effectiveStat(cur, defStat, ctx.now);
      applyDamage(cur, F.damage(curPower, atk, def, ctx.floor), ctx);
      hit++;
      curPower *= (1 - decayPct);
      cur = pool.find(e => !hitSet.has(e) && !e.dead);
    }
  },

  chainHeal(effect, ctx) {
    const start = resolveTargets(effect.targets, ctx);
    if (!start.length) return;
    const pct = scalar(effect.amountPctMax, ctx.ability, ctx.stoneLevel) / 100;
    const hops = Math.max(1, Math.round(scalar(effect.hops ?? 3, ctx.ability, ctx.stoneLevel)));
    const decay = scalar(effect.decayPct ?? 50, ctx.ability, ctx.stoneLevel) / 100;
    const pool = alive(ctx.allies);
    const hit = new Set();
    let curPct = pct;
    let cur = start[0];
    let count = 0;
    while (cur && count < hops) {
      hit.add(cur);
      applyHeal(cur, Math.round(cur.maxHp * curPct), ctx);
      curPct *= decay;
      cur = pool.filter(a => !hit.has(a)).reduce((acc, b) => !acc || (b.hp / b.maxHp) < (acc.hp / acc.maxHp) ? b : acc, null);
      count++;
    }
  },

  mark(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel);
    const tag = effect.tag ?? 'marked';
    for (const t of targets) {
      t.marks ??= [];
      t.marks.push({ tag, expires: ctx.now + dur });
    }
  },

  executeIfBelow(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const threshold = scalar(effect.thresholdPct, ctx.ability, ctx.stoneLevel) / 100;
    for (const t of targets) {
      if (t.hp / t.maxHp <= threshold) applyDamage(t, t.hp, ctx);
    }
  },

  pull(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    for (const t of targets) t.row = 'front';
  },

  reflect(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const pct = scalar(effect.amountPct, ctx.ability, ctx.stoneLevel);
    const dur = scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel);
    for (const t of targets) t.buffs.push({ stat: `reflect_${effect.school ?? 'all'}`, amountPct: pct, expires: ctx.now + dur });
  },

  // Cast-scoped trigger: fires only if a damage effect in the same ability
  // killed something this cast. Lets Soul Cleave heal on kill, Shadow Step
  // proc when the cast itself secures a kill, etc. Passive onKill (Harvest,
  // etc.) is registered separately in applyPassiveBuffs.
  onKill(effect, ctx) {
    if (!(ctx.killsThisCast > 0)) return;
    const action = effect.action;
    if (action === 'healPctMax') {
      const pct = scalar(effect.amountPct, ctx.ability, ctx.stoneLevel) / 100;
      const before = ctx.caster.hp;
      ctx.caster.hp = Math.min(ctx.caster.maxHp, ctx.caster.hp + Math.round(ctx.caster.maxHp * pct));
      if (ctx.caster.hp - before > 0) ctx.fx?.push({ type: 'heal', target: ctx.caster, amount: ctx.caster.hp - before, t: ctx.now });
    } else if (action === 'buffSelf' || action === 'stackBuff') {
      const amountPct = scalar(effect.amountPct ?? 0, ctx.ability, ctx.stoneLevel);
      const dur = scalar(effect.duration ?? 2, ctx.ability, ctx.stoneLevel) || 2;
      ctx.caster.buffs.push({ stat: effect.stat, amountPct, expires: ctx.now + dur, tag: 'kill_proc' });
    } else if (action === 'leaveCorpse') {
      // corpse system not implemented yet — no-op
    }
  },

  // No-op when invoked at cast time; the work happens in applyPassiveBuffs
  // (registers the trigger) and applyDamage (fires it).
  onHitTrigger() {},
  // No-op at cast time; turned into a dynamic spec at battle start.
  scaledBuff() {},
  conditionalBuff() {}
};

// ============================================================================
// Status / pruning helpers (called from engine)
// ============================================================================

export function pruneExpired(unit, now) {
  unit.buffs = unit.buffs.filter(b => b.expires > now);
  unit.regen = unit.regen.filter(r => r.expires > now);
  if (unit.tauntedBy && unit.tauntedBy.expires <= now) unit.tauntedBy = null;
  if (unit.dots) unit.dots = unit.dots.filter(d => d.expires > now);
  if (unit.shields) unit.shields = unit.shields.filter(s => s.expires > now && s.amount > 0);
  if (unit.marks) unit.marks = unit.marks.filter(m => m.expires > now);
  if (unit.statuses) {
    for (const k of Object.keys(unit.statuses)) {
      if ((unit.statuses[k] ?? 0) <= now) delete unit.statuses[k];
    }
  }
}

export function hasStatus(unit, name, now) { return (unit.statuses?.[name] ?? 0) > now; }
export function isIncapacitated(unit, now) { return hasStatus(unit, 'stunned', now) || hasStatus(unit, 'frozen', now); }
export function isSilenced(unit, now) { return hasStatus(unit, 'silenced', now); }

export function tickDots(unit, battle) {
  if (!unit.dots || !unit.dots.length) return;
  for (const d of unit.dots) {
    if (battle.now - d.lastTick >= 1.0 && d.expires > battle.now) {
      const dmg = Math.max(1, Math.round(unit.maxHp * d.dpsPct));
      const before = unit.hp;
      unit.hp = Math.max(0, unit.hp - dmg);
      if (unit.hp - before < 0) battle.fx?.push({ type: 'dmg', target: unit, amount: before - unit.hp, t: battle.now });
      if (unit.hp <= 0) {
        unit.dead = true;
        battle.fx?.push({ type: 'death', target: unit, t: battle.now });
        battle.onKill?.(d.source ?? unit, unit);
      }
      d.lastTick = battle.now;
    }
  }
}

export function applyPassiveBuffs(caster, allParty) {
  const slot = caster.abilities?.passive;
  if (!slot || !slot.ability) return;
  for (const effect of slot.ability.effects) {
    if (effect.type === 'buff') {
      const isPersistent = effect.duration === 'permanent' || effect.whileAlive;
      if (!isPersistent) continue;
      const amountPct = F.scaleParam(slot.ability.scaling, effect.amountPct ?? effect.amount ?? 0, slot.stoneLevel);
      const targets = effect.targets === 'party' ? allParty : [caster];
      for (const t of targets) {
        t.buffs.push({ stat: effect.stat, amountPct, expires: Infinity, source: 'passive', whileAlive: !!effect.whileAlive, sourceUnit: caster });
      }
    } else if (effect.type === 'onHitTrigger') {
      caster.onHitTakenHandlers.push((evt) => runActionOnTarget(effect, slot, caster, evt.ctx));
    } else if (effect.type === 'onKill') {
      caster.onKillHandlers.push((evt) => runActionOnTarget(effect, slot, caster, evt.ctx));
    } else if (effect.type === 'onDodge') {
      caster.onDodgeHandlers.push((evt) => runActionOnTarget(effect, slot, caster, evt.ctx));
    } else if (effect.type === 'scaledBuff') {
      const perUnit = F.scaleParam(slot.ability.scaling, effect.amountPct ?? effect.amount ?? 0, slot.stoneLevel);
      caster.dynamicBuffSpecs.push({ stat: effect.stat, perUnit, scaledBy: effect.scaledBy });
    } else if (effect.type === 'conditionalBuff') {
      // We treat this as a dynamic spec that applies fully when the condition is met.
      const amountPct = F.scaleParam(slot.ability.scaling, effect.amountPct ?? effect.amount ?? 0, slot.stoneLevel);
      caster.dynamicBuffSpecs.push({
        stat: effect.stat, perUnit: amountPct, scaledBy: '__conditional__',
        condition: effect.when
      });
    }
  }
}

// Action runner for passive triggers — interprets effect.action ("healPctMax",
// "buffSelf", "stackBuff") and applies to the appropriate target.
function runActionOnTarget(effect, slot, self, ctx) {
  if (!ctx) return;
  const ability = slot.ability;
  const stoneLevel = slot.stoneLevel;
  const action = effect.action;
  if (action === 'healPctMax') {
    const pct = F.scaleParam(ability.scaling, effect.amountPct, stoneLevel) / 100;
    const amt = Math.round(self.maxHp * pct);
    const before = self.hp;
    self.hp = Math.min(self.maxHp, self.hp + amt);
    if (self.hp - before > 0) ctx.fx?.push({ type: 'heal', target: self, amount: self.hp - before, t: ctx.now });
  } else if (action === 'buffSelf' || action === 'stackBuff') {
    const amountPct = F.scaleParam(ability.scaling, effect.amountPct ?? effect.perHit ?? 0, stoneLevel);
    const dur = F.scaleParam(ability.scaling, effect.duration ?? 2, stoneLevel) || 2;
    self.buffs.push({ stat: effect.stat, amountPct, expires: ctx.now + dur, tag: 'passive_proc' });
  } else if (action === 'reflectDamagePct') {
    // not yet wired into damage calc; emit a small fx for now
    ctx.fx?.push({ type: 'absorb', target: self, amount: 0, t: ctx.now });
  } else if (action === 'manaRegenPct') {
    const pct = F.scaleParam(ability.scaling, effect.amountPct, stoneLevel) / 100;
    self.mp = Math.min(self.maxMp, self.mp + Math.round(self.maxMp * pct));
  }
}

// Per-tick recomputation of dynamic-buff specs (Berserker's Unbridled Fury,
// Sentinel's Mana Armor, Knight's Last Stand, etc.). Removes old dynamic
// buffs and re-adds with the freshly computed amount.
export function recomputeDynamicBuffs(unit) {
  if (!unit.dynamicBuffSpecs || !unit.dynamicBuffSpecs.length) return;
  unit.buffs = unit.buffs.filter(b => !b.dynamic);
  for (const spec of unit.dynamicBuffSpecs) {
    const factor = scaledFactor(spec, unit);
    if (factor === 0) continue;
    const amountPct = spec.perUnit * factor;
    if (amountPct === 0) continue;
    unit.buffs.push({ stat: spec.stat, amountPct, expires: Infinity, dynamic: true, source: 'passive' });
  }
}

function scaledFactor(spec, unit) {
  switch (spec.scaledBy) {
    case 'hpMissingPct':       return (1 - unit.hp / unit.maxHp) * 100;
    case 'hpMissingPct/10':    return (1 - unit.hp / unit.maxHp) * 10;
    case 'mpCurrentPct':       return unit.maxMp ? (unit.mp / unit.maxMp) * 100 : 0;
    case 'mpMissingPct':       return unit.maxMp ? (1 - unit.mp / unit.maxMp) * 100 : 0;
    case '__conditional__':    return evaluateCondition(spec.condition, unit) ? 1 : 0;
    default:                   return 0;
  }
}

function evaluateCondition(when, unit) {
  if (!when || typeof when !== 'string') return false;
  // Tiny condition language: "hpPct<=30", "hpPct>=80", "hpPct<thresholdPct"
  const m = when.match(/^(hpPct|mpPct)\s*(<=|>=|<|>)\s*(\d+)/);
  if (!m) return false;
  const [, lhs, op, rhsStr] = m;
  const rhs = Number(rhsStr);
  const v = lhs === 'hpPct' ? (unit.hp / unit.maxHp) * 100 : (unit.maxMp ? (unit.mp / unit.maxMp) * 100 : 0);
  if (op === '<=') return v <= rhs;
  if (op === '>=') return v >= rhs;
  if (op === '<')  return v <  rhs;
  if (op === '>')  return v >  rhs;
  return false;
}
