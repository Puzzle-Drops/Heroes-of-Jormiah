class Enemy extends Character {
    constructor(type, dungeonLevel, dungeonTheme, isTreasureGuardian = false) {
        // Treasure Guardian - special enemy for treasure rooms
if (isTreasureGuardian) {
    const hp = dungeonLevel * 1000;
    const attack = Math.floor(7 + (dungeonLevel * 2.8));
            
            super(
                'Treasure Guardian',
                'Enemy',
                dungeonLevel,
                hp,
                20,
                attack,
                Math.min(Math.floor(4 + (dungeonLevel * 1.0) + (dungeonLevel * dungeonLevel * 0.005)), 140),
                0.8 // Slightly slower attack speed
            );
            
            this.color = '#f59e0b'; // Golden color for treasure guardians
            this.xpReward = dungeonLevel * 100; // Flat 100 XP per level
            this.goldReward = dungeonLevel * 200; // Already set in spawnEnemies, but kept here for consistency
            this.isTreasureGuardian = true;
            this.isBoss = true; // Mark as boss to guarantee loot drop
            this.isBig = true; // Set to true for 2x size rendering
            return;
        }
        
        // Dungeon-specific enemy pools
const everfallEnemies = {
            forest_wolf:      { hpMult: 1.0,  atkMult: 0.9,  defMult: 1.0,  atkSpd: 1.3, color: '#8b7355', archetype: 'Fast' },
            bandit_cutthroat: { hpMult: 1.1,  atkMult: 1.3,  defMult: 0.8,  atkSpd: 1.1, color: '#6b4423', archetype: 'DPS' },
            moss_boar:        { hpMult: 1.5,  atkMult: 0.7,  defMult: 1.4,  atkSpd: 0.7, color: '#6b8e23', archetype: 'Tank' },
            hollow_stag:      { hpMult: 1.0,  atkMult: 1.0,  defMult: 1.0,  atkSpd: 1.0, color: '#d2691e', archetype: 'Balanced' },
            rotting_treant:   { hpMult: 1.8,  atkMult: 0.6,  defMult: 1.6,  atkSpd: 0.6, color: '#556b2f', archetype: 'Ultra Tank' },
            briar_spider:     { hpMult: 0.7,  atkMult: 1.2,  defMult: 0.7,  atkSpd: 1.4, color: '#2f4f2f', archetype: 'Glass Cannon' },
            fallen_scout:     { hpMult: 0.8,  atkMult: 0.8,  defMult: 0.9,  atkSpd: 1.2, color: '#8fbc8f', archetype: 'Weak' },
            autumn_wisp:      { hpMult: 0.6,  atkMult: 1.4,  defMult: 0.6,  atkSpd: 1.5, color: '#ff8c00', archetype: 'Assassin' }
        };
        
        const stoneforgeEnemies = {
            forge_golem:      { hpMult: 2.0,  atkMult: 0.7,  defMult: 1.8,  atkSpd: 0.5, color: '#808080', archetype: 'Ultra Tank' },
            ember_sprite:     { hpMult: 0.6,  atkMult: 1.5,  defMult: 0.6,  atkSpd: 1.6, color: '#ff4500', archetype: 'Assassin' },
            tunnel_rat:       { hpMult: 0.7,  atkMult: 1.0,  defMult: 0.8,  atkSpd: 1.4, color: '#696969', archetype: 'Fast Weak' },
            quarry_brute:     { hpMult: 1.5,  atkMult: 1.2,  defMult: 1.3,  atkSpd: 0.7, color: '#8b4513', archetype: 'Heavy Hitter' },
            anvil_guard:      { hpMult: 1.7,  atkMult: 0.8,  defMult: 1.6,  atkSpd: 0.6, color: '#708090', archetype: 'Defender' },
            smelter_imp:      { hpMult: 0.9,  atkMult: 1.1,  defMult: 0.9,  atkSpd: 1.2, color: '#dc143c', archetype: 'Balanced DPS' },
            oreback_beetle:   { hpMult: 1.3,  atkMult: 0.7,  defMult: 1.5,  atkSpd: 0.8, color: '#a0522d', archetype: 'Tank' },
            molten_slime:     { hpMult: 1.0,  atkMult: 0.9,  defMult: 1.0,  atkSpd: 0.9, color: '#ff6347', archetype: 'Balanced' }
        };
        
        const umbralEnemies = {
            shade:            { hpMult: 0.8,  atkMult: 1.1,  defMult: 0.8,  atkSpd: 1.3, color: '#8b7bc8', archetype: 'Fast' },
            gloomling:        { hpMult: 1.0,  atkMult: 0.9,  defMult: 1.1,  atkSpd: 1.1, color: '#9d8cd4', archetype: 'Defensive' },
            night_stalker:    { hpMult: 1.2,  atkMult: 1.3,  defMult: 0.9,  atkSpd: 1.2, color: '#a855f7', archetype: 'DPS' },
            void_mite:        { hpMult: 0.6,  atkMult: 0.8,  defMult: 0.6,  atkSpd: 1.5, color: '#7c6baa', archetype: 'Swarm' },
            abyssal_leech:    { hpMult: 1.1,  atkMult: 1.0,  defMult: 1.2,  atkSpd: 1.0, color: '#b084cc', archetype: 'Balanced Tank' },
            umbral_wisp:      { hpMult: 0.7,  atkMult: 1.4,  defMult: 0.6,  atkSpd: 1.4, color: '#c4b5fd', archetype: 'Glass Cannon' },
            dread_bat:        { hpMult: 0.9,  atkMult: 1.1,  defMult: 0.8,  atkSpd: 1.3, color: '#a78bfa', archetype: 'Fast DPS' },
            hollow_cultist:   { hpMult: 1.4,  atkMult: 0.9,  defMult: 1.4,  atkSpd: 0.9, color: '#9f7aea', archetype: 'Tank' }
        };
        
        // ENDLESS BLESSINGS - EPIC LARGE MONSTERS (Treasure Guardian Scale)
        const endlessEnemies = {
            titan_colossus:        { hpMult: 2.2,  atkMult: 1.1,  defMult: 1.9,  atkSpd: 0.6, color: '#4a5568', archetype: 'Ultra Tank' },
            infernal_behemoth:     { hpMult: 1.8,  atkMult: 1.4,  defMult: 1.3,  atkSpd: 0.8, color: '#dc2626', archetype: 'Heavy Hitter' },
            frost_leviathan:       { hpMult: 2.0,  atkMult: 1.2,  defMult: 1.6,  atkSpd: 0.7, color: '#3b82f6', archetype: 'Ice Tank' },
            chaos_juggernaut:      { hpMult: 1.9,  atkMult: 1.3,  defMult: 1.5,  atkSpd: 0.7, color: '#a855f7', archetype: 'Chaos Warrior' },
            void_dreadnought:      { hpMult: 2.1,  atkMult: 1.0,  defMult: 1.8,  atkSpd: 0.6, color: '#1e1b4b', archetype: 'Void Tank' },
            storm_ravager:         { hpMult: 1.7,  atkMult: 1.5,  defMult: 1.2,  atkSpd: 0.9, color: '#fbbf24', archetype: 'Storm DPS' },
            plague_abomination:    { hpMult: 2.0,  atkMult: 1.1,  defMult: 1.7,  atkSpd: 0.6, color: '#16a34a', archetype: 'Plague Tank' },
            crimson_tyrant:        { hpMult: 1.8,  atkMult: 1.4,  defMult: 1.4,  atkSpd: 0.8, color: '#991b1b', archetype: 'Blood Lord' },
            arcane_devastator:     { hpMult: 1.6,  atkMult: 1.6,  defMult: 1.1,  atkSpd: 1.0, color: '#8b5cf6', archetype: 'Arcane Nuker' },
            shadow_overlord:       { hpMult: 1.9,  atkMult: 1.3,  defMult: 1.5,  atkSpd: 0.8, color: '#312e81', archetype: 'Shadow Lord' },
            molten_destroyer:      { hpMult: 2.0,  atkMult: 1.3,  defMult: 1.6,  atkSpd: 0.7, color: '#f97316', archetype: 'Molten Titan' },
            crystal_sentinel:      { hpMult: 2.2,  atkMult: 0.9,  defMult: 2.0,  atkSpd: 0.5, color: '#06b6d4', archetype: 'Crystal Fortress' }
        };
        
        // Select appropriate enemy pool based on dungeon
        let enemyPool;
        if (dungeonTheme === 'everfall') enemyPool = everfallEnemies;
        else if (dungeonTheme === 'stoneforge') enemyPool = stoneforgeEnemies;
        else if (dungeonTheme === 'umbral') enemyPool = umbralEnemies;
        else if (dungeonTheme === 'endlessblessings') enemyPool = endlessEnemies;
        else enemyPool = everfallEnemies; // Default
        
        const stats = enemyPool[type];

// Safety check - if enemy type doesn't exist, use a default
if (!stats) {
    console.error(`Enemy type "${type}" not found in ${dungeonTheme} dungeon!`);
    // Use first enemy from pool as fallback
    const fallbackType = Object.keys(enemyPool)[0];
    const fallbackStats = enemyPool[fallbackType];
    
    super(
        `Unknown Enemy`,
        'Enemy',
        dungeonLevel,
        50,
        20,
        Math.floor(8 * (0.9 + (dungeonLevel - 1) * 0.6)),
        5,
        1.0
    );
    this.color = '#ff0000';
    this.xpReward = 10;
    this.goldReward = dungeonLevel;
    return;
}
        
        // Logarithmic HP scaling - heavy buff for longer fights
const hpScaling = Math.floor(50 + (dungeonLevel * 30) + (dungeonLevel * dungeonLevel * 1.2) + (Math.log(dungeonLevel + 1) * 90));
        
        // Gentler attack scaling for floors 1-4, then moderate ramp up
let atkScaling;
if (dungeonLevel <= 5) {
    // Floors 1-5: Keep original (UNCHANGED)
    atkScaling = Math.floor(3 + (dungeonLevel * 1.2));
} else {
    // Floor 6+: Modest ATK buff
    const adjustedLevel = dungeonLevel - 5;
    atkScaling = Math.floor(8.5 + (adjustedLevel * 1.4) + (adjustedLevel * adjustedLevel * 0.014));
}
        // Calculate base stats
        let finalHp = Math.floor(hpScaling * (stats.hpMult || 1.0));
        let finalAttack = Math.floor(atkScaling * (stats.atkMult || 1.0));
        
        // Theme-specific scaling modifiers
        if (dungeonTheme === 'everfall') {
            // HP-focused: Tanky but weaker offense
            finalHp *= 1.15;           // +15% HP
            finalAttack *= 0.85;       // -15% Attack
        }
        else if (dungeonTheme === 'stoneforge') {
            // Attack-focused: Hard hitters but more fragile
            finalAttack *= 1.15;       // +15% Attack
            finalHp *= 0.85;           // -15% HP
        }
        else if (dungeonTheme === 'umbral') {
            // Numbers-focused: More enemies but individually weaker
            // (Enemy count: +2-5 handled in spawn function)
            finalHp *= 0.75;           // -25% HP
            finalAttack *= 0.75;       // -25% Attack
        }
        else if (dungeonTheme === 'endlessblessings') {
            // DIVINE ARENA: Ultra hard hitting, scales aggressively
            finalAttack *= 2.0;        // 2x Attack damage
            finalHp *= 1.3;            // +30% HP for longer fights
            // Additional scaling based on enemy level for harder progression
            const levelBonus = (dungeonLevel - 70) / 100; // 0 at level 70, 0.3 at level 100, etc
            if (levelBonus > 0) {
                finalAttack *= (1 + levelBonus * 0.5); // Extra 50% attack per 100 levels above 70
                finalHp *= (1 + levelBonus * 0.3);     // Extra 30% HP per 100 levels above 70
            }
        }
        
        super(
    type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    'Enemy',
    dungeonLevel,
    Math.floor(finalHp),
    20, // Mana doesn't matter for enemies
    Math.floor(finalAttack),
    Math.min(Math.floor((4 + (dungeonLevel * 1.0) + (dungeonLevel * dungeonLevel * 0.005)) * (stats.defMult || 1.0)), 200),
    stats.atkSpd
);
        
        this.color = stats.color;
        this.xpReward = Math.floor(this.maxHp / 10);
        this.goldReward = dungeonLevel;
    }
}
