import { getData } from '../state.js';

export function mitigation(defStat, floor) {
  return defStat / (defStat + 100 + 5 * floor);
}

export function damage(power, atkStat, defStat, floor) {
  const mit = mitigation(defStat, floor);
  return Math.max(1, Math.round(power * atkStat * (1 - mit)));
}

export function scaleParam(scaling, key, stoneLevel) {
  if (typeof key === 'number') return key;
  const ep = scaling?.[key];
  if (!ep) return 0;
  const t = (Math.max(1, Math.min(100, stoneLevel)) - 1) / 99;
  return ep.min + (ep.max - ep.min) * t;
}

export function manaRegenPerSecond(maxMP) {
  return maxMP * getData().formulas.mana.regenPerSecondPctMax;
}

export function enemyHP(baseHp, floor)   { return baseHp  * Math.pow(1.10, floor) * (1 + floor * 0.05); }
export function enemyDmg(baseDmg, floor) { return baseDmg * Math.pow(1.08, floor) * (1 + floor * 0.04); }
export function enemyDef(baseDef, floor) { return baseDef * Math.pow(1.07, floor); }
