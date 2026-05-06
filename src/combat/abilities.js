import * as F from './formulas.js';

// Effect handler registry. v0.1 implements a working subset; unknown effect
// types log once and no-op. Add handlers here as the game grows.

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

function resolveTargets(selector, ctx) {
  const { caster, allies, enemies } = ctx;
  switch (selector) {
    case 'self': return [caster];
    case 'party': return alive(allies);
    case 'around_self': return alive(allies);

    case 'single_enemy':
    case 'single_enemy_front':
    case 'single_enemy_front_plus_adjacent': {
      const front = alive(enemies).filter(e => e.row === 'front');
      if (front.length) return [lowestHp(front)];
      const back = alive(enemies);
      return back.length ? [lowestHp(back)] : [];
    }
    case 'all_enemies': return alive(enemies);
    case 'enemy_line': {
      const front = alive(enemies).filter(e => e.row === 'front');
      return front.length ? front : alive(enemies);
    }
    case 'random_enemies': {
      const pool = alive(enemies);
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

    default:
      return alive(enemies).slice(0, 1);
  }
}

function lowestHp(units)    { return units.reduce((a, b) => a.hp <= b.hp ? a : b); }
function lowestHpPct(units) { return units.reduce((a, b) => (a.hp / a.maxHp) <= (b.hp / b.maxHp) ? a : b); }

function applyDamage(target, amount, ctx) {
  if (target.dead) return;
  target.hp = Math.max(0, target.hp - amount);
  ctx.fx?.push({ type: 'dmg', target, amount, t: ctx.now });
  if (target.hp <= 0) {
    target.dead = true;
    ctx.fx?.push({ type: 'death', target, t: ctx.now });
    ctx.onKill?.(ctx.caster, target);
  }
}

const HANDLERS = {
  damage(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    if (!targets.length) return;
    const power = scalar(effect.powerScalar ?? 1, ctx.ability, ctx.stoneLevel);
    const stat = effect.stat ?? 'patk';
    const atk = ctx.caster.stats[stat] ?? ctx.caster.stats.patk;
    const defStat = (effect.damageType === 'physical' || stat === 'patk') ? 'pdef' : 'mdef';
    const hits = effect.hits ? scalar(effect.hits, ctx.ability, ctx.stoneLevel) : 1;
    const ignorePct = effect.ignoreDefPct ? scalar(effect.ignoreDefPct, ctx.ability, ctx.stoneLevel) : 0;
    for (const t of targets) {
      const def = (t.stats[defStat] ?? 0) * (1 - ignorePct / 100);
      let total = 0;
      for (let i = 0; i < hits; i++) total += F.damage(power, atk, def, ctx.floor);
      applyDamage(t, total, ctx);
    }
  },

  heal(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const pct = scalar(effect.amountPctMax, ctx.ability, ctx.stoneLevel) / 100;
    for (const t of targets) {
      if (t.dead) continue;
      const amt = Math.round(t.maxHp * pct);
      const before = t.hp;
      t.hp = Math.min(t.maxHp, t.hp + amt);
      const healed = t.hp - before;
      if (healed > 0) ctx.fx?.push({ type: 'heal', target: t, amount: healed, t: ctx.now });
    }
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
    for (const t of targets) {
      t.tauntedBy = { caster: ctx.caster, expires: ctx.now + dur };
    }
  },

  hot(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const pctPerTick = scalar(effect.amountPctMaxPerTick, ctx.ability, ctx.stoneLevel) / 100;
    const tick = scalar(effect.tick ?? 1, ctx.ability, ctx.stoneLevel) || 1;
    const ticks = effect.ticks
      ? Math.round(scalar(effect.ticks, ctx.ability, ctx.stoneLevel))
      : Math.round(scalar(effect.duration ?? 4, ctx.ability, ctx.stoneLevel) / tick);
    for (const t of targets) {
      t.hots.push({ pctPerTick, tick, ticksLeft: ticks, nextAt: ctx.now + tick });
    }
  },

  regen(effect, ctx) {
    const targets = resolveTargets(effect.targets, ctx);
    const pct = scalar(effect.amountPctMax, ctx.ability, ctx.stoneLevel) / 100;
    const dur = scalar(effect.duration ?? 5, ctx.ability, ctx.stoneLevel) || 5;
    for (const t of targets) {
      t.regen.push({ pct, expires: ctx.now + dur, lastTick: ctx.now });
    }
  }
};

// ----- buff query helpers used by engine.computeEffectiveStat -----

export function buffMultiplier(unit, stat, now) {
  let mul = 1;
  for (const b of unit.buffs) {
    if (b.expires <= now) continue;
    if (b.stat === stat) mul *= (1 + b.amountPct / 100);
  }
  return mul;
}

export function pruneExpired(unit, now) {
  unit.buffs = unit.buffs.filter(b => b.expires > now);
  unit.regen = unit.regen.filter(r => r.expires > now);
  if (unit.tauntedBy && unit.tauntedBy.expires <= now) unit.tauntedBy = null;
}
