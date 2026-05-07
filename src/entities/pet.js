        class Pet {
            constructor(rarity, level = 1, dungeonType = null) {
                this.rarity = rarity;
                this.level = Math.min(level, 20); // Cap at level 20
                this.id = Date.now() + Math.random();
                this.isActive = false;
                this.dungeonType = dungeonType; // Track which dungeon this pet is from
                
                // Pet types by dungeon
                const petTypes = {
                    everfall: {
                        common: [
                            { name: 'Plumee', emoji: '🪶', bonus: 'hp', base: 10, upgrade: 5, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/plumee.png' },
                            { name: 'Tuffit', emoji: '🐿️', bonus: 'dodge', base: 1, upgrade: 1, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/tuffit.png' },
                            { name: 'Zeffi', emoji: '🍃', bonus: 'defense', base: 5, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zeffi.png' },
                            { name: 'Loofin', emoji: '🌊', bonus: 'mana', base: 20, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/loofin.png' },
                            { name: 'Flitta', emoji: '🦋', bonus: 'attack', base: 1, upgrade: 1, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/flitta.png' }
                        ],
                        uncommon: [
                            { name: 'Preep', emoji: '🐸', bonus: 'lifesteal', base: 1, upgrade: 0.5, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/preep.png' },
                            { name: 'Skibbin', emoji: '🦎', bonus: 'hp', base: 20, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/skibbin.png' }
                        ],
                        rare: [
                            { name: 'Fandrel', emoji: '🦊', bonus: 'dodge', base: 3, upgrade: 1, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/fandrel.png' },
                            { name: 'Yuralon', emoji: '🦌', bonus: 'attack', base: 10, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/yuralon.png' },
                            { name: 'Zenth', emoji: '🐺', bonus: 'manaRegen', base: 2, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/zenth.png' }
                        ],
                        epic: [
                            { name: 'Arvent', emoji: '🦅', bonus: 'cdr', base: 5, upgrade: 1, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/arvent.png' },
                            { name: 'Quist', emoji: '🦉', bonus: 'critDamage', base: 5, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/quist.png' },
                            { name: 'Whisbit', emoji: '🐻', bonus: 'defense', base: 20, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/whisbit.png' }
                        ],
                        legendary: [
                            { name: 'Siroth', emoji: '🦁', bonus: 'attack', base: 25, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Air/siroth.png' }
                        ]
                    },
                    stoneforge: {
                        common: [
                            { name: 'Crimbee', emoji: '🐝', bonus: 'attack', base: 1, upgrade: 1, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/crimbee.png' },
                            { name: 'Pikkit', emoji: '🪨', bonus: 'hp', base: 10, upgrade: 5, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/pikkit.png' },
                            { name: 'Gritbun', emoji: '🐇', bonus: 'dodge', base: 1, upgrade: 1, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/gritbun.png' },
                            { name: 'Fennix', emoji: '🦊', bonus: 'defense', base: 5, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/fennix.png' }
                        ],
                        uncommon: [
                            { name: 'Varnowl', emoji: '🦉', bonus: 'dodge', base: 1, upgrade: 0.5, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/varnowl.png' },
                            { name: 'Bristlepup', emoji: '🐕', bonus: 'attack', base: 10, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/bristlepup.png' }
                        ],
                        rare: [
                            { name: 'Ignishade', emoji: '🔥', bonus: 'critDamage', base: 5, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ignishade.png' },
                            { name: 'Wiskit', emoji: '🐿️', bonus: 'dodge', base: 3, upgrade: 1, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/wiskit.png' },
                            { name: 'Quenra', emoji: '🦔', bonus: 'defense', base: 10, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/quenra.png' },
                            { name: 'Cindor', emoji: '🐻', bonus: 'hp', base: 20, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/cindor.png' },
                            { name: 'Solmere', emoji: '☀️', bonus: 'attack', base: 10, upgrade: 2, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/solmere.png' }
                        ],
                        epic: [
                            { name: 'Moltara', emoji: '🌋', bonus: 'defense', base: 20, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/moltara.png' },
                            { name: 'Braxen', emoji: '🦬', bonus: 'hp', base: 20, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/braxen.png' }
                        ],
                        legendary: [
                            { name: 'Ashkara', emoji: '🐉', bonus: 'attack', base: 25, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Fire/ashkara.png' }
                        ]
                    },
                    umbral: {
                        common: [
                            { name: 'Pepple', emoji: '🌑', bonus: 'hp', base: 10, upgrade: 5, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/pepple.png' }
                        ],
                        uncommon: [],
                        rare: [
                            { name: 'Nymbark', emoji: '🌙', bonus: 'dodge', base: 3, upgrade: 1, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/nymbark.png' }
                        ],
                        epic: [
                            { name: 'Moondra', emoji: '🌠', bonus: 'mana', base: 20, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/moondra.png' },
                            { name: 'Typharos', emoji: '👁️', bonus: 'attack', base: 20, upgrade: 10, image: 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Water/typharos.png' }
                        ],
                        legendary: []
                    }
                };
                
                // Select pet pool based on dungeon type, fallback to everfall
                const dungeonPool = petTypes[dungeonType] || petTypes.everfall;
                const typePool = dungeonPool[rarity] || [];
                
                // If pool is empty for this rarity/dungeon combo, use everfall as fallback
                const finalPool = typePool.length > 0 ? typePool : petTypes.everfall[rarity];
                const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
                
                this.name = chosen.name;
                this.emoji = chosen.emoji;
                this.bonusType = chosen.bonus;
                this.baseValue = chosen.base;
                this.upgradeValue = chosen.upgrade;
                this.image = chosen.image || 'https://raw.githubusercontent.com/Graphic37/KinBound/main/Kin/Earth/chundra.png'; // Fallback image
                
                // Fixed upgrade costs: 50k, 200k, 500k, 1m, 2m, 5m, 10m, 20m, 30m, 40m, 50m, then 50m per level
                this.upgradeCosts = [
                    50000, 200000, 500000, 1000000, 2000000, 5000000, 10000000, 
                    20000000, 30000000, 40000000, 50000000, 50000000, 50000000, 
                    50000000, 50000000, 50000000, 50000000, 50000000, 50000000, 50000000
                ];
            }
            
            getUpgradeCost() {
                if (this.level >= 20) return null; // Max level
                return this.upgradeCosts[this.level - 1];
            }
            
            getCurrentBonus() {
                // Base + (upgrade * (level - 1))
                return this.baseValue + (this.upgradeValue * (this.level - 1));
            }
            
            getDungeonDamageBonus() {
                // Damage bonus when in matching dungeon
                const bonuses = {
                    common: 5,
                    uncommon: 6,
                    rare: 7,
                    epic: 8,
                    legendary: 10
                };
                return bonuses[this.rarity] || 0;
            }
            
            upgrade() {
                if (this.level < 20) {
                    this.level++;
                }
            }
            
            getDisplayName() {
                const rarityColors = {
                    common: '#94a3b8',
                    uncommon: '#10b981',
                    rare: '#3b82f6',
                    epic: '#a855f7',
                    legendary: '#f59e0b'
                };
                
                return `${this.emoji} ${this.name} (Lv.${this.level})`;
            }
        }
