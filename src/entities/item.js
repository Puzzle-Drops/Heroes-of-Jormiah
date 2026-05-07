        class Item {
            constructor(type, rarity, level) {
                this.type = type;
                this.rarity = rarity;
                this.level = level;
                this.levelReq = Math.max(1, level - 1);
                
// Stat pools by slot type
                const statPools = {
    helmet: ['defense', 'hp', 'mana', 'cdr'],
    gloves: ['attack', 'attackSpeed', 'hp', 'defense'],
    belt: ['hp', 'defense', 'lifesteal', 'hpRegen'],
    chest: ['defense', 'hp', 'mana', 'dodgeChance'],
    boots: ['attackSpeed', 'hp', 'defense', 'dodgeChance'],
    amulet: ['attack', 'hp', 'critDamage', 'manaRegen'],
    ring: ['attack', 'attackSpeed', 'critChance', 'critDamage'],
    wand: ['attack', 'manaRegen', 'critChance', 'cdr'],
    dagger: ['attack', 'attackSpeed', 'critChance', 'lifesteal'],
    greatsword: ['attack', 'hp', 'defense', 'lifesteal'],
    staff: ['attack', 'mana', 'manaRegen', 'cdr'],
    bow: ['attack', 'attackSpeed', 'critChance', 'critDamage'],
    warhammer: ['attack', 'hp', 'mana', 'lifesteal']
};
                
                // Number of stats based on rarity
const statCount = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 4,
    mythic: 4
};
                
// Stat value ranges (base values that scale with level)
                // Lower bases and slower scaling for longer progression
                // Weapon-specific ranges will override these defaults
                const statRanges = {
    // Core stats - slower growth
    attack: { min: 0.5, max: 3 },
    hp: { min: 4, max: 12.5 },
    mana: { min: 2.5, max: 7.5 },
    defense: { min: 1, max: 4 },
    
    // Secondary stats - moderate growth
    attackSpeed: { min: 0.025, max: 0.09 },
    critChance: { min: 0.5, max: 3 },
    
    // Late-game stats - slow growth
    critDamage: { min: 2, max: 8 },
    dodgeChance: { min: 1, max: 3 },
    lifesteal: { min: 0.5, max: 2 },
    cdr: { min: 0.5, max: 3 },
    
    // Regen stats - flat values (stat ÷ 2 = regen per 3 seconds)
    hpRegen: { min: 2.5, max: 15 },         // 1.25-7.5 HP per 3 seconds
    manaRegen: { min: 5, max: 25 }        // 2.5-12.5 mana per 3 seconds
};
                
                // Get appropriate stat pool
                let pool = statPools[type] || statPools.ring;
                
                // Select random stats from pool - only pick stats that have valid ranges
                const numStats = statCount[rarity];
                const validPool = pool.filter(stat => statRanges[stat]);
                
                // Shuffle and take the required number
                const shuffled = [...validPool].sort(() => Math.random() - 0.5);
                const selectedStats = shuffled.slice(0, Math.min(numStats, validPool.length));
                
                // If we still need more stats, allow duplicates from valid pool
                while (selectedStats.length < numStats && validPool.length > 0) {
                    const randomStat = validPool[Math.floor(Math.random() * validPool.length)];
                    if (!selectedStats.includes(randomStat)) {
                        selectedStats.push(randomStat);
                    }
                }
                
                // Assign stat values
selectedStats.forEach(stat => {
    let range = statRanges[stat];
    
    // Weapon-specific stat range overrides - ALL weapons get attack bonuses
    if (stat === 'attack') {
        if (type === 'dagger') {
            range = { min: 1, max: 9 }; // High attack (80% bonus) - Fast assassin
        } else if (type === 'greatsword') {
            range = { min: 1, max: 7 }; // Decent attack (40% bonus) - Tank weapon
        } else if (type === 'wand') {
            range = { min: 1, max: 8 }; // Good attack (60% bonus) - AOE caster
        } else if (type === 'staff') {
            range = { min: 1, max: 7 }; // Decent attack (40% bonus) - Healer weapon
        } else if (type === 'bow') {
            range = { min: 1, max: 8.5 }; // Good attack (70% bonus) - Ranged DPS
        } else if (type === 'warhammer') {
            range = { min: 1, max: 7.5 }; // Good attack (50% bonus) - Holy warrior
        }
    }
    
    // Keep existing special stat bonuses
    if (type === 'greatsword' && stat === 'hp') {
        range = { min: 8, max: 40 }; // +60% hp ceiling
    }
    if (type === 'warhammer' && stat === 'hp') {
        range = { min: 7, max: 35 }; // +40% hp ceiling - Slightly less tanky than greatsword
    }
    if (type === 'staff' && stat === 'mana') {
        range = { min: 5, max: 25 }; // +67% mana ceiling
    }
    if (type === 'warhammer' && stat === 'mana') {
        range = { min: 3.5, max: 12.5 }; // +25% mana ceiling - Helps with keystones
    }
    
    // Mana regen nerf - 60% reduction for staffs, wands, and amulets
    if (stat === 'manaRegen' && (type === 'staff' || type === 'wand' || type === 'amulet')) {
        range = { min: 4, max: 20 }; // 60% nerf from 10-50
    }
    
    // EXPONENTIAL SCALING: Level is now the DOMINANT factor
    // 1.018^level = ~1.8% compound growth per level
    // Cap stat scaling at level 100 to prevent Divine Arena items from being absurdly overpowered
    const effectiveLevel = Math.min(level, 100);
    const levelScaling = Math.pow(1.018, effectiveLevel);
    
    if (rarity === 'legendary') {
        // Legendary = perfect max values
        this[stat] = Math.round(range.max * levelScaling * 100) / 100;
    } else if (rarity === 'mythic') {
        // Mythic = perfect max values (200% will be applied to one stat after loop)
        this[stat] = Math.round(range.max * levelScaling * 100) / 100;
    } else {
        // Random value in range with rarity-based minimum guarantees
        const rangeSize = range.max - range.min;
        
        // Rarity guarantees - minimum % of max roll
        let minRollPercent = 0; // Common/Uncommon: 0-100% of range
        if (rarity === 'rare') {
            minRollPercent = 0.50; // Rare: 50-100% of range
        } else if (rarity === 'epic') {
            minRollPercent = 0.70; // Epic: 70-100% of range
        }
        
        const guaranteedMin = range.min + (rangeSize * minRollPercent);
        const guaranteedRange = range.max - guaranteedMin;
        const value = guaranteedMin + Math.random() * guaranteedRange;
        
        this[stat] = Math.round(value * levelScaling * 100) / 100;
    }
});

// Mythic: Double random stat(s) based on weighted chances (200% instead of 100%)
if (rarity === 'mythic' && selectedStats.length > 0) {
    const roll = Math.random() * 100;
    let numMythicStats = 1; // Default: 1 stat at 200%
    
    if (roll < 1) {
        // 1% chance: ALL 4 stats at 200%
        numMythicStats = 4;
    } else if (roll < 5) {
        // 4% chance: 3 stats at 200%
        numMythicStats = 3;
    } else if (roll < 15) {
        // 10% chance: 2 stats at 200%
        numMythicStats = 2;
    }
    // else 85% chance: 1 stat at 200%
    
    // Randomly select which stats to make mythic
    const shuffledStats = [...selectedStats].sort(() => Math.random() - 0.5);
    const mythicStats = shuffledStats.slice(0, numMythicStats);
    
    // Double the selected stats
    mythicStats.forEach(stat => {
        this[stat] = Math.round(this[stat] * 2 * 100) / 100;
    });
    
    // Track which stats are mythic (for tooltip display)
    if (mythicStats.length === 1) {
        this.mythicStat = mythicStats[0]; // Single stat - keep old property for compatibility
    } else {
        this.mythicStats = mythicStats; // Multiple stats - use array
    }
}


                // Set name: "Lvl X [Rarity] [Slot]"
                const slotNames = {
                    helmet: 'Helmet',
                    gloves: 'Gloves',
                    belt: 'Belt',
                    chest: 'Chestplate',
                    boots: 'Boots',
                    amulet: 'Amulet',
                    ring: 'Ring',
                    wand: 'Wand',
                    dagger: 'Dagger',
                    greatsword: 'Greatsword',
                    staff: 'Staff',
                    bow: 'Bow',
                    warhammer: 'Warhammer',
                    weapon: 'Weapon'
                };
                
                const rarityNames = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic'
};

// Check if this is a Perfect Mythic (all 4 stats at 200%)
let rarityDisplayName = rarityNames[rarity];
if (rarity === 'mythic' && this.mythicStats && this.mythicStats.length === 4) {
    rarityDisplayName = 'Perfect Mythic';
    this.isPerfectMythic = true; // Flag for special handling
}

this.name = `Lvl ${level} ${rarityDisplayName} ${slotNames[type]}`;
                
                this.name = `Lvl ${level} ${rarityNames[rarity]} ${slotNames[type]}`;
                
                // Normalize weapon type to 'weapon' for equipment slot
                if (['wand', 'dagger', 'greatsword', 'staff', 'bow', 'warhammer'].includes(type)) {
                    this.type = 'weapon';
                    this.weaponType = type;
                }
            }
            
getStatsDisplay() {
                const stats = [];
                if (this.attack) stats.push(`ATK +${this.attack}`);
                if (this.attackSpeed) stats.push(`ATK SPD +${this.attackSpeed}`);
                if (this.hp) stats.push(`HP +${this.hp}`);
                if (this.mana) stats.push(`MANA +${this.mana}`);
                if (this.defense) stats.push(`DEF +${this.defense}`);
                if (this.critChance) stats.push(`CRIT +${this.critChance}%`);
                if (this.critDamage) stats.push(`CRIT DMG +${this.critDamage}%`);
                if (this.dodgeChance) stats.push(`DODGE +${this.dodgeChance}%`);
                if (this.lifesteal) stats.push(`LIFESTEAL +${this.lifesteal}%`);
                if (this.hpRegen) stats.push(`HP REGEN +${this.hpRegen}`);
if (this.manaRegen) stats.push(`MANA REGEN +${this.manaRegen}`);
                if (this.cdr) stats.push(`CDR +${this.cdr}%`);
                
                // Add blessed status
                if (this.blessed) {
                    stats.push(`✨ BLESSED`);
                }
                
                return stats.join(', ');
            }
        }
        
        window.Item = Item;

