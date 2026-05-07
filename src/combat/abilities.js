import * as F from './formulas.js';
import { buildSummon } from './engine.js';

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

export function getHandler(type) { return HANDLERS[type] ?? null; }

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

function hasKeystone(unit, flag) {
  return unit?.keystones?.has?.(flag) ?? false;
}

function rollDodge(target, now) {
  let chance = sumBuffPct(target, 'dodgePct', now);
  // Parry-from-stat (Bushido / Parry Stance): adds chance scaling with caster stat.
  if (target.parryChanceFromStat) {
    chance += effectiveStat(target, target.parryChanceFromStat.stat, now) * target.parryChanceFromStat.factor;
  }
  // Auto-dodge charges (Smoke Step): always succeed and consume a charge.
  if (target._autoDodgeCharges > 0) {
    target._autoDodgeCharges--;
    return true;
  }
  if (chance <= 0) return false;
  return Math.random() * 100 < chance;
}

function rollCritMultiplier(caster, now, extraChance = 0, extraDmg = 0) {
  // Resolute Technique: hits cannot crit. (The +25% damage is applied separately
  // in the damage handler so the trade-off is visible.)
  if (hasKeystone(caster, 'resolute_technique')) return 1;
  // Point Blank: first attack of the fight always crits.
  if (hasKeystone(caster, 'point_blank') && (caster.castedThisFight ?? 0) === 0) {
    const bonus = sumBuffPct(caster, 'critDamagePct', now) + extraDmg;
    return 1.5 + bonus / 100;
  }
  const chance = sumBuffPct(caster, 'critChancePct', now) + extraChance;
  if (chance <= 0) return 1;
  if (Math.random() * 100 >= chance) return 1;
  const bonus = sumBuffPct(caster, 'critDamagePct', now) + extraDmg;
  return 1.5 + bonus / 100;
}

// One-shot self-buff-next-hit consumed by the next damage cast. Returns
// merged crit-chance / crit-damage / damage-multiplier additions and removes
// them from the queue.
function consumeNextHitDamageMods(caster) {
  const out = { critChance: 0, critDamage: 0, damageMultiplier: 1 };
  if (!caster?.nextHitMods?.length) return out;
  const remaining = [];
  for (const m of caster.nextHitMods) {
    if (m.kind === 'damage') {
      if (m.stat === 'critChancePct')   out.critChance += m.amountPct;
      else if (m.stat === 'critDamagePct') out.critDamage += m.amountPct;
      else if (m.stat === 'damageMultiplier') out.damageMultiplier *= (m.amountPct ?? 1);
      // consumed
    } else {
      remaining.push(m);
    }
  }
  caster.nextHitMods = remaining;
  return out;
}

function consumeNextHitHealMod(caster, dmg, ctx) {
  if (!caster?.nextHitMods?.length) return;
  const remaining = [];
  for (const m of caster.nextHitMods) {
    if (m.kind === 'healFromDamage') {
      const amt = Math.round(dmg * (m.amountPct ?? 0) / 100);
      applyHeal(caster, amt, ctx);
      // consumed
    } else {
      remaining.push(m);
    }
  }
  caster.nextHitMods = remaining;
}

function hasAnyCurse(unit, now) {
  if (!unit?.buffs) return false;
  return unit.buffs.some(b => b.expires > now && (b.amountPct ?? 0) < 0);
}

function tryDeathSave(target, ctx) {
  // Find an ally with a deathSave handler still available.
  const allies = (ctx.battle.playerUnits ?? []).filter(u => !u.dead && u !== target);
  for (const a of allies) {
    if (!a._deathSaveSpec || a._deathSaveCooldownUntil > ctx.now) continue;
    const cost = Math.round(a.maxHp * a._deathSaveSpec.transferPct / 100);
    if (a.hp <= cost) continue;
    a.hp = Math.max(1, a.hp - cost);
    target.hp = cost; // recipient gets the transferred HP
    target.dead = false;
    a._deathSaveCooldownUntil = ctx.now + a._deathSaveSpec.cooldown;
    ctx.fx?.push({ type: 'heal', target, amount: cost, t: ctx.now });
    ctx.battle.log?.push({ type: 'heal', text: `${a.displayName} sacrificed to save ${target.displayName}.`, t: ctx.now });
    return true;
  }
  return false;
}

function evaluateConditionAgainst(when, caster, target) {
  if (!when || typeof when !== 'string') return false;
  const m = when.match(/^(targetHpPct|targetMpPct|hpPct|mpPct|enemyCount|secondsSinceLastAttack|targetHp)\s*(<=|>=|<|>)\s*([a-zA-Z0-9_]+)/);
  if (!m) return false;
  const [, lhsKey, op, rhsRaw] = m;
  const rhs = isNaN(Number(rhsRaw)) ? Number(rhsRaw) || 30 : Number(rhsRaw);
  let lhs = 0;
  switch (lhsKey) {
    case 'hpPct':       lhs = (caster.hp / caster.maxHp) * 100; break;
    case 'mpPct':       lhs = caster.maxMp ? (caster.mp / caster.maxMp) * 100 : 0; break;
    case 'targetHpPct': lhs = target ? (target.hp / target.maxHp) * 100 : 100; break;
    case 'targetMpPct': lhs = target?.maxMp ? (target.mp / target.maxMp) * 100 : 0; break;
    default: return false;
  }
  if (op === '<=') return lhs <= rhs;
  if (op === '>=') return lhs >= rhs;
  if (op === '<')  return lhs <  rhs;
  if (op === '>')  return lhs >  rhs;
  return false;
}

// ============================================================================
// Damage application — checks shields, damageTakenPct, status (frozen takes more)
// ============================================================================

function applyDamage(target, raw, ctx) {
  if (target.dead) return;
  // Living Wall keystone: redirect to a player who has it and is below 30% HP.
  // Damage taken by the wall is also halved.
  if (target.side === 'player' && ctx.battle) {
    const wall = (ctx.battle.playerUnits ?? []).find(u =>
      u !== target && !u.dead && hasKeystone(u, 'living_wall') && u.hp / u.maxHp <= 0.30
    );
    if (wall) {
      const reduced = Math.max(1, Math.round(raw * 0.5));
      target = wall;
      raw = reduced;
    }
  }
  // Reflect: physical / magical / all reflectors push damage back at attacker.
  // Buff stat is reflect_<school>; we apply when appropriate.
  if (ctx.caster && !ctx.caster.dead && ctx.caster !== target) {
    const reflectAll = sumBuffPct(target, 'reflect_all', ctx.now);
    const reflectPhys = sumBuffPct(target, 'reflect_physical', ctx.now);
    const reflectMag = sumBuffPct(target, 'reflect_magical', ctx.now);
    const refTotal = reflectAll + reflectPhys + reflectMag;
    if (refTotal > 0 && raw > 0 && !ctx._isReflected) {
      const back = Math.max(1, Math.round(raw * refTotal / 100));
      ctx._isReflected = true;
      // recurse once with caster <-> target swapped
      applyDamage(ctx.caster, back, { ...ctx, caster: target, _isReflected: true });
    }
  }
  let amount = raw;

  // damage taken modifier (e.g. Shield Wall reduces; Frozen amplifies via tag)
  amount *= buffMultiplier(target, 'damageTakenPct', ctx.now);
  if ((target.statuses?.frozen ?? 0) > ctx.now) amount *= 1.30;
  // Sentinel's Mana Armor: DR scales with current MP%.
  if (target.drFromStat) {
    let scale = 0;
    if (target.drFromStat.stat === 'mpCurrentPct') scale = target.maxMp ? (target.mp / target.maxMp) * 100 : 0;
    else if (target.drFromStat.stat === 'hpCurrentPct') scale = (target.hp / target.maxHp) * 100;
    const dr = scale * target.drFromStat.factor / 100;
    amount *= Math.max(0.1, 1 - dr);
  }
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
    // Mind Over Matter: 30% of damage that gets past shields hits MP first.
    if (hasKeystone(target, 'mind_over_matter') && target.maxMp > 0 && target.mp > 0) {
      const toMp = Math.min(target.mp, Math.round(remaining * 0.30));
      if (toMp > 0) {
        target.mp -= toMp;
        remaining -= toMp;
      }
    }
    target.hp = Math.max(0, target.hp - remaining);
    ctx.fx?.push({ type: 'dmg', target, amount: remaining, t: ctx.now });
    ctx.fx?.push({ type: 'impact', target, t: ctx.now });

    // fire on-hit-taken passives
    if (target.onHitTakenHandlers?.length) {
      const evt = { target, attacker: ctx.caster, amount: remaining, ctx };
      for (const h of target.onHitTakenHandlers) h(evt);
    }
    // fire on-party-hit-cursed (when caster is player and target carries any debuff)
    if (ctx.caster && !ctx.caster.isEnemy && hasAnyCurse(target, ctx.now)) {
      const allies = ctx.allies ?? (ctx.battle?.playerUnits ?? []);
      for (const ally of allies) {
        if (!ally.onPartyHitHandlers?.length) continue;
        for (const h of ally.onPartyHitHandlers) h({ target, attacker: ctx.caster, ctx });
      }
    }
    // markNextStrikeHealsTarget: caster's next strike (this one) heals caster.
    if (ctx.caster?.nextHitMods?.length) {
      consumeNextHitHealMod(ctx.caster, remaining, ctx);
    }

    if (target.hp <= 0) {
      // Tethered Souls / deathSave: an ally with a charge sacrifices % HP to save.
      if (ctx.battle && tryDeathSave(target, ctx)) {
        // saved — exit without death.
      } else {
        target.dead = true;
        ctx.fx?.push({ type: 'death', target, t: ctx.now });
        ctx.onKill?.(ctx.caster, target);
        ctx.killsThisCast = (ctx.killsThisCast ?? 0) + 1;
        // fire on-kill passives on the killer
        if (ctx.caster?.onKillHandlers?.length) {
          const evt = { caster: ctx.caster, target, ctx };
          for (const h of ctx.caster.onKillHandlers) h(evt);
        }
        // fire on-minion-death passives on the minion's owner (if any)
        if (target.minionOwner && target.minionOwner.onMinionDeathHandlers?.length) {
          for (const h of target.minionOwner.onMinionDeathHandlers) h({ minion: target, ctx });
        }
        // fire boss death special (e.g. summon_on_death) — engine attaches a hook
        if (target.onDeathHandler) target.onDeathHandler(ctx);
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
  const healed = target.hp - before;
  if (healed > 0) ctx.fx?.push({ type: 'heal', target, amount: healed, t: ctx.now });
  const overheal = amount - healed;
  // Vital Spring keystone: overheal converts 1:1 to MP.
  if (hasKeystone(target, 'vital_spring') && target.maxMp > 0 && overheal > 0) {
    target.mp = Math.min(target.maxMp, target.mp + overheal);
  }
  // Devout / Spell Eater passive: target convertOverhealPct.
  if (target.overhealConvertPct > 0 && target.maxMp > 0 && overheal > 0) {
    target.mp = Math.min(target.maxMp, target.mp + Math.round(overheal * target.overhealConvertPct / 100));
  }
  // Fire on-heal handlers on the caster (so Cleric / Templar passives work).
  if (ctx.caster?.onHealHandlers?.length) {
    for (const h of ctx.caster.onHealHandlers) h({ target, healed, ctx });
  }
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
    // Shadow Strike: first attack of the fight ignores all defense.
    const firstHitOfFight = (ctx.caster?.castedThisFight ?? 0) === 0;
    const shadowStrikeBypass = firstHitOfFight && hasKeystone(ctx.caster, 'shadow_strike');
    const effectiveIgnorePct = shadowStrikeBypass ? 100 : ignorePct;
    // Resolute Technique: +25% damage trade-off (the can't-crit half is in rollCritMultiplier).
    const resoluteMul = hasKeystone(ctx.caster, 'resolute_technique') ? 1.25 : 1;
    // Sibling conditionalBonus / one-shot nextHitMods (selfBuffNextHit) consumed once for this cast.
    const selfBuffNextHit = consumeNextHitDamageMods(ctx.caster);
    const critChanceFromBuff = selfBuffNextHit.critChance;
    const critDmgFromBuff = selfBuffNextHit.critDamage;
    const dmgMulFromBuff = selfBuffNextHit.damageMultiplier;

    for (const t of targets) {
      // dodge gates the entire hit (single roll covers all sub-hits for clarity)
      if (rollDodge(t, ctx.now)) {
        ctx.fx?.push({ type: 'dodge', target: t, t: ctx.now });
        if (t.onDodgeHandlers?.length) {
          const evt = { target: t, attacker: ctx.caster, ctx };
          for (const h of t.onDodgeHandlers) h(evt);
        }
        // Bushido-style parry: reflect a fraction of the would-be damage back.
        if (t.parryChanceFromStat && ctx.caster && !ctx.caster.dead) {
          const reflectAmount = Math.max(1, Math.round(power * effectiveStat(ctx.caster, stat, ctx.now) * 0.4));
          applyDamage(ctx.caster, reflectAmount, { ...ctx, caster: t, _isReflected: true });
          if (t.onParryHandlers?.length) for (const h of t.onParryHandlers) h({ ctx });
        }
        continue;
      }
      const def = effectiveStat(t, defStat, ctx.now) * (1 - effectiveIgnorePct / 100);
      let total = 0;
      let crit = false;
      for (let i = 0; i < hits; i++) {
        let dmg = F.damage(power, atk, def, ctx.floor);
        const critMul = rollCritMultiplier(ctx.caster, ctx.now, critChanceFromBuff, critDmgFromBuff);
        if (critMul > 1) { dmg = Math.round(dmg * critMul); crit = true; }
        total += dmg;
      }
      total = Math.round(total * resoluteMul * dmgMulFromBuff);
      // sibling conditionalBonus effects in the same ability
      for (const sib of ctx.ability.effects ?? []) {
        if (sib.type !== 'conditionalBonus') continue;
        if (evaluateConditionAgainst(sib.when, ctx.caster, t)) {
          const bonus = scalar(sib.amountPct ?? 0, ctx.ability, ctx.stoneLevel);
          total = Math.round(total * (1 + bonus / 100));
        }
      }
      if (crit) ctx.fx?.push({ type: 'crit', target: t, t: ctx.now });
      applyDamage(t, total, ctx);
    }
    if (ctx.caster) ctx.caster.castedThisFight = (ctx.caster.castedThisFight ?? 0) + 1;
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

  // ----- v0.23 expansion: more effect types -----

  bleed(effect, ctx) {
    // Alias of dot with a 'bleed' tag — keeps abilities.json clean.
    HANDLERS.dot({ ...effect, tag: 'bleed' }, ctx);
  },

  debuff(effect, ctx) {
    // Negative buff. Same shape as buff but the amountPct is negated when positive.
    const targets = resolveTargets(effect.targets, ctx);
    const amountPct = -Math.abs(scalar(effect.amountPct ?? effect.amount ?? 0, ctx.ability, ctx.stoneLevel));
    const dur = scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel);
    for (const t of targets) {
      t.buffs.push({
        stat: effect.stat,
        amountPct,
        expires: dur > 0 ? ctx.now + dur : Infinity,
        tag: effect.tag ?? 'debuff'
      });
    }
  },

  selfDebuff(effect, ctx) {
    HANDLERS.debuff({ ...effect, targets: 'self' }, ctx);
  },

  threatMod() { /* threat is implicit via tauntedBy; no-op ok for v0.23 */ },

  aura(effect, ctx) {
    // Periodic effect around the caster (e.g. Consecrated Ground heal pulse).
    const duration = scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel);
    const tickInt = scalar(effect.tick ?? 1, ctx.ability, ctx.stoneLevel) || 1;
    ctx.caster.auras = ctx.caster.auras ?? [];
    ctx.caster.auras.push({
      until: ctx.now + duration,
      tickInterval: tickInt,
      nextTick: ctx.now + tickInt,
      healPctMax: scalar(effect.healPctMax ?? 0, ctx.ability, ctx.stoneLevel)
    });
  },

  burst(effect, ctx) {
    // Used by Repeater Burst — multiple shots with a short gap. Implement as
    // a single multi-hit damage (close enough for v0.23 semantics).
    const inner = { ...effect, type: 'damage', hits: effect.shots ?? 5, targets: effect.targets ?? 'single_enemy' };
    HANDLERS.damage(inner, ctx);
  },

  ricochet(effect, ctx) {
    // After a primary hit, hit one extra random enemy at the same power.
    const enemies = targetable(ctx.enemies, ctx.now);
    if (enemies.length < 2) return;
    const extra = enemies[Math.floor(Math.random() * enemies.length)];
    const power = scalar(effect.powerScalar ?? 0.5, ctx.ability, ctx.stoneLevel);
    const stat = effect.stat ?? 'patk';
    const atk = effectiveStat(ctx.caster, stat, ctx.now);
    const def = effectiveStat(extra, stat === 'matk' ? 'mdef' : 'pdef', ctx.now);
    applyDamage(extra, F.damage(power, atk, def, ctx.floor), ctx);
  },

  random(effect, ctx) {
    // Volatile Mixture: pick one outcome at random.
    const outcomes = effect.outcomes ?? [];
    if (!outcomes.length) return;
    const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
    const handler = HANDLERS[pick.type];
    if (handler) handler(pick, ctx);
  },

  randomCurse(effect, ctx) {
    // Witch's Hex Bolt — apply a single random debuff (slow / weaken / etc.).
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel);
    const stats = ['pdef', 'mdef', 'patk', 'matk', 'attackSpeedPct'];
    const stat = stats[Math.floor(Math.random() * stats.length)];
    for (const t of targets) {
      t.buffs.push({ stat, amountPct: -20, expires: ctx.now + dur, tag: 'curse' });
    }
  },

  randomDebuff(effect, ctx) {
    HANDLERS.randomCurse(effect, ctx);
  },

  gapClose(effect, ctx) {
    // Visual lunge only — formation stays. Bumping lungeT does the animation.
    if (ctx.caster) ctx.caster.lungeT = ctx.now;
  },

  teleportBehind(effect, ctx) {
    // No real positioning yet — visual lunge.
    if (ctx.caster) ctx.caster.lungeT = ctx.now;
  },

  polymorph(effect, ctx) {
    // Hex Toad — silenced + can't act, modeled via stunned status (engine
    // already blocks ability ticks while stunned).
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 3, ctx.ability, ctx.stoneLevel);
    for (const t of targets) {
      setStatus(t, 'stunned',  ctx.now + dur);
      setStatus(t, 'silenced', ctx.now + dur);
    }
  },

  dodgeNext(effect, ctx) {
    // Foresight / Smoke Step — give X dodge charges over a window.
    const targets = resolveTargets(effect.targets, ctx);
    const charges = Math.max(1, Math.round(scalar(effect.window ?? 1, ctx.ability, ctx.stoneLevel)));
    for (const t of targets) {
      t._autoDodgeCharges = (t._autoDodgeCharges ?? 0) + charges;
    }
  },

  autoDodgeCharges(effect, ctx) {
    HANDLERS.dodgeNext({ ...effect, window: effect.count ?? 1 }, ctx);
  },

  resourceGain(effect, ctx) {
    // Reaving Strike (rage), Flurry (combo). Track on caster.resources.
    const r = ctx.caster.resources ??= { rage: 0, combo: 0, charges: 0 };
    const key = effect.resource ?? 'rage';
    const amt = scalar(effect.amount ?? 1, ctx.ability, ctx.stoneLevel);
    r[key] = (r[key] ?? 0) + amt;
  },

  selfDamagePctMax(effect, ctx) {
    // Voidcaller: self-cost on cast.
    const pct = scalar(effect.amountPct ?? 1, ctx.ability, ctx.stoneLevel) / 100;
    const dmg = Math.max(1, Math.round(ctx.caster.maxHp * pct));
    ctx.caster.hp = Math.max(1, ctx.caster.hp - dmg);
    ctx.fx?.push({ type: 'dmg', target: ctx.caster, amount: dmg, t: ctx.now });
  },

  selfDamagePctMaxPerTick() { /* tracked by channel state, applied in tickChannel */ },

  chargeOnCast(effect, ctx) {
    // Stormcaller's Static Field: stack a charge; threshold = next cast free.
    const r = ctx.caster.resources ??= { rage: 0, combo: 0, charges: 0 };
    r.charges = (r.charges ?? 0) + 1;
    const threshold = scalar(effect.threshold ?? 3, ctx.ability, ctx.stoneLevel);
    if (r.charges >= threshold) {
      r.charges = 0;
      ctx.caster._nextCastFree = true;
    }
  },

  link(effect, ctx) {
    // Communion / Sanguine Bond / Honor Duel. v0.23 implementation: tag both
    // units with a "linked" flag for the duration; applyDamage can reference.
    // For now, light implementation: apply a small mutual buff.
    const targets = resolveTargets(effect.targets, ctx);
    const dur = scalar(effect.duration ?? 6, ctx.ability, ctx.stoneLevel);
    for (const t of targets) {
      t.buffs.push({ stat: 'mdef', amountPct: 10, expires: ctx.now + dur, tag: 'linked' });
      ctx.caster.buffs.push({ stat: 'mdef', amountPct: 10, expires: ctx.now + dur, tag: 'linked' });
    }
  },

  markNextStrikeHealsTarget(effect, ctx) {
    // Hemorrhage — caster's next strike heals caster.
    const pct = scalar(effect.amountPct ?? 50, ctx.ability, ctx.stoneLevel);
    ctx.caster.nextHitMods = ctx.caster.nextHitMods ?? [];
    ctx.caster.nextHitMods.push({ kind: 'healFromDamage', amountPct: pct });
  },

  selfBuffNextHit(effect, ctx) {
    // Backstab / Iaijutsu / Vanish: damage-only one-shot stat injection on
    // the next damage cast.
    const amountPct = scalar(effect.amountPct ?? effect.amount ?? 0, ctx.ability, ctx.stoneLevel);
    ctx.caster.nextHitMods = ctx.caster.nextHitMods ?? [];
    ctx.caster.nextHitMods.push({ kind: 'damage', stat: effect.stat ?? 'critChancePct', amountPct });
  },

  conditionalBonus() { /* applied inline by the damage handler when present */ },

  resetCooldowns(effect, ctx) {
    // Chronomancer's Rewind: reset target ally's cooldowns.
    const targets = resolveTargets(effect.targets, ctx);
    for (const t of targets) {
      for (const k of Object.keys(t.abilities ?? {})) t.abilities[k].cooldown = 0;
    }
  },

  phaseAlternator(effect, ctx) {
    // Astromancer cosmic cycle. Light implementation: tag a marker so the
    // engine could react. v0.23 just registers the period; phase-specific
    // bonuses are not yet wired into damage formulas.
    ctx.caster._cosmicPeriod = scalar(effect.duration ?? 8, ctx.ability, ctx.stoneLevel);
  },

  consumeSong(effect, ctx) {
    // Crescendo — consumes the most recent active song buff. We don't track
    // songs as a separate list yet; clear party-targeted permanent-ish buffs
    // tagged 'song' from the caster.
    const allies = ctx.allies ?? [];
    for (const a of allies) {
      a.buffs = a.buffs.filter(b => b.tag !== 'song');
    }
  },

  cleanseStatus(effect, ctx) {
    HANDLERS.cleanse(effect, ctx);
  },

  channeled(effect, ctx) {
    // Set up a channel state on the caster. The engine tickChannel function
    // re-fires the inner damage / heal effect on a cadence.
    const dur = scalar(effect.duration ?? 3, ctx.ability, ctx.stoneLevel);
    const tickInt = scalar(effect.tick ?? 0.5, ctx.ability, ctx.stoneLevel) || 0.5;
    const innerEffect = {
      type: 'damage',
      targets: effect.targets ?? 'all_enemies',
      stat: effect.stat ?? 'matk',
      powerScalar: effect.powerScalar ?? 0.3,
      lifestealPct: effect.lifestealPct
    };
    ctx.caster.channelState = {
      ability: ctx.ability,
      stoneLevel: ctx.stoneLevel,
      until: ctx.now + dur,
      nextTick: ctx.now + tickInt,
      tickInterval: tickInt,
      innerEffect,
      selfHpCostPctPerTick: effect.selfHpCostPctPerTick
        ? scalar(effect.selfHpCostPctPerTick, ctx.ability, ctx.stoneLevel)
        : 0
    };
    // Apply a first hit immediately so the cast feels responsive.
    const handler = HANDLERS.damage;
    if (handler) handler(innerEffect, ctx);
  },

  // ----- summons -----
  summonPet(effect, ctx) {
    const dur = scalar(effect.duration ?? 8, ctx.ability, ctx.stoneLevel);
    const scale = scalar(effect.statScalePct ?? 50, ctx.ability, ctx.stoneLevel);
    const auto = effect.auto ?? 'attack';
    const tauntDur = scalar(effect.tauntDuration ?? 0, ctx.ability, ctx.stoneLevel);
    const minion = buildSummon(ctx.caster, ctx.battle, {
      name: effect.kind === 'bear' ? 'Bear' : (effect.kind ?? 'Pet'),
      kind: effect.kind ?? 'pet',
      duration: dur,
      statScalePct: scale,
      hpMul: 1.2,
      preferredRow: 'front'
    });
    ctx.battle.enemyUnits === undefined; // no-op guard
    if (ctx.caster.side === 'player') ctx.battle.playerUnits.push(minion);
    else ctx.battle.enemyUnits.push(minion);
    // Bear with taunt: apply a brief taunt aura on the bear vs front enemies.
    if (auto === 'taunt' && tauntDur > 0) {
      const enemies = ctx.caster.side === 'player' ? ctx.battle.enemyUnits : ctx.battle.playerUnits;
      for (const e of alive(enemies).filter(e => e.row === 'front')) {
        e.tauntedBy = { caster: minion, expires: ctx.now + tauntDur };
      }
    }
  },

  summonPersistent(effect, ctx) {
    // Hunter's Loyal Beast — a permanent companion in the fight. Same as a
    // long-duration pet.
    HANDLERS.summonPet({ ...effect, duration: 9999 }, ctx);
  },

  summonGroup(effect, ctx) {
    const count = Math.max(1, Math.round(scalar(effect.count ?? 3, ctx.ability, ctx.stoneLevel)));
    const dur = scalar(effect.duration ?? 6, ctx.ability, ctx.stoneLevel);
    const scale = scalar(effect.statScalePct ?? 30, ctx.ability, ctx.stoneLevel);
    for (let i = 0; i < count; i++) {
      const minion = buildSummon(ctx.caster, ctx.battle, {
        name: effect.kind === 'wolves' ? 'Wolf' : 'Companion',
        kind: 'pack',
        duration: dur,
        statScalePct: scale,
        preferredRow: 'front'
      });
      if (ctx.caster.side === 'player') ctx.battle.playerUnits.push(minion);
      else ctx.battle.enemyUnits.push(minion);
    }
  },

  summonAttack(effect, ctx) {
    // Hunter's Beast Strike — pet attacks for fixed damage immediately.
    const power = scalar(effect.powerScalar ?? 0.6, ctx.ability, ctx.stoneLevel);
    const stat = effect.stat ?? 'patk';
    const targets = resolveTargets(effect.targets ?? 'single_enemy', ctx);
    const atk = effectiveStat(ctx.caster, stat, ctx.now);
    for (const t of targets) {
      const def = effectiveStat(t, stat === 'matk' ? 'mdef' : 'pdef', ctx.now);
      applyDamage(t, F.damage(power, atk, def, ctx.floor), ctx);
    }
  },

  summonClone(effect, ctx) {
    // Shadowdancer's Shadow Clone — mirror caster's basic attack for X seconds.
    const dur = scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel);
    const scale = scalar(effect.damagePct ?? 60, ctx.ability, ctx.stoneLevel);
    const minion = buildSummon(ctx.caster, ctx.battle, {
      name: 'Shadow Clone',
      kind: 'clone',
      duration: dur,
      statScalePct: scale,
      preferredRow: ctx.caster.row
    });
    if (ctx.caster.side === 'player') ctx.battle.playerUnits.push(minion);
    else ctx.battle.enemyUnits.push(minion);
  },

  summonDeployable(effect, ctx) {
    // Engineer's Deploy Turret — immobile auto-attacker.
    const dur = scalar(effect.duration ?? 12, ctx.ability, ctx.stoneLevel);
    const power = scalar(effect.powerScalar ?? 0.4, ctx.ability, ctx.stoneLevel);
    const minion = buildSummon(ctx.caster, ctx.battle, {
      name: effect.kind === 'turret' ? 'Turret' : 'Deployable',
      kind: 'deployable',
      duration: dur,
      statScalePct: power * 100,
      preferredRow: 'back',
      immobile: true
    });
    if (ctx.caster.side === 'player') ctx.battle.playerUnits.push(minion);
    else ctx.battle.enemyUnits.push(minion);
  },

  summonIllusions(effect, ctx) {
    // Sandwalker's Mirage — illusory copies that absorb hits via auto-dodge charges
    // on the caster.
    const count = Math.max(1, Math.round(scalar(effect.count ?? 2, ctx.ability, ctx.stoneLevel)));
    const absorbPerCopy = Math.max(1, Math.round(scalar(effect.absorbHits ?? 1, ctx.ability, ctx.stoneLevel)));
    ctx.caster._autoDodgeCharges = (ctx.caster._autoDodgeCharges ?? 0) + count * absorbPerCopy;
  },

  consumeCorpse(effect, ctx) {
    // Necromancer's Raise Skeleton — there's no real corpse system yet;
    // approximate by always summoning a skeleton when cast (acts as a free
    // pet for the duration).
    const make = effect.makeMinion ?? {};
    const dur = scalar(make.duration ?? 10, ctx.ability, ctx.stoneLevel);
    const scale = scalar(make.statScalePct ?? 40, ctx.ability, ctx.stoneLevel);
    const minion = buildSummon(ctx.caster, ctx.battle, {
      name: 'Skeleton',
      kind: 'skeleton',
      duration: dur,
      statScalePct: scale,
      preferredRow: 'back'
    });
    if (ctx.caster.side === 'player') ctx.battle.playerUnits.push(minion);
    else ctx.battle.enemyUnits.push(minion);
  },

  placeTotem(effect, ctx) {
    // Shaman totem — immobile minion with a passive aura.
    const dur = scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel);
    const aura = effect.aura ?? null;
    const totem = buildSummon(ctx.caster, ctx.battle, {
      name: effect.kind === 'earth' ? 'Earth Totem'
          : effect.kind === 'healing' ? 'Healing Totem'
          : (effect.kind ?? 'Totem') + ' Totem',
      kind: 'totem',
      duration: dur,
      statScalePct: 30,
      preferredRow: 'back',
      immobile: true,
      auraSpec: aura
    });
    if (aura?.type === 'hot') {
      const tickInt = scalar(aura.tick ?? 1, ctx.ability, ctx.stoneLevel) || 1;
      totem.auras = [{
        until: ctx.now + dur,
        nextTick: ctx.now + tickInt,
        tickInterval: tickInt,
        healPctMax: scalar(aura.amountPctMaxPerTick ?? 1, ctx.ability, ctx.stoneLevel)
      }];
    }
    if (ctx.caster.side === 'player') ctx.battle.playerUnits.push(totem);
    else ctx.battle.enemyUnits.push(totem);
  },

  placeTrap(effect, ctx) {
    // Engineer's Spike Trap — immobile, arms after delay, fires once.
    const armSec = scalar(effect.armSeconds ?? 1, ctx.ability, ctx.stoneLevel);
    const dur = scalar(effect.duration ?? 8, ctx.ability, ctx.stoneLevel);
    const onTrigger = effect.onTrigger ?? {};
    const trap = buildSummon(ctx.caster, ctx.battle, {
      name: 'Spike Trap',
      kind: 'trap',
      duration: dur,
      statScalePct: 20,
      preferredRow: 'front',
      immobile: true,
      trapSpec: {
        armedAt: ctx.now + armSec,
        ability: ctx.ability,
        stoneLevel: ctx.stoneLevel,
        powerScalar: onTrigger.powerScalar ?? 0.5
      }
    });
    if (ctx.caster.side === 'player') ctx.battle.playerUnits.push(trap);
    else ctx.battle.enemyUnits.push(trap);
  },

  signalPets(effect, ctx) {
    // Beastmaster's Whip Crack signal — focus all pets on a single target.
    // Light implementation: tag the targeted enemy with 1 second of taunt by
    // each pet so they hit it next.
    const target = resolveTargets('single_enemy', ctx)[0];
    if (!target) return;
    const allies = ctx.caster.side === 'player' ? ctx.battle.playerUnits : ctx.battle.enemyUnits;
    for (const a of allies) {
      if (a.isMinion && a !== ctx.caster) target.tauntedBy = { caster: a, expires: ctx.now + 2 };
    }
  },

  leaveCorpse() { /* placeholder */ },

  onPartyHitCursed() { /* registered in applyPassiveBuffs */ },
  onMinionDeath() { /* registered in applyPassiveBuffs */ },
  onParry() { /* registered in applyPassiveBuffs */ },
  onHeal() { /* registered in applyPassiveBuffs */ },
  onHotComplete() { /* registered in applyPassiveBuffs */ },
  refundCdOnDodge() { /* registered in applyPassiveBuffs */ },
  scaledChance() { /* registered in applyPassiveBuffs */ },
  scaledDR() { /* registered in applyPassiveBuffs */ },
  convertOverheal() { /* registered in applyPassiveBuffs */ },
  conditionalScaledBuff() { /* registered as dynamic spec in applyPassiveBuffs */ },
  conditionalStack() { /* see stack — same machinery */ },
  stack(effect, ctx) {
    // Permanent stack on caster (Harvest, Hot Hand). On each hit /kill, increment
    // a stat buff. v0.23 sets a static buff equal to maxStack/2 as approximation.
    const max = scalar(effect.maxStack ?? effect.maxAtkSpdPct ?? 30, ctx.ability, ctx.stoneLevel);
    ctx.caster.buffs.push({
      stat: effect.stat ?? 'attackSpeedPct',
      amountPct: max / 2,
      expires: Infinity,
      tag: 'stack_approx'
    });
  },
  lootMod() { /* applied at loot-roll time; passive registration only */ },
  deathSave() { /* registered in applyPassiveBuffs */ },
  critHeal() { /* implemented via probabilistic crit on heal: TBD; non-blocking */ },

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
    } else if (effect.type === 'conditionalScaledBuff') {
      // Scales further when condition met (e.g. From Below: +M.ATK = (% HP missing)).
      const perUnit = F.scaleParam(slot.ability.scaling, effect.amountPct ?? 0, slot.stoneLevel);
      caster.dynamicBuffSpecs.push({
        stat: effect.stat, perUnit, scaledBy: 'hpMissingPct',
        condition: effect.when
      });
    } else if (effect.type === 'scaledChance') {
      // Parry Stance / Bushido: chance scales with caster's stat (e.g. PATK).
      caster.parryChanceFromStat = {
        tag: effect.tag ?? 'parry',
        stat: effect.scaledBy ?? 'patk',
        factor: F.scaleParam(slot.ability.scaling, effect.factor ?? 0, slot.stoneLevel)
      };
    } else if (effect.type === 'scaledDR') {
      caster.drFromStat = {
        stat: effect.scaledBy ?? 'mpCurrentPct',
        factor: F.scaleParam(slot.ability.scaling, effect.factor ?? 0, slot.stoneLevel)
      };
    } else if (effect.type === 'convertOverheal') {
      caster.overhealConvertPct = F.scaleParam(slot.ability.scaling, effect.convPct ?? 0, slot.stoneLevel);
    } else if (effect.type === 'refundCdOnDodge') {
      caster.refundCdOnDodgePct = F.scaleParam(slot.ability.scaling, effect.amountPct ?? 100, slot.stoneLevel);
      caster.onDodgeHandlers.push((evt) => {
        // Refund the most recent cooldown (highest remaining) by the configured pct.
        const ab = caster.abilities;
        let best = null;
        for (const k of ['attack','spell1','spell2']) {
          if (!ab[k]) continue;
          if (!best || ab[k].cooldown > best.cooldown) best = ab[k];
        }
        if (best && best.cooldown > 0) {
          best.cooldown = best.cooldown * (1 - caster.refundCdOnDodgePct / 100);
        }
      });
    } else if (effect.type === 'onPartyHitCursed') {
      caster.onPartyHitHandlers.push((evt) => {
        const action = effect.action;
        if (action === 'manaRegenPct') {
          const pct = F.scaleParam(slot.ability.scaling, effect.amountPct ?? 0, slot.stoneLevel) / 100;
          caster.mp = Math.min(caster.maxMp, caster.mp + Math.round(caster.maxMp * pct));
        }
      });
    } else if (effect.type === 'onMinionDeath') {
      caster.onMinionDeathHandlers.push((evt) => {
        // Implement: e.g. Necromancer's exploding minions (deals AoE around corpse).
        if (effect.action === 'damage') {
          const power = F.scaleParam(slot.ability.scaling, effect.powerScalar ?? 0, slot.stoneLevel);
          const ctx = evt.ctx;
          if (!ctx) return;
          const enemies = caster.isEnemy ? ctx.battle.playerUnits : ctx.battle.enemyUnits;
          for (const e of enemies) {
            if (e.dead) continue;
            const def = effectiveStat(e, 'mdef', ctx.now);
            applyDamage(e, F.damage(power, effectiveStat(caster, 'matk', ctx.now), def, ctx.floor), ctx);
          }
        }
      });
    } else if (effect.type === 'onParry') {
      caster.onParryHandlers.push((evt) => {
        if (effect.action === 'reflectDamagePct') {
          // The parry mechanic itself handles damage attribution; this is an
          // amplifier hook. For v0.23 we just buff next damage cast slightly
          // (visual + light feedback).
          caster.nextHitMods.push({ kind: 'damage', stat: 'damageMultiplier', amountPct: 1.10 });
        }
      });
    } else if (effect.type === 'onHotComplete') {
      caster.onHotCompleteHandlers.push((evt) => {
        if (effect.action === 'healPct') {
          const pct = F.scaleParam(slot.ability.scaling, effect.amountPct ?? 0, slot.stoneLevel) / 100;
          // Heal nearest ally for pct of the tick value.
          const target = evt.tickAmount * pct;
          const nearest = (evt.ctx?.allies ?? []).find(a => !a.dead && a !== caster);
          if (nearest) applyHeal(nearest, Math.round(target), evt.ctx);
        }
      });
    } else if (effect.type === 'deathSave') {
      caster._deathSaveSpec = {
        transferPct: F.scaleParam(slot.ability.scaling, effect.selfHpCostPct ?? 25, slot.stoneLevel),
        cooldown:    F.scaleParam(slot.ability.scaling, effect.cooldown ?? 60, slot.stoneLevel)
      };
      caster._deathSaveCooldownUntil = -1;
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
