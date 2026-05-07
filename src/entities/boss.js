class Boss extends Character {
    constructor(floor, bossType, dungeonTheme) {
        // Boss stats by dungeon
        const bossStats = {
            everfall: {
                red_stag:     { hp: 180, atk: 16, def: 8,  atkSpd: 0.9, color: '#8b4513' },
                elder_treant: { hp: 250, atk: 12, def: 14, atkSpd: 0.5, color: '#2f4f2f' }
            },
            stoneforge: {
                foundry_master:  { hp: 200, atk: 18, def: 10, atkSpd: 0.7, color: '#ff4500' },
                colossus_of_iron: { hp: 300, atk: 20, def: 16, atkSpd: 0.4, color: '#708090' }
            },
            umbral: {
                night_herald: { hp: 160, atk: 22, def: 6,  atkSpd: 1.1, color: '#4b0082' },
                maw_of_deep:  { hp: 220, atk: 19, def: 11, atkSpd: 0.8, color: '#191970' }
            }
        };
        
        // Get boss stats
        const stats = bossStats[dungeonTheme]?.[bossType] || { hp: 200, atk: 18, def: 10, atkSpd: 0.7, color: '#ff0000' };
        
        // Boss HP is 6x common enemy HP (using same logarithmic formula)
const hpScaling = Math.floor((50 + (floor * 30) + (floor * floor * 1.2) + (Math.log(floor + 1) * 90)) * 6);
        
        // Boss attack scaling - slower growth until floor 50, then aggressive
let atkScaling;
if (floor <= 50) {
    // Floors 1-50: Modest buff
    atkScaling = Math.floor(10 + (floor * 1.8) + (floor * floor * 0.010));
} else {
    // Floor 50+: Modest endgame buff
    atkScaling = Math.floor(120 + (floor - 50) * 3.0);
}
        
        super(
    bossType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    'Boss',
    floor,
    hpScaling,
    100,
    atkScaling,
    Math.min(Math.floor((4 + (floor * 1.0) + (floor * floor * 0.005)) * 1.5), 200), // Boss defense caps at 200 at floor 90
    stats.atkSpd
);
        
        this.color = stats.color;
        this.xpReward = Math.floor(this.maxHp / 10);
        this.goldReward = floor * 10;
        this.isBoss = true;
        this.isBig = true; // Make bosses render 2x larger
        this.renderScale = 2.0; // Explicit 2x rendering scale for floor bosses
    }
}
