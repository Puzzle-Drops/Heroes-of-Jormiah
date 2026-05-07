        class RuneItem {
            constructor(tier, runeType) {
                this.tier = tier; // 1-5
                this.runeType = runeType;
                
                // Determine if this is an ability rune or stat rune
                const abilityRunes = ['taunt', 'heal', 'fireball', 'doublestrike', 'multishot', 'divineshield'];
                this.isAbilityRune = abilityRunes.includes(runeType);
                
                if (this.isAbilityRune) {
                    // Ability Rune
                    const abilityData = {
                        taunt: {
    name: 'Taunt',
    emoji: '🛡️',
    baseEffectiveness: 50,
    getDescription: (bonus) => {
        const baseDef = 10;
        const newDef = baseDef + (baseDef * bonus / 100);
        return `Taunt grants +${newDef.toFixed(1)} flat defense (up from +${baseDef})`;
    }
                        },
                        heal: {
    name: 'Heal',
    emoji: '💊',
    baseEffectiveness: 15,
    getDescription: (bonus) => {
        const tier = bonus / 15; // 15% per tier
        const basePercent = 5;
        const newPercent = basePercent * (1 + (tier * 0.15));
        const baseManaScaling = 0.4;
        const newManaScaling = baseManaScaling + (tier * 0.1);
        return `Heals ${newPercent.toFixed(1)}% max HP + (Bonus Mana × ${newManaScaling.toFixed(1)}) + 10 (up from ${basePercent}% + × ${baseManaScaling})`;
    }
                        },
                        fireball: {
                            name: 'Fireball',
                            emoji: '🔥',
                            baseEffectiveness: 30,
                            getDescription: (bonus) => {
                                const baseDmg = 80;
                                const newDmg = baseDmg + (baseDmg * bonus / 100);
                                return `Fireball deals ${newDmg.toFixed(0)}% attack damage AOE (up from ${baseDmg}%)`;
                            }
                        },
                        doublestrike: {
                            name: 'Double Strike',
                            emoji: '⚔️',
                            baseEffectiveness: 30,
                            getDescription: (bonus) => {
                                const baseDmg = 150;
                                const newDmg = baseDmg + (baseDmg * bonus / 100);
                                return `Double Strike deals ${newDmg.toFixed(0)}% attack damage (up from ${baseDmg}%)`;
                            }
                        },
                        multishot: {
                            name: 'Multi-Shot',
                            emoji: '🏹',
                            baseEffectiveness: 15,
                            getDescription: (bonus) => {
                                const baseDmg = 70;
                                const newDmg = baseDmg + bonus;
                                return `Multi-Shot arrows deal ${newDmg.toFixed(0)}% attack damage each (up from ${baseDmg}%) - 3 arrows`;
                            }
                        },
                        divineshield: {
                            name: 'Divine Shield',
                            emoji: '🛡️',
                            baseEffectiveness: 5,
                            getDescription: (bonus) => {
                                const baseShield = 15;
                                const newShield = baseShield + bonus;
                                return `Divine Shield grants ${newShield.toFixed(0)}% max HP shields (up from ${baseShield}%)`;
                            }
                        }
                    };
                    
                    const data = abilityData[runeType];
                    const tierNames = ['Advanced', 'Expert', 'Elite', 'Master', 'Grandmaster'];
                    
                    this.abilityName = data.name;
                    this.emoji = data.emoji;
                    this.effectivenessBonus = data.baseEffectiveness * tier; // 30%, 60%, 100%, 150%, 200%
                    this.name = `${tierNames[tier - 1]} ${data.name} (T${tier})`;
                    this.description = data.getDescription(this.effectivenessBonus);
                    
                } else {
                    // Stat Rune - percentage-based only
                    const statData = {
                        attack: { name: 'Attack', emoji: '⚔️', perTier: 4 },
                        attackspeed: { name: 'Attack Speed', emoji: '⚡', perTier: 1 },
                        defense: { name: 'Defense', emoji: '🛡️', perTier: 4 },
                        crit: { name: 'Crit', emoji: '💥', perTier: 2, secondaryStat: 'critDamage', secondaryPerTier: 5 },
                        dodge: { name: 'Dodge', emoji: '💨', perTier: 3 },
                        lifesteal: { name: 'Lifesteal', emoji: '🩸', perTier: 3 },
                        time: { name: 'Time', emoji: '⏱️', perTier: 3 },
                        health: { name: 'Health', emoji: '❤️', perTier: 4 },
                        mana: { name: 'Mana', emoji: '💙', perTier: 4 }
                    };
                    
                    const data = statData[runeType];
                    this.emoji = data.emoji;
                    this.statName = data.name;
                    this.percentBonus = data.perTier * tier;
                    this.name = `Rune of ${data.name} (T${tier})`;
                    
                    // Store as percentage bonus (will be applied to character's total stats)
                    this.statType = runeType;
                    if (runeType === 'crit') {
                        this.secondaryStatType = 'critDamage';
                        this.secondaryPercentBonus = data.secondaryPerTier * tier;
                        this.description = `+${this.percentBonus}% Crit Chance, +${this.secondaryPercentBonus}% Crit Damage`;
                    } else if (runeType === 'time') {
                        this.statType = 'cdr';
                        this.description = `+${this.percentBonus}% CDR`;
                    } else {
                        this.description = `+${this.percentBonus}% ${data.name}`;
                    }
                }
                
                // No rarity for runes
            }
            
            getStatsDisplay() {
                return this.description;
            }
            
            getDisplayName() {
                return this.name; // Just the name, no level or rarity
            }
            
            getSellPrice() {
                // Sell price based on tier only
                return this.tier * 200;
            }
        }
