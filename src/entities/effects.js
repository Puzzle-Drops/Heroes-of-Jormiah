// GDD §6.3 — data-driven spell effects engine.
//
// Each ability declares an `effects: [tag, tag, ...]` array. When the
// ability fires, applyEffects() walks the tags and runs the matching
// handlers. Handlers receive a small context bag with the caster, the
// directly-targeted unit, the party/enemy lists, and the resolved
// damage power (already including stoneFactor + base ATK by the
// caller). They return a numeric "primary damage dealt" so the
// combat-tick caller can render floating text + log appropriately.
//
// Phase 7.x ships ~12 of the most common effect tags. Tags that
// aren't recognised fall through silently — the spell still fires,
// it just doesn't apply that tag's bespoke behavior. New tags are
// added incrementally as more class abilities need them.

const EFFECT_HANDLERS = {
    // Single-target damage. Default fallback when no other tag fires.
    target_damage: (ctx) => {
        if (!ctx.target || !ctx.target.takeDamage) return 0;
        const dmg = ctx.target.takeDamage(ctx.power, ctx.school, ctx.floor);
        ctx.note('hit', ctx.target, dmg);
        return dmg;
    },

    // Hit all enemies for the spell's power.
    aoe: (ctx) => {
        let total = 0;
        for (const e of ctx.enemies) {
            if (!e.isAlive) continue;
            const d = e.takeDamage(ctx.power, ctx.school, ctx.floor);
            ctx.note('hit', e, d);
            total += d;
        }
        return total;
    },

    // Hit 3 random enemies for full damage.
    hits_3_random: (ctx) => {
        const pool = ctx.enemies.filter(e => e.isAlive);
        if (pool.length === 0) return 0;
        let total = 0;
        for (let i = 0; i < 3; i++) {
            const t = pool[Math.floor(Math.random() * pool.length)];
            const d = t.takeDamage(ctx.power, ctx.school, ctx.floor);
            ctx.note('hit', t, d);
            total += d;
        }
        return total;
    },

    // Hit 2 enemies adjacent to the primary target (using slot-index proximity).
    hits_adjacent: (ctx) => {
        if (!ctx.target) return 0;
        const idx = ctx.enemies.indexOf(ctx.target);
        if (idx < 0) return 0;
        const targets = [
            ctx.target,
            ctx.enemies[idx - 1], ctx.enemies[idx + 1],
        ].filter(e => e && e.isAlive);
        let total = 0;
        for (const t of targets) {
            const d = t.takeDamage(ctx.power * (t === ctx.target ? 1 : 0.6), ctx.school, ctx.floor);
            ctx.note('hit', t, d);
            total += d;
        }
        return total;
    },

    // Heal the lowest-HP ally for `power` HP.
    heal_target: (ctx) => {
        const injured = ctx.party
            .filter(m => m.isAlive && m.hp < m.getTotalMaxHp())
            .sort((a, b) => a.hp/a.getTotalMaxHp() - b.hp/b.getTotalMaxHp())[0];
        const target = injured || ctx.caster;
        const heal = target.heal ? target.heal(ctx.power) : 0;
        ctx.note('heal', target, heal);
        return heal;
    },

    // Heal everyone in the party for `power × 0.4` HP each.
    heal_party: (ctx) => {
        let total = 0;
        for (const m of ctx.party) {
            if (!m.isAlive || !m.heal) continue;
            const h = m.heal(ctx.power * 0.4);
            total += h;
            ctx.note('heal', m, h);
        }
        return total;
    },

    // Force every enemy to target the caster for 4s.
    taunt_all: (ctx) => {
        for (const e of ctx.enemies) {
            if (!e.isAlive) continue;
            e.currentTarget = ctx.caster;
            e.isTaunted = true;
            e.tauntTimer = 240; // 4s @ 60fps
        }
        ctx.note('taunt', ctx.caster, 0);
        return 0;
    },

    // Force the directly-targeted enemy to attack the caster for 5s.
    taunt: (ctx) => {
        if (!ctx.target) return 0;
        ctx.target.currentTarget = ctx.caster;
        ctx.target.isTaunted = true;
        ctx.target.tauntTimer = 300;
        ctx.note('taunt', ctx.caster, 0);
        return 0;
    },

    // +30% pDef self-buff for 6s.
    buff_pdef: (ctx) => {
        ctx.caster.tauntActive = true;
        ctx.caster.tauntTimer = Math.max(ctx.caster.tauntTimer || 0, 360);
        ctx.caster.tauntDefenseBonus = Math.max(ctx.caster.tauntDefenseBonus || 0, 10 + Math.floor((ctx.caster.pDef || 0) * 0.3));
        return 0;
    },

    // 60% incoming-damage reduction self-buff for 4s.
    damage_reduction: (ctx) => {
        ctx.caster.damageReduction = 0.6;
        ctx.caster.damageReductionTimer = 240;
        return 0;
    },

    damage_reduction_60_4s: (ctx) => EFFECT_HANDLERS.damage_reduction(ctx),

    // Slow target's attackSpeed by 30% for 4s.
    slow: (ctx) => {
        if (!ctx.target) return 0;
        ctx.target._origAS = ctx.target._origAS ?? ctx.target.attackSpeed;
        ctx.target.attackSpeed = ctx.target._origAS * 0.7;
        ctx.target.slowedTimer = 240;
        return 0;
    },

    // Apply a bleed dot dealing 10% power per second for 5s.
    bleed: (ctx) => {
        if (!ctx.target) return 0;
        ctx.target.bleedDamage = ctx.power * 0.1;
        ctx.target.bleedTimer = 300;
        return 0;
    },

    // Apply an ignite dot — 15% power per second for 4s.
    ignite_4s: (ctx) => {
        if (!ctx.target) return 0;
        ctx.target.poisonDamage = ctx.power * 0.15;
        ctx.target.poisonTimer = 240;
        return 0;
    },
};

// GDD §13 Totemic Will keystone — buff/debuff durations × 1.5 when
// the caster has the keystone allocated. Applied as a multiplier on
// any timer fields the handlers below set on either caster or target.
function _willMult(ctx) {
    return ctx && ctx.caster && ctx.caster.keystone_totemicWill ? 1.5 : 1;
}
function _extendTimer(unit, key, mult) {
    if (!unit || !unit[key] || mult === 1) return;
    unit[key] = Math.round(unit[key] * mult);
}

// Apply a list of effect tags. Returns the maximum primary damage
// reported by any handler so the caller has something to render.
function applyEffects(tags, ctx) {
    if (!Array.isArray(tags) || tags.length === 0) {
        return EFFECT_HANDLERS.target_damage(ctx);
    }
    let bestDamage = 0;
    let anyDamageHandler = false;
    for (const tag of tags) {
        const handler = EFFECT_HANDLERS[tag];
        if (!handler) continue;
        const d = handler(ctx) || 0;
        if (typeof d === 'number' && d > bestDamage) bestDamage = d;
        // Mark whether any handler dealt damage (vs pure utility).
        if (['target_damage','aoe','hits_3_random','hits_adjacent','bleed','ignite_4s'].includes(tag)) {
            anyDamageHandler = true;
        }
    }
    // If the spell has only utility tags (e.g. taunt_all, buff_pdef),
    // there's no damage to report — the caller treats >=0 as "skill
    // succeeded". If the spell has SOME damage tag but no enemy died,
    // bestDamage may still be 0 — that's fine.

    // GDD §13 Totemic Will — extend the timers any of the just-applied
    // effects set on the caster/target/party/enemies. Touches the
    // common buff/debuff timer fields rather than threading the
    // multiplier through every handler. Units are deduped so a target
    // appearing in both ctx.target and ctx.enemies isn't extended twice.
    const mult = _willMult(ctx);
    if (mult !== 1) {
        const TIMER_FIELDS = ['tauntTimer','damageReductionTimer','slowedTimer',
                              'bleedTimer','poisonTimer'];
        const seen = new Set();
        const touch = (u) => {
            if (!u || seen.has(u)) return;
            seen.add(u);
            for (const f of TIMER_FIELDS) _extendTimer(u, f, mult);
        };
        touch(ctx.caster);
        touch(ctx.target);
        for (const m of ctx.party  || []) touch(m);
        for (const e of ctx.enemies || []) touch(e);
    }

    if (!anyDamageHandler) return 0;
    return bestDamage;
}

// Phase 7.z — keystone post-cast hook for bespoke (non-engine) spells.
// The 6 starter classes' useSkill methods carry rune-scaled math that
// doesn't fit the generic effect handlers. Calling this hook at the end
// of a bespoke spell lets keystones still affect it. Pass the list of
// timer fields the spell just set on each unit so we extend only those
// — not pre-existing buffs from previous casts.
//
// Spec:
//   applyBespokeKeystoneHooks(caster, {
//     casterTimers: ['tauntTimer'],         // fields the spell set on caster
//     targetTimers: ['bleedTimer'],         // fields set on target
//     target: enemy,                         // optional direct target
//     partyTimers: ['damageReductionTimer'],// applied to every party member
//   })
function applyBespokeKeystoneHooks(caster, opts = {}) {
    if (!caster) return;
    if (caster.keystone_totemicWill) {
        const stretch = (unit, fields) => {
            if (!unit || !fields) return;
            for (const f of fields) {
                if (unit[f]) unit[f] = Math.round(unit[f] * 1.5);
            }
        };
        stretch(caster,      opts.casterTimers);
        stretch(opts.target, opts.targetTimers);
        if (opts.partyTimers && window.game && Array.isArray(window.game.party)) {
            for (const m of window.game.party) stretch(m, opts.partyTimers);
        }
    }
}

window.EFFECTS = {
    handlers: EFFECT_HANDLERS,
    apply: applyEffects,
    applyBespokeKeystoneHooks,
};
