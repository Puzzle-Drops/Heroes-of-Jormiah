        class KeystoneItem {
            constructor(type, rarity, level) {
                this.type = type; // 'tank', 'healer', 'mage', 'rogue'
                this.rarity = rarity;
                this.level = level;
                
                // Randomly select one of 3 keystones per class
                const keystoneVariants = {
                    tank: [
                        {
                            internalName: 'wardens-aegis',
                            name: "Warden's Aegis",
                            abilityName: 'Invulnerability',
                            description: 'Become immune to all damage for 3 seconds',
                            cooldown: 55,
                            manaCost: 40
                        },
                        {
                            internalName: 'berserkers-pact',
                            name: "Berserker's Pact",
                            abilityName: 'Blood Frenzy',
                            description: 'Sacrifice 30% current HP to gain +100% attack speed and +50% lifesteal for 8 seconds',
                            cooldown: 40,
                            manaCost: 40
                        },
                        {
                            internalName: 'earthshakers-resolve',
                            name: "Earthshaker's Resolve",
                            abilityName: 'Seismic Slam',
                            description: 'Slam the ground, stunning all enemies for 2.5 seconds and reducing their attack by 40% for 5 seconds',
                            cooldown: 45,
                            manaCost: 40
                        }
                    ],
                    healer: [
                        {
                            internalName: 'arcanists-conduit',
                            name: "Arcanist's Conduit",
                            abilityName: 'Mana Feed',
                            description: 'Restore 75% max mana to lowest mana ally',
                            cooldown: 25,
                            manaCost: 40
                        },
                        {
                            internalName: 'martyrs-blessing',
                            name: "Martyr's Blessing",
                            abilityName: 'Sacrificial Surge',
                            description: 'Convert 40% of your current HP into healing, distributing it equally among all allies (heals for 200% of HP sacrificed)',
                            cooldown: 30,
                            manaCost: 40
                        },
                        {
                            internalName: 'phoenix-heart',
                            name: "Phoenix Heart",
                            abilityName: 'Resurrection',
                            description: 'Revive the most recently fallen ally with 40% HP and 30% mana',
                            cooldown: 45,
                            manaCost: 40
                        }
                    ],
                    mage: [
                        {
                            internalName: 'winters-wrath',
                            name: "Winter's Wrath",
                            abilityName: 'Blizzard',
                            description: 'Freeze all enemies for 2s + deal 120% attack damage',
                            cooldown: 40,
                            manaCost: 40
                        },
                        {
                            internalName: 'voidwalkers-gift',
                            name: "Voidwalker's Gift",
                            abilityName: 'Void Surge',
                            description: 'Next 5 attacks ignore 100% of enemy defense and have +50% crit chance (costs 15% max mana per attack)',
                            cooldown: 35,
                            manaCost: 40
                        },
                        {
                            internalName: 'timeweavers-paradox',
                            name: "Timeweaver's Paradox",
                            abilityName: 'Temporal Rewind',
                            description: 'Reset all party cooldowns and restore 25% HP to all allies',
                            cooldown: 85,
                            manaCost: 40
                        }
                    ],
                    rogue: [
                        {
                            internalName: 'assassins-mark',
                            name: "Assassin's Mark",
                            abilityName: 'Cripple',
                            description: 'Deal 150% attack damage + reduce enemy defense by 20 for 5s',
                            cooldown: 25,
                            manaCost: 0
                        },
                        {
                            internalName: 'shadow-dancer',
                            name: "Shadow Dancer",
                            abilityName: 'Shadow Step',
                            description: 'Next 3 attacks deal +120% damage and heal you for 50% of damage dealt',
                            cooldown: 30,
                            manaCost: 0
                        },
                        {
                            internalName: 'serpents-venom',
                            name: "Serpent's Venom",
                            abilityName: 'Toxic Cascade',
                            description: 'Your attacks poison the target for 10s, dealing 40% of your attack as damage per second (stacks 3x, -15% enemy attack speed)',
                            cooldown: 20,
                            manaCost: 0
                        }
                    ],
                    archer: [
                        {
                            internalName: 'hawkeyes-precision',
                            name: "Hawkeye's Precision",
                            abilityName: 'Perfect Shot',
                            description: 'Fire a perfect shot dealing 250% attack damage with 100% crit chance, ignores defense',
                            cooldown: 30,
                            manaCost: 0
                        },
                        {
                            internalName: 'rapid-quiver',
                            name: "Rapid Quiver",
                            abilityName: 'Arrow Storm',
                            description: 'Fire 8 rapid arrows each dealing 60% attack damage over 2 seconds',
                            cooldown: 35,
                            manaCost: 0
                        },
                        {
                            internalName: 'hunters-focus',
                            name: "Hunter's Focus",
                            abilityName: 'Marked for Death',
                            description: 'Mark an enemy for 6s, all attacks against it deal +80% damage and heal you for 30% of damage dealt',
                            cooldown: 28,
                            manaCost: 0
                        }
                    ],
                    paladin: [
                        {
                            internalName: 'holy-avenger',
                            name: "Holy Avenger",
                            abilityName: 'Divine Wrath',
                            description: 'Smite all enemies for 160% attack damage and heal all allies for 15% of their max HP',
                            cooldown: 38,
                            manaCost: 40
                        },
                        {
                            internalName: 'divine-guardian',
                            name: "Divine Guardian",
                            abilityName: 'Sacred Barrier',
                            description: 'Grant all allies a shield for 20% of their max HP for 6 seconds, +30% defense during shield',
                            cooldown: 42,
                            manaCost: 40
                        },
                        {
                            internalName: 'righteous-fury',
                            name: "Righteous Fury",
                            abilityName: 'Holy Fire',
                            description: 'Deal 150% attack damage to all enemies and grant all allies +35% attack speed for 5 seconds',
                            cooldown: 33,
                            manaCost: 40
                        }
                    ]
                };
                
                // Randomly pick one of the 3 variants for this class
                const variants = keystoneVariants[type];
                const chosenVariant = variants[Math.floor(Math.random() * variants.length)];
                
                this.internalName = chosenVariant.internalName;
                this.keystoneName = chosenVariant.name;
                this.ability = {
                    name: chosenVariant.abilityName,
                    description: chosenVariant.description,
                    cooldown: chosenVariant.cooldown,
                    manaCost: chosenVariant.manaCost
                };
                
                // ability is already set above from chosenVariant
                
                // Stat count based on rarity
                const statCounts = {
                    common: 1,
                    uncommon: 2,
                    rare: 3,
                    epic: 4,
                    legendary: 4
                };
                
                const statCount = statCounts[rarity];
                
                // All possible stats
                const allStats = [
                    'attack', 'attackSpeed', 'critDamage', 'critChance',
                    'defense', 'cdr', 'dodge', 'hpRegen',
                    'manaRegen', 'mana', 'hp', 'lifesteal'
                ];
                
                // Stat scaling per level
                const statScaling = {
                    attack: { min: 0.6, max: 1.0 },
                    attackSpeed: { min: 0.3, max: 0.5 },
                    critDamage: { min: 1.2, max: 2.0 },
                    critChance: { min: 0.3, max: 0.5 },
                    defense: { min: 0.48, max: 0.8 },
                    cdr: { min: 0.3, max: 0.5 },
                    dodge: { min: 0.24, max: 0.4 },
                    hpRegen: { min: 0.18, max: 0.3 },
                    manaRegen: { min: 0.3, max: 0.5 },
                    mana: { min: 3, max: 5 },
                    hp: { min: 3, max: 5 },
                    lifesteal: { min: 0.24, max: 0.4 }
                };
                
                // Randomly select stats (no duplicates)
                const shuffled = allStats.sort(() => Math.random() - 0.5);
                const selectedStats = shuffled.slice(0, statCount);
                
                // Assign stat values
                selectedStats.forEach(stat => {
                    const scaling = statScaling[stat];
                    let multiplier;
                    
                    if (rarity === 'legendary') {
                        multiplier = scaling.max; // Perfect roll
                    } else {
                        // Random roll between min and max
                        multiplier = scaling.min + Math.random() * (scaling.max - scaling.min);
                    }
                    
                    this.stats = this.stats || {};
this.stats[stat] = Math.round(multiplier * level * 100) / 100;
                });
                
                // Set name
                const typeNames = {
                    tank: '🛡️ Tank',
                    healer: '💊 Healer',
                    mage: '🔮 Mage',
                    rogue: '🗡️ Rogue'
                };
                
                const rarityNames = {
                    common: 'Common',
                    uncommon: 'Uncommon',
                    rare: 'Rare',
                    epic: 'Epic',
                    legendary: 'Legendary'
                };
                
                this.name = `Lvl ${level} ${rarityNames[rarity]} ${this.keystoneName}`;
            }
            
            getStatsDisplay() {
                if (!this.stats) return 'No stats';
                
                const statNames = {
                    attack: 'ATK',
                    attackSpeed: 'ATK SPD',
                    critDamage: 'CRIT DMG',
                    critChance: 'CRIT',
                    defense: 'DEF',
                    cdr: 'CDR',
                    dodge: 'DODGE',
                    hpRegen: 'HP REGEN',
                    manaRegen: 'MANA REGEN',
                    mana: 'MANA',
                    hp: 'HP',
                    lifesteal: 'LIFESTEAL'
                };
                
                const percentStats = ['attackSpeed', 'critDamage', 'critChance', 'cdr', 'dodge', 'hpRegen', 'manaRegen', 'lifesteal'];
                
                const stats = [];
                for (const [stat, value] of Object.entries(this.stats)) {
                    const displayName = statNames[stat] || stat;
                    const suffix = percentStats.includes(stat) ? '%' : '';
                    stats.push(`${displayName} +${value}${suffix}`);
                }
                return stats.join(', ');
            }
            
            getSellPrice() {
                const rarityMultipliers = {
                    common: 50,
                    uncommon: 100,
                    rare: 200,
                    epic: 400,
                    legendary: 1000
                };
                return rarityMultipliers[this.rarity] * this.level;
            }
        }

