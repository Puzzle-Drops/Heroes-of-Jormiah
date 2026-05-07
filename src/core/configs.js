const ROOM_TYPES = {
            ENTRANCE: 'entrance',
            NORMAL: 'normal',
            TREASURE: 'treasure',
            BOSS: 'boss',
            EMPTY: 'empty',
            PATHWAY: 'pathway',
            FOUNTAIN: 'fountain'
        };

        // Chest system constants
const CHEST_CONFIG = {
    DROP_CHANCE: 0.10,              // 10% chance per cleared floor (~1 every 10 floors)
    MYTHIC_CHEST_CHANCE: 0.10,      // 10% of chests are mythic (1% overall)
    OPEN_COST_MULTIPLIER: 500,      // Open cost = 500 × chest level
    MYTHIC_OPEN_COST_MULTIPLIER: 2500, // Mythic chest cost = 2500 × level
    SELL_VALUE_MULTIPLIER: 100,     // Sell value = 100 × chest level
    MYTHIC_SELL_VALUE_MULTIPLIER: 500, // Mythic sell value = 500 × level
    RARITY_DISTRIBUTION: {
        rare: 75,                    // 75% chance
        epic: 20,                    // 20% chance
        legendary: 5                 // 5% chance
    },
    MYTHIC_RARITY_DISTRIBUTION: {
        epic: 50,                    // 50% chance
        legendary: 49.9,             // 49.9% chance
        mythic: 0.1                  // 0.1% chance
    }
};

        // Keystone system constants
        const KEYSTONE_CONFIG = {
    DROP_CHANCE: 0.02,              // 2% chance per cleared floor
    DIFFICULTY_MULTIPLIER: 5,        // Vault enemies are 5x harder than normal
    RARITY_BOOST: {
        rare: 60,                    // 60% rare
        epic: 30,                    // 30% epic  
        legendary: 10                // 10% legendary (no common/uncommon)
    },
    RARITY_BOOST_LVL20: {
        rare: 59.9,                  // 59.9% rare
        epic: 30,                    // 30% epic  
        legendary: 10,               // 10% legendary
        mythic: 0.1                  // 0.1% mythic (Level 20 Vault only)
    }
};

// Vault Key system constants
const VAULT_KEY_CONFIG = {
    DROP_CHANCE: 0.10,             // 10% chance per cleared floor to find a key
    MAX_KEY_LEVEL: 20,             // Keys cap at level 20
    GOLD_PER_LEVEL: 200            // 200 gold per vault level
};

// Rune Trial Key system constants
const RUNE_TRIAL_KEY_CONFIG = {
    DROP_CHANCE: 0.10,             // 10% chance per cleared floor
    MIN_DROP_FLOOR: 45,            // Keys only start dropping after floor 45
    MAX_KEY_LEVEL: 5,              // Only 5 levels of keys
    RECOMMENDED_FLOORS: { 1: 50, 2: 60, 3: 70, 4: 80, 5: 90 }
};

// Rune Trial Dungeon constants
const RUNE_TRIAL_CONFIG = {
    LOOT_RARITY: { 
        rare: 50, 
        epic: 40, 
        legendary: 10 
    },
    LOOT_RARITY_TIER5: {
        rare: 49.9,
        epic: 40,
        legendary: 10,
        mythic: 0.1  // 0.1% mythic drop chance for Tier 5 only
    },
    LOOT_LEVEL_RANGE: { 1: {min: 50, max: 60}, 2: {min: 60, max: 70}, 3: {min: 70, max: 80}, 4: {min: 80, max: 90}, 5: {min: 90, max: 100} },
    ABILITY_RUNE_CHANCE: 0.40, // 40% ability rune, 60% stat rune
    BOSS_SCALING: { 1: 3.5, 2: 5.5, 3: 7.5, 4: 9.5, 5: 11.6 }
};

        // Vault boss scaling formulas
        const VAULT_SCALER = {
    bossHP:   L => 5000 * L,      // UNCHANGED
    bossATK:  L => 7 * L,         // BUFFED +40%
    bossDEF:  L => 16 * L,        // BUFFED +33%
    si:       L => Math.max(2.4, 4.0 - 0.08*L),  // seconds between summons (after first)
    cap:      L => 4 + Math.floor(L / 7),
    houndHP:  L => 120 * L,
    houndATK: L => 3 * L,
    houndDEF: L => 5 * L,
    houndAS:  1.0
};

        // Isometric helpers with smaller tile size for larger rooms
        const ISO = {
            tileWidth: 48,
            tileHeight: 24,
            toScreen(x, y) {
                return {
                    x: (x - y) * (this.tileWidth / 2),
                    y: (x + y) * (this.tileHeight / 2)
                };
            },
            fromScreen(x, y) {
                return {
                    x: (x / (this.tileWidth / 2) + y / (this.tileHeight / 2)) / 2,
                    y: (y / (this.tileHeight / 2) - x / (this.tileWidth / 2)) / 2
                };
            }
        };

