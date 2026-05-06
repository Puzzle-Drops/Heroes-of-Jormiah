import { scaleParam } from './combat/formulas.js';

export function prettyAbility(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
export function prettyKey(s) {
  return s.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
          .replace(/\b\w/g, c => c.toUpperCase());
}
export function prettyType(t) { return prettyKey(t || ''); }

const STAT_LABEL = {
  hp: 'HP', mp: 'MP', patk: 'P.ATK', matk: 'M.ATK', pdef: 'P.DEF', mdef: 'M.DEF',
  attackSpeedPct: 'attack speed',
  damageTakenPct: 'damage taken',
  cooldownReductionPct: 'cooldown reduction',
  cooldownRatePct: 'cooldown rate',
  critChancePct: 'crit chance',
  critDamagePct: 'crit damage',
  dodgePct: 'dodge',
  hitRatePct: 'hit rate',
  lifestealPct: 'lifesteal',
  mpRegenPct: 'MP regen',
  mpRefundPct: 'MP refund',
  maxHpPct: 'max HP',
  debuffResistPct: 'debuff resist',
  debuffDurationAppliedPct: 'debuff duration',
  damageMultiplier: 'next-hit damage',
  damageVsTargetTagPct: 'damage vs flagged',
  durationPct: 'duration',
  durationBonus: 'duration',
  statScalePct: 'stat scale',
  nextHitDmgPct: 'next-hit damage',
  pdef_and_pdef: 'P.DEF',
  patk_and_pdef: 'P.ATK & P.DEF',
  all_attack: 'all attack',
  all_defense: 'all defense',
  elementResistPct: 'element resist'
};
export function statLabel(s) { return STAT_LABEL[s] ?? prettyKey(s ?? ''); }

const TARGET_LABELS = {
  self: 'self',
  party: 'all allies',
  around_self: 'allies in range',
  single_enemy: 'single enemy',
  single_enemy_front: 'lowest-HP front enemy',
  single_enemy_front_plus_adjacent: 'enemy + adjacent',
  all_enemies: 'all enemies',
  enemy_line: 'enemy line',
  random_enemies: 'a random enemy',
  single_ally: 'lowest-HP ally',
  single_ally_lowest_hp: 'lowest-HP ally',
  lowest_hp_ally: 'lowest-HP ally',
  two_allies: 'two lowest-HP allies',
  nearest_ally: 'nearest ally',
  single_marked_enemy: 'marked enemy',
  battlefield: 'the battlefield'
};
export function targetLabel(t) { return TARGET_LABELS[t] ?? prettyKey(t || 'self'); }

function num(v, ability, stoneLevel) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const sign = v.startsWith('-') ? -1 : 1;
    const key = sign === -1 ? v.slice(1) : v;
    return sign * scaleParam(ability.scaling, key, stoneLevel);
  }
  return 0;
}

export function humanizeEffect(effect, ability, stoneLevel) {
  const N = (v) => num(v, ability, stoneLevel);
  switch (effect.type) {
    case 'damage': {
      const pwr = N(effect.powerScalar ?? 1);
      const stat = effect.stat ?? 'patk';
      const hits = effect.hits ? N(effect.hits) : 1;
      const ignore = effect.ignoreDefPct ? N(effect.ignoreDefPct) : 0;
      let s = `Deal ${(pwr * 100).toFixed(0)}% ${statLabel(stat)} damage to ${targetLabel(effect.targets)}`;
      if (hits > 1) s += ` (×${Math.round(hits)} hits)`;
      if (ignore > 0) s += `, ignoring ${ignore.toFixed(0)}% defense`;
      return s;
    }
    case 'heal':
      return `Heal ${N(effect.amountPctMax).toFixed(0)}% max HP on ${targetLabel(effect.targets)}`;
    case 'buff': {
      const amt = N(effect.amountPct ?? effect.amount ?? 0);
      const dur = effect.duration && effect.duration !== 'permanent' ? N(effect.duration) : null;
      const sign = amt > 0 ? '+' : '';
      const persistent = effect.duration === 'permanent' || effect.whileAlive;
      const prefix = persistent ? 'Aura: ' : '';
      const tail = dur ? ` for ${dur.toFixed(1)}s` : (persistent ? ' (while alive)' : '');
      return `${prefix}${targetLabel(effect.targets)} gets ${sign}${amt.toFixed(0)}% ${statLabel(effect.stat)}${tail}`;
    }
    case 'taunt':
      return `Taunt ${targetLabel(effect.targets)} for ${N(effect.duration ?? 2).toFixed(1)}s`;
    case 'hot': {
      const pct = N(effect.amountPctMaxPerTick);
      const tick = N(effect.tick ?? 1) || 1;
      const ticks = effect.ticks ? N(effect.ticks) : (N(effect.duration ?? 4) / tick);
      return `Heal ${pct.toFixed(1)}% max HP per tick × ${Math.round(ticks)} ticks on ${targetLabel(effect.targets)}`;
    }
    case 'regen':
      return `Regen ${N(effect.amountPctMax).toFixed(1)}% max HP/sec for ${N(effect.duration ?? 5).toFixed(1)}s on ${targetLabel(effect.targets)}`;
    case 'dot':
    case 'stackDot':
      return `Apply ${effect.tag ?? 'dot'} (${N(effect.dpsPct ?? effect.amountPct).toFixed(1)}% max HP/sec) for ${N(effect.duration ?? 4).toFixed(1)}s on ${targetLabel(effect.targets)}`;
    case 'detonateDot':
      return `Detonate ${effect.tag ?? 'dot'} stacks on ${targetLabel(effect.targets)} for ${N(effect.multiplier ?? 1.5).toFixed(2)}× remaining damage`;
    case 'slow':
    case 'stackingSlow':
      return `Slow ${targetLabel(effect.targets)} by ${N(effect.amountPct ?? effect.perTickPct).toFixed(0)}% for ${N(effect.duration ?? 3).toFixed(1)}s`;
    case 'stun':
      return `Stun ${targetLabel(effect.targets)} for ${N(effect.duration ?? 1.5).toFixed(1)}s`;
    case 'freeze':
      return `Freeze ${targetLabel(effect.targets)} for ${N(effect.duration ?? effect.freezeDuration ?? 2).toFixed(1)}s`;
    case 'silence':
      return `Silence ${targetLabel(effect.targets)} for ${N(effect.duration ?? effect.silenceDuration ?? 2).toFixed(1)}s`;
    case 'blind':
      return `Blind ${targetLabel(effect.targets)} for ${N(effect.duration ?? 1).toFixed(1)}s`;
    case 'root':
      return `Root ${targetLabel(effect.targets)} for ${N(effect.duration ?? effect.rootDuration ?? 2).toFixed(1)}s`;
    case 'shield': {
      const dur = N(effect.duration ?? 5);
      let amt = '';
      if (effect.amountPctMax)   amt = `${N(effect.amountPctMax).toFixed(0)}% max HP`;
      else if (effect.amountPctMaxMP) amt = `${N(effect.amountPctMaxMP).toFixed(0)}% max MP`;
      else if (effect.amount)    amt = `${N(effect.amount).toFixed(0)} damage`;
      return `Shield ${targetLabel(effect.targets)} for ${amt || 'a hit'} (${dur.toFixed(1)}s)`;
    }
    case 'cleanse': return `Cleanse debuffs from ${targetLabel(effect.targets)}`;
    case 'dispel':  return `Dispel ${effect.count ? Math.round(N(effect.count)) : 1} buff(s) from ${targetLabel(effect.targets)}`;
    case 'untargetable':
      return `Make ${targetLabel(effect.targets)} untargetable for ${N(effect.duration ?? 2).toFixed(1)}s`;
    case 'immunity':
      return `Grant ${effect.tag ?? 'all'} immunity to ${targetLabel(effect.targets)} for ${N(effect.duration ?? 2).toFixed(1)}s`;
    case 'chain': {
      const pwr = N(effect.powerScalar ?? 1);
      const hops = N(effect.hops ?? effect.extraTargets ?? 1);
      const decay = N(effect.perHopDecayPct ?? effect.decayPct ?? 10);
      return `Chain ${(pwr * 100).toFixed(0)}% damage to ${Math.round(hops) + 1} enemies (-${decay.toFixed(0)}% per jump)`;
    }
    case 'chainHeal': {
      const pct = N(effect.amountPctMax);
      const hops = N(effect.hops ?? 3);
      return `Chain heal ${pct.toFixed(1)}% max HP × ${Math.round(hops)} allies`;
    }
    case 'mark':
      return `Mark ${targetLabel(effect.targets)} for ${N(effect.duration ?? 4).toFixed(1)}s`;
    case 'executeIfBelow':
      return `Instantly kill ${targetLabel(effect.targets)} if HP ≤ ${N(effect.thresholdPct).toFixed(0)}%`;
    case 'pull':
      return `Pull ${targetLabel(effect.targets)} into your front row`;
    case 'reflect':
      return `${targetLabel(effect.targets)} reflects ${N(effect.amountPct).toFixed(0)}% ${effect.school ?? ''} damage for ${N(effect.duration ?? 4).toFixed(1)}s`;
    case 'onHitTrigger':
      return `When struck: trigger ${prettyKey(effect.action ?? 'effect')} on ${targetLabel(effect.targets)}`;
    case 'onKill':
      return `On kill: ${prettyKey(effect.action ?? 'effect')} on ${targetLabel(effect.targets ?? 'self')}`;
    case 'crossStatContribution':
      return `${statLabel(effect.fromStat)} contributes ${N(effect.amountPct).toFixed(0)}% to ${statLabel(effect.toStat)}`;
    case 'scaledBuff':
      return `Scaled ${statLabel(effect.stat)} buff (scales with ${prettyKey(effect.scaledBy ?? '')})`;
    case 'conditionalBuff':
      return `When ${effect.when ?? 'condition'}: ${effect.amountPct ? `+${N(effect.amountPct).toFixed(0)}% ` : ''}${statLabel(effect.stat ?? '')}`;
    case 'cleansed':
      return `Cleanse status from ${targetLabel(effect.targets)}`;
    case 'threatMod':
      return `Generates ${N(effect.scalar).toFixed(2)}× threat`;
    case 'selfBuffNextHit':
      return `Buff next hit: +${N(effect.amountPct ?? effect.amount).toFixed(0)}% ${statLabel(effect.stat ?? 'damage')}`;
    case 'cleanse_status':
    case 'cleanseStatus':
      return `Cleanse status from ${targetLabel(effect.targets)}`;
    default:
      return `${prettyType(effect.type)} → ${targetLabel(effect.targets ?? 'self')}`;
  }
}

export function humanizeScalingKey(k) { return prettyKey(k); }

export function formatScalingValue(key, value) {
  // Keys often hint the unit; be lenient.
  if (/Pct/.test(key) || /Pct$/.test(key) || /BonusPct/.test(key)) return `${value.toFixed(1)}%`;
  if (/cooldown/i.test(key) || /duration/i.test(key) || /seconds/i.test(key) || /Window/i.test(key)) return `${value.toFixed(1)}s`;
  if (/cost/i.test(key) || /shots/i.test(key) || /jumps/i.test(key) || /hops/i.test(key) || /count/i.test(key) || /charges/i.test(key) || /hits/i.test(key)) return `${Math.round(value)}`;
  if (/multiplier/i.test(key) || /scalar/i.test(key) || /Power/i.test(key)) return value.toFixed(2);
  return value.toFixed(1);
}
