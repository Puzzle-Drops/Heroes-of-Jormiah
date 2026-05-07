class Tank extends Character {
    constructor() {
        super('Tank', 'Tank', 1, 100, 50, 5, 10, 0.8);
        // GDD §6.3 Knight: HP/P.DEF focus, plate physical fighter.
        this.pAtk = 5; this.mAtk = 0;
        this.pDef = 10; this.mDef = 4;
        this.damageType = 'physical';
        // GDD §6.2 4-slot ability data. The actual mechanics for spell1
        // still flow through the legacy useSkill() below; this block exposes
        // metadata for tooltips, the upcoming stone system (Phase 8), and
        // routing the basic-attack school through the GDD damage path.
        // Phase 8.x: explicit GDD §7.3 endpoint values for Provoke per
        // the spec example (cooldown 18→8, +pDef 15%→60%, taunt 3s→6s,
        // mana fixed at 30). Stone level interpolates linearly.
        this.gddAbilities = {
            attack:  { name: 'Shield Bash',     school: 'physical', power: 1.0, manaCost: 0,  baseCooldown: 0 },
            spell1:  { name: 'Provoke',         school: 'physical', power: 0.0, manaCost: 30, baseCooldown: 18, effects: ['taunt','buff_pdef'],
                       endpoints: { cooldown:[18,8], manaCost:[30,30], pDefBuffPct:[15,60], tauntDuration:[3,6] } },
            spell2:  { name: 'Shield Wall',     school: 'physical', power: 0.0, manaCost: 25, baseCooldown: 30, effects: ['damage_reduction'],
                       endpoints: { cooldown:[30,15], reductionPct:[40,80] } },
            passive: { name: 'Vigilant Guard',  description: '+P.DEF; regen 1% HP when struck.' },
        };
        this.family = 'tank';
        this._equipStarterStones();
        this._initFamilyStart();
        this.skillName = 'Taunt';
        this.baseManaSkillCost = 15;
        this.skillCost = 15;
        this.maxCooldown = 14;
        this.tauntActive = false;
        this.tauntTimer = 0;
        this.tauntDefenseBonus = 10; // Base +10 flat defense
    }

    updateSkillCost() {
        // Mana cost scales +5 every 5 levels
        const costIncrease = Math.floor(this.level / 5) * 5;
        this.skillCost = this.baseManaSkillCost + costIncrease;
    }

    // Phase 7.zz — Taunt routed through Character._fireBespoke. Helper
    // owns mana/cooldown/Spell Echo/Totemic Will. The bespoke math
    // (rune-scaled defensePercent + tauntDefenseBonus + the
    // enemy-targeting loop) stays here.
    useSkill(target) {
        return this._fireBespoke({
            target,
            runeType: 'taunt',
            timersTouched: { caster: ['tauntTimer'] },
            apply({ runeTier, iteration }) {
                // 2% base + 4% per rune tier. Tier 5 = 22%.
                const defensePercent = 0.02 + runeTier * 0.04;
                const baseDefense = this.getTotalDefense();
                this.tauntActive = true;
                this.tauntTimer = 300; // 5s @ 60fps
                this.tauntDefenseBonus = 10 + Math.floor(baseDefense * defensePercent);
                this.tauntDefensePercent = defensePercent;
                if (window.game && window.game.enemies) {
                    for (const enemy of window.game.enemies) {
                        if (enemy.isAlive) {
                            enemy.currentTarget = this;
                            enemy.isTaunted = true;
                            enemy.tauntTimer = 300;
                        }
                    }
                    if (iteration === 0) {
                        const pct = Math.round(defensePercent * 100);
                        window.game.addLog(`${this.name} taunts all enemies! (+${this.tauntDefenseBonus} DEF [+10 + ${pct}%] for 5s)`, 'heal');
                    }
                }
                return 0; // Taunt deals no direct damage.
            },
        });
    }
}

        // In class Rogue (around line 1960)
class Rogue extends Character {
    constructor() {
        super('Rogue', 'Rogue', 1, 80, 60, 8, 5, 1.5);
        // GDD §6.3 Assassin/Rogue family: P.ATK focus, single-target burst.
        this.pAtk = 8; this.mAtk = 0;
        this.pDef = 5; this.mDef = 2;
        this.damageType = 'physical';
        this.gddAbilities = {
            attack:  { name: 'Backstab',     school: 'physical', power: 1.0, manaCost: 0,  baseCooldown: 0,  description: '+200% crit damage on rear strikes (when crit lands).' },
            spell1:  { name: 'Double Strike', school: 'physical', power: 1.4, manaCost: 15, baseCooldown: 6,  effects: ['double_hit'] },
            spell2:  { name: 'Vanish',       school: 'physical', power: 0.0, manaCost: 30, baseCooldown: 18, effects: ['untargetable_3s','double_dmg_next'], description: 'Untargetable 3s; next attack deals double damage.' },
            passive: { name: 'Shadow Step',  description: 'After a kill, +100% attack speed for 2s.' },
        };
        this.family = 'rogue';
        this._equipStarterStones();
        this._initFamilyStart();
        this.skillName = 'Double Strike';
        this.baseManaSkillCost = 15;
        this.skillCost = 15;
        this.maxCooldown = 6;
    }

    updateSkillCost() {
        // Mana cost scales +5 every 5 levels
        const costIncrease = Math.floor(this.level / 5) * 5;
        this.skillCost = this.baseManaSkillCost + costIncrease;
    }

    // Phase 7.zz — Double Strike via _fireBespoke. Returns damage
    // (combat tick applies it to the target).
    useSkill(target) {
        return this._fireBespoke({
            target,
            runeType: 'doublestrike',
            apply({ runeTier }) {
                // 150% base + 50% per rune tier. Tier 5 = 400%.
                const mult = 1.5 + runeTier * 0.5;
                return this.getTotalAttack() * mult;
            },
        });
    }
}

// In class Mage (around line 1970)
class Mage extends Character {
    constructor() {
                super('Mage', 'Mage', 1, 70, 100, 10, 3, 0.9);
                // GDD §6.3 Magician family (Pyromancer-aligned): pure caster, M.ATK focus.
                this.pAtk = 0; this.mAtk = 10;
                this.pDef = 3; this.mDef = 6;
                this.damageType = 'magical';
                this.gddAbilities = {
                    attack:  { name: 'Firebolt',    school: 'magical', power: 1.0, manaCost: 0,  baseCooldown: 0,  effects: ['ignite_4s'] },
                    spell1:  { name: 'Fireball',    school: 'magical', power: 1.6, manaCost: 20, baseCooldown: 6,  effects: ['aoe','burn_stack'] },
                    spell2:  { name: 'Combustion',  school: 'magical', power: 0.0, manaCost: 35, baseCooldown: 14, effects: ['detonate_burns'], description: 'Detonates all burns: damage = remaining DoT × 1.5.' },
                    passive: { name: 'Heat Wave',   description: 'Each ignited enemy grants +5% M.ATK.' },
                };
                this.family = 'magician';
                this._equipStarterStones();
                this._initFamilyStart();
                this.skillName = 'Fireball';
                this.baseManaSkillCost = 20;
                this.skillCost = 20;
                this.maxCooldown = 6;
            }

            updateSkillCost() {
                // Mana cost scales +5 every 5 levels
                const costIncrease = Math.floor(this.level / 5) * 5;
                this.skillCost = this.baseManaSkillCost + costIncrease;
            }

            // Phase 7.zz — Fireball via _fireBespoke. Returns per-target
            // AoE damage (combat tick fans it across all alive enemies).
            useSkill(targets) {
                return this._fireBespoke({
                    target: Array.isArray(targets) ? targets[0] : targets,
                    runeType: 'fireball',
                    apply({ runeTier }) {
                        // 80% base + 20% per rune tier. Tier 5 = 180%.
                        const mult = 0.8 + runeTier * 0.2;
                        return this.getTotalAttack() * mult;
                    },
                });
            }
        }

class Healer extends Character {
    constructor() {
        super('Healer', 'Healer', 1, 75, 80, 4, 5, 1.0);
        // GDD §6.3 Cleric: M.ATK / MP focus.
        this.pAtk = 0; this.mAtk = 4;
        this.pDef = 5; this.mDef = 6;
        this.damageType = 'magical';
        this.gddAbilities = {
            attack:  { name: 'Holy Bolt',     school: 'magical', power: 1.0, manaCost: 0,  baseCooldown: 0 },
            spell1:  { name: 'Greater Heal',  school: 'magical', power: 0.0, manaCost: 20, baseCooldown: 8,  effects: ['heal_target'] },
            spell2:  { name: 'Group Mend',    school: 'magical', power: 0.0, manaCost: 35, baseCooldown: 18, effects: ['heal_party'], description: 'Small heal to all (1–2% max HP).' },
            passive: { name: 'Devout',        description: 'Overhealing converts to MP at 50%.' },
        };
        this.family = 'healer';
        this._equipStarterStones();
        this._initFamilyStart();
        this.skillName = 'Heal';
        this.baseManaSkillCost = 20;
        this.skillCost = 20;
        this.maxCooldown = 8;
        this.manaRegen = 4; // CHANGE FROM 20 TO 4
    }

    updateSkillCost() {
        // Mana cost scales +5 every 5 levels
        const costIncrease = Math.floor(this.level / 5) * 5;
        this.skillCost = this.baseManaSkillCost + costIncrease;
    }

    // Phase 7.zz — Greater Heal via _fireBespoke. Returns the heal
    // amount; combat tick applies it via target.heal().
    useSkill(target) {
        return this._fireBespoke({
            target,
            runeType: 'heal',
            apply({ target, runeTier }) {
                // 5% of target max HP × (1 + 15%/tier), plus
                // (bonus mana × (0.4 + 0.1/tier)), plus 10 flat.
                const baseMana = 80;
                const bonusMana = Math.max(0, this.maxMana - baseMana);
                const percentScaling = 0.05 * (1 + runeTier * 0.15);
                const manaScaling = 0.4 + runeTier * 0.1;
                return (target.getTotalMaxHp() * percentScaling)
                     + (bonusMana * manaScaling)
                     + 10;
            },
        });
    }
}

// ARCHER CLASS - NEW
class Archer extends Character {
    constructor() {
        super('Archer', 'Archer', 1, 85, 70, 9, 4, 1.2);
        // GDD §6.3 Marksman family (Archer): ranged P.ATK focus.
        this.pAtk = 9; this.mAtk = 0;
        this.pDef = 4; this.mDef = 3;
        this.damageType = 'physical';
        this.gddAbilities = {
            attack:  { name: 'Quick Shot',      school: 'physical', power: 1.0, manaCost: 0,  baseCooldown: 0 },
            spell1:  { name: 'Multishot',       school: 'physical', power: 0.8, manaCost: 20, baseCooldown: 8,  effects: ['hits_3_random'] },
            spell2:  { name: 'Piercing Arrow',  school: 'physical', power: 1.5, manaCost: 30, baseCooldown: 12, effects: ['line_aoe','ignore_50_pdef'], description: 'Line AoE; ignores 50% P.DEF.' },
            passive: { name: 'Eagle Eye',       description: '+crit chance vs enemies above 80% HP.' },
        };
        this.family = 'marksman';
        this._equipStarterStones();
        this._initFamilyStart();
        this.skillName = 'Multi-Shot';
        this.baseManaSkillCost = 18;
        this.skillCost = 18;
        this.maxCooldown = 7;
    }

    updateSkillCost() {
        // Mana cost scales +5 every 5 levels
        const costIncrease = Math.floor(this.level / 5) * 5;
        this.skillCost = this.baseManaSkillCost + costIncrease;
    }

    // Phase 7.zz — Multi-Shot via _fireBespoke. Returns total damage
    // for all 3 arrows; combat tick splits it across 3 targets.
    useSkill(targets) {
        return this._fireBespoke({
            target: Array.isArray(targets) ? targets[0] : targets,
            runeType: 'multishot',
            apply({ runeTier }) {
                // 70% base + 15% per rune tier, × 3 arrows.
                const perArrow = 0.7 + runeTier * 0.15;
                return this.getTotalAttack() * perArrow * 3;
            },
        });
    }
}

// PALADIN CLASS - NEW
class Paladin extends Character {
    constructor() {
        super('Paladin', 'Paladin', 1, 90, 65, 6, 8, 0.95);
        // GDD §6.3 Paladin: hybrid P.ATK + M.ATK, decent both defenses.
        this.pAtk = 4; this.mAtk = 4;
        this.pDef = 8; this.mDef = 6;
        this.damageType = 'mixed';
        this.gddAbilities = {
            attack:  { name: 'Smite',          school: 'mixed',    power: 1.0, manaCost: 0,  baseCooldown: 0 },
            spell1:  { name: 'Word of Glory',  school: 'magical',  power: 0.0, manaCost: 25, baseCooldown: 12, effects: ['heal_party_small','aura_taunt_2s'] },
            spell2:  { name: 'Divine Shield',  school: 'magical',  power: 0.0, manaCost: 35, baseCooldown: 24, effects: ['party_damage_reduction'], description: 'Brief party-wide damage reduction.' },
            passive: { name: 'Aura of Valor',  description: 'Party +5% all attack while alive.' },
        };
        this.family = 'fighter';
        this._equipStarterStones();
        this._initFamilyStart();
        this.skillName = 'Divine Shield';
        this.baseManaSkillCost = 20;
        this.skillCost = 20;
        this.maxCooldown = 10;
        this.shieldActive = false;
        this.shieldEndTime = null;
        this.shieldAmount = 0;
    }

    updateSkillCost() {
        // Mana cost scales +5 every 5 levels
        const costIncrease = Math.floor(this.level / 5) * 5;
        this.skillCost = this.baseManaSkillCost + costIncrease;
    }

    // Phase 7.zz — Divine Shield via _fireBespoke. Grants party-wide
    // shields scaled by rune tier; uses Date.now()-based shieldEndTime
    // (not a frame counter), so Totemic Will doesn't apply.
    useSkill(target) {
        return this._fireBespoke({
            target,
            runeType: 'divineshield',
            apply({ runeTier, iteration }) {
                // 15% base + 5% per rune tier. Tier 5 = 40% max HP shield.
                const shieldStrength = 0.15 + runeTier * 0.05;
                const duration = 4;
                if (window.game && window.game.party) {
                    const now = Date.now();
                    let totalShieldAmount = 0;
                    for (const member of window.game.party) {
                        if (!member.isAlive) continue;
                        const amt = Math.floor(member.maxHp * shieldStrength);
                        member.shieldAmount = (member.shieldAmount || 0) + amt;
                        member.shieldEndTime = now + duration * 1000;
                        totalShieldAmount += amt;
                    }
                    if (window.game.characterStats && window.game.characterStats[this.name]) {
                        window.game.characterStats[this.name].healingDone += totalShieldAmount;
                    }
                    if (iteration === 0) {
                        const pct = Math.round(shieldStrength * 100);
                        window.game.addLog(`${this.name} grants ${pct}% max HP shields to all allies!`, 'heal');
                    }
                }
                return 0; // Shield grants do not deal damage.
            },
        });
    }
}
