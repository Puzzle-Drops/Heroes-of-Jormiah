class Tank extends Character {
    constructor() {
        super('Tank', 'Tank', 1, 100, 50, 5, 10, 0.8);
        // GDD §6.3 Knight: HP/P.DEF focus, plate physical fighter.
        this.pAtk = 5; this.mAtk = 0;
        this.pDef = 10; this.mDef = 4;
        this.damageType = 'physical';
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

    useSkill(target) {
        this.updateSkillCost();
        if (this.cooldown === 0 && this.mana >= this.skillCost) {
            this.mana -= this.skillCost;
            this.cooldown = this.maxCooldown;
            this.tauntActive = true;
            this.tauntTimer = 300; // 5 seconds at 60fps
            
            // Calculate defense bonus: +10 flat + percentage of current defense
            const baseDefense = this.getTotalDefense();
            let defensePercent = 0.02; // Base 2%
            
            // Check for taunt rune to increase percentage
            // FIX: Use this.className.toLowerCase() instead of hardcoded party order
            if (window.game) {
                const charKey = this.className.toLowerCase();
                const equippedRunes = window.game.equippedRunes[charKey];
                
                if (equippedRunes) {
                    for (let i = 0; i < equippedRunes.length; i++) {
                        const rune = equippedRunes[i];
                        if (rune && rune.runeType === 'taunt') {
                            // +4% per tier (2% base + 4% per tier)
                            // Tier 1: 6%, Tier 2: 10%, Tier 3: 14%, Tier 4: 18%, Tier 5: 22%
                            defensePercent = 0.02 + (rune.tier * 0.04);
                            break;
                        }
                    }
                }
            }
            
            this.tauntDefenseBonus = 10 + Math.floor(baseDefense * defensePercent);
            this.tauntDefensePercent = defensePercent; // Store for display
            
            // TAUNT ALL ENEMIES - make them target the tank
            if (window.game && window.game.enemies) {
                window.game.enemies.forEach(enemy => {
                    if (enemy.isAlive) {
                        enemy.currentTarget = this;
                        enemy.isTaunted = true;
                        enemy.tauntTimer = 300; // 5 seconds
                    }
                });
                const percentDisplay = Math.round(defensePercent * 100);
                window.game.addLog(`${this.name} taunts all enemies! (+${this.tauntDefenseBonus} DEF [+10 + ${percentDisplay}%] for 5s)`, 'heal');
            }
            
            return 0; // Taunt doesn't deal damage
        }
        return 0;
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

    useSkill(target) {
        this.updateSkillCost();
        if (this.cooldown === 0 && this.mana >= this.skillCost) {
            this.mana -= this.skillCost;
            this.cooldown = this.maxCooldown;
            
            // Base 150% damage, check for doublestrike rune to increase
            let damageMultiplier = 1.5;
            
            if (window.game) {
                const charKey = this.className.toLowerCase();
                const equippedRunes = window.game.equippedRunes[charKey];
                
                if (equippedRunes) {
                    for (let i = 0; i < equippedRunes.length; i++) {
                        const rune = equippedRunes[i];
                        if (rune && rune.runeType === 'doublestrike') {
                            // +50% per tier (150% base + 50% per tier)
                            damageMultiplier = 1.5 + (rune.tier * 0.5);
                            break;
                        }
                    }
                }
            }
            
            return this.getTotalAttack() * damageMultiplier;
        }
        return 0;
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

            useSkill(targets) {
                this.updateSkillCost();
                if (this.cooldown === 0 && this.mana >= this.skillCost) {
                    this.mana -= this.skillCost;
                    this.cooldown = this.maxCooldown;
                    
                    // Base 80% AOE damage, check for fireball rune to increase
                    let damageMultiplier = 0.8;
                    
                    if (window.game) {
                        const charKey = this.className.toLowerCase();
                        const equippedRunes = window.game.equippedRunes[charKey];
                        
                        if (equippedRunes) {
                            for (let i = 0; i < equippedRunes.length; i++) {
                                const rune = equippedRunes[i];
                                if (rune && rune.runeType === 'fireball') {
                                    // +20% per tier (80% base + 20% per tier)
                                    damageMultiplier = 0.8 + (rune.tier * 0.2);
                                    break;
                                }
                            }
                        }
                    }
                    
                    return this.getTotalAttack() * damageMultiplier; // AOE damage
                }
                return 0;
            }
        }

class Healer extends Character {
    constructor() {
        super('Healer', 'Healer', 1, 75, 80, 4, 5, 1.0);
        // GDD §6.3 Cleric: M.ATK / MP focus.
        this.pAtk = 0; this.mAtk = 4;
        this.pDef = 5; this.mDef = 6;
        this.damageType = 'magical';
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

    useSkill(target) {
        this.updateSkillCost();
        if (this.cooldown === 0 && this.mana >= this.skillCost) {
            this.mana -= this.skillCost;
            this.cooldown = this.maxCooldown;
            // New Healing Formula: 5% of target's max HP + (Bonus Mana × 0.4) + 10 flat
            // Bonus Mana = Total Mana - Base Mana (80 for Healer)
            const baseMana = 80;
            const bonusMana = Math.max(0, this.maxMana - baseMana);
            
            // Get heal rune scaling if equipped
            let percentScaling = 0.05; // Base 5%
            let manaScaling = 0.4; // Base 0.4
            
            // Check for equipped heal rune
            // FIX: Use this.className.toLowerCase() instead of hardcoded party order
            if (window.game) {
                const charKey = this.className.toLowerCase();
                const equippedRunes = window.game.equippedRunes[charKey];
                
                if (equippedRunes) {
                    for (let i = 0; i < equippedRunes.length; i++) {
                        const rune = equippedRunes[i];
                        if (rune && rune.runeType === 'heal') {
                            // Apply tier-based scaling
                            percentScaling = 0.05 * (1 + (rune.tier * 0.15)); // +15% effectiveness per tier
                            manaScaling = 0.4 + (rune.tier * 0.1); // +0.1 per tier
                            break; // Only use first heal rune found
                        }
                    }
                }
            }
            
            return (target.getTotalMaxHp() * percentScaling) + (bonusMana * manaScaling) + 10;
        }
        return 0;
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

    useSkill(targets) {
        this.updateSkillCost();
        if (this.cooldown === 0 && this.mana >= this.skillCost) {
            this.mana -= this.skillCost;
            this.cooldown = this.maxCooldown;
            
            // Multi-shot: 3 arrows at 70% damage each
            let damageMultiplier = 0.7;
            
            // Check for multi-shot rune to increase damage
            // FIX: Use this.className.toLowerCase() instead of hardcoded party order
            if (window.game) {
                const charKey = this.className.toLowerCase();
                const equippedRunes = window.game.equippedRunes[charKey];
                
                if (equippedRunes) {
                    for (let i = 0; i < equippedRunes.length; i++) {
                        const rune = equippedRunes[i];
                        if (rune && rune.runeType === 'multishot') {
                            // +15% per tier
                            damageMultiplier = 0.7 + (rune.tier * 0.15);
                            break;
                        }
                    }
                }
            }
            
            return this.getTotalAttack() * damageMultiplier * 3; // 3 hits
        }
        return 0;
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

    useSkill(target) {
        this.updateSkillCost();
        if (this.cooldown === 0 && this.mana >= this.skillCost) {
            this.mana -= this.skillCost;
            this.cooldown = this.maxCooldown;
            
            // Divine Shield: Grant shield to self and nearby allies
            let shieldStrength = 0.15; // Base 15% of max HP
            let duration = 4; // 4 seconds
            
            // Check for divine shield rune
            // FIX: Use this.className.toLowerCase() instead of hardcoded party order
            if (window.game) {
                const charKey = this.className.toLowerCase();
                const equippedRunes = window.game.equippedRunes[charKey];
                
                if (equippedRunes) {
                    for (let i = 0; i < equippedRunes.length; i++) {
                        const rune = equippedRunes[i];
                        if (rune && rune.runeType === 'divineshield') {
                            // +5% per tier
                            shieldStrength = 0.15 + (rune.tier * 0.05);
                            break;
                        }
                    }
                }
                
                // Apply shield to all party members
                if (window.game && window.game.party) {
                    const now = Date.now();
                    let totalShieldAmount = 0;
                    window.game.party.forEach(member => {
                        if (member.isAlive) {
                            const shieldAmount = Math.floor(member.maxHp * shieldStrength);
                            member.shieldAmount = (member.shieldAmount || 0) + shieldAmount;
                            member.shieldEndTime = now + (duration * 1000); // duration in seconds, convert to ms
                            totalShieldAmount += shieldAmount;
                        }
                    });
                    
                    // Track total shields granted in stats
                    if (window.game.characterStats && window.game.characterStats[this.name]) {
                        window.game.characterStats[this.name].healingDone += totalShieldAmount;
                        
                    } else {
                        
                    }
                    
                    const percentDisplay = Math.round(shieldStrength * 100);
                    window.game.addLog(`${this.name} grants ${percentDisplay}% max HP shields to all allies!`, 'heal');
                }
            }
            
            return 0; // Shield doesn't deal damage
        }
        return 0;
    }
}
