import { readFileSync, writeFileSync } from 'node:fs';

const everfall = readFileSync('everfall/index.html', 'utf-8').split('\n');
let bodyMarkup = everfall.slice(2958, 3784).join('\n'); // lines 2959..3784 inclusive

// Phase 2 branding/dungeon-name swaps. Applied to body markup so re-extraction
// from the everfall source produces the same Heroes of Jormiah output.
const REPLACEMENTS = [
  ['letter-spacing: 1px;">EVERFALL 2</div>', 'letter-spacing: 1px;">HEROES OF JORMIAH</div>'],
  ['font-weight: 900;">EVERFALL 2</h2>', 'font-weight: 900;">HEROES OF JORMIAH</h2>'],
  ['>Idle Dungeon RPG<', '>Idle ARPG Party<'],
  ['>⚔️ Everfall<', '>🌿 The Hollowed Wilds<'],
  ['>🔥 Stoneforge<', '>🛡️ The Iron Vaults<'],
  ['>🌑 Umbral Depths<', '>🔮 The Whispering Spires<'],
  ['rgba(0, 0, 0, 0.9);">Everfall</div>', 'rgba(0, 0, 0, 0.9);">The Hollowed Wilds</div>'],
  ['rgba(0, 0, 0, 0.9);">Stoneforge</div>', 'rgba(0, 0, 0, 0.9);">The Iron Vaults</div>'],
  ['rgba(0, 0, 0, 0.9);">Umbral Depths</div>', 'rgba(0, 0, 0, 0.9);">The Whispering Spires</div>'],
  ['font-weight: 600;">Everfall:</span>', 'font-weight: 600;">Hollowed Wilds:</span>'],
  ['font-weight: 600;">Stoneforge:</span>', 'font-weight: 600;">Iron Vaults:</span>'],
  ['font-weight: 600;">Umbral:</span>', 'font-weight: 600;">Whispering Spires:</span>'],
  // Phase 3: 4-party → 6-party with 2x3 formation per GDD §5.1.
  // Old slot 2/3 ("Back") become new slot 3/4; new slot 2 (Front) and 5 (Back) added.
  [
    `<div class="party-slot" data-slot="2">
                <div class="slot-number">Slot 3 - Back</div>
                <div class="slot-icon">?</div>
                <div class="slot-name">Empty</div>
            </div>
            <div class="party-slot" data-slot="3">
                <div class="slot-number">Slot 4 - Back</div>
                <div class="slot-icon">?</div>
                <div class="slot-name">Empty</div>
            </div>`,
    `<div class="party-slot" data-slot="2">
                <div class="slot-number">Slot 3 - Front</div>
                <div class="slot-icon">?</div>
                <div class="slot-name">Empty</div>
            </div>
            <div class="party-slot" data-slot="3">
                <div class="slot-number">Slot 4 - Back</div>
                <div class="slot-icon">?</div>
                <div class="slot-name">Empty</div>
            </div>
            <div class="party-slot" data-slot="4">
                <div class="slot-number">Slot 5 - Back</div>
                <div class="slot-icon">?</div>
                <div class="slot-name">Empty</div>
            </div>
            <div class="party-slot" data-slot="5">
                <div class="slot-number">Slot 6 - Back</div>
                <div class="slot-icon">?</div>
                <div class="slot-name">Empty</div>
            </div>`,
  ],
  ['SELECT 4 HEROES', 'SELECT 6 HEROES'],
  // Phase 6: GDD §10.1 dungeon-loot specialty swaps. The original everfall
  // (now Hollowed Wilds) source labelled itself as armor; per GDD that
  // specialty belongs to the Iron Vaults (formerly stoneforge) and weapons
  // belong to Hollowed Wilds.
  [
    `<div class="dungeon-option everfall" data-dungeon="everfall">
                        <div class="dungeon-title">🌿 The Hollowed Wilds</div>
                        <div class="dungeon-loot">Drops: Chests, Helmets, Gloves, Belts, Boots</div>
                    </div>
                    <div class="dungeon-option stoneforge" data-dungeon="stoneforge">
                        <div class="dungeon-title">🛡️ The Iron Vaults</div>
                        <div class="dungeon-loot">Drops: Weapons</div>
                    </div>`,
    `<div class="dungeon-option everfall" data-dungeon="everfall">
                        <div class="dungeon-title">🌿 The Hollowed Wilds</div>
                        <div class="dungeon-loot">Drops: Weapons</div>
                    </div>
                    <div class="dungeon-option stoneforge" data-dungeon="stoneforge">
                        <div class="dungeon-title">🛡️ The Iron Vaults</div>
                        <div class="dungeon-loot">Drops: Helmets, Chestplates, Gloves, Belts, Boots</div>
                    </div>`,
  ],
  [
    `<div class="dungeon-card-loot" style="color: #fff; text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.9);">Drops: Chests, Helmets, Gloves, Belts, Boots</div>`,
    `<div class="dungeon-card-loot" style="color: #fff; text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.9);">Drops: Weapons</div>`,
  ],
  [
    // The 2nd "Drops: Weapons" entry under stoneforge becomes armor.
    `style="background-image: url('https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/stoneforge.jpg'); background-size: cover; background-position: center;">
                                <div class="dungeon-card-title" style="text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);">The Iron Vaults</div>
                                <div class="dungeon-card-loot" style="color: #fff; text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.9);">Drops: Weapons</div>`,
    `style="background-image: url('https://raw.githubusercontent.com/Graphic37/RPG-Dungeon-Simulator/main/stoneforge.jpg'); background-size: cover; background-position: center;">
                                <div class="dungeon-card-title" style="text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);">The Iron Vaults</div>
                                <div class="dungeon-card-loot" style="color: #fff; text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.9);">Drops: Helmets, Chestplates, Gloves, Belts, Boots</div>`,
  ],
];
for (const [from, to] of REPLACEMENTS) {
  if (!bodyMarkup.includes(from)) {
    console.warn(`WARNING: replacement source not found: ${from.slice(0, 60)}...`);
  }
  bodyMarkup = bodyMarkup.split(from).join(to);
}

const header = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Heroes of Jormiah</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="src/styles/main.css">
<!-- Steam-only build - Firebase removed -->
</head>
`;

const scripts = [
  'src/core/preloader.js',
  'src/core/configs.js',
  'src/world/dungeon_layout.js',
  'src/world/character_sprite.js',
  'src/world/dungeon_room.js',
  'src/entities/character.js',
  'src/entities/passive_tree.js',
  'src/entities/character_classes.js',
  'src/entities/item.js',
  'src/entities/effects.js',
  'src/entities/class_registry.js',
  'src/ui/tree_view.js',
  'src/entities/enemy.js',
  'src/entities/boss.js',
  'src/entities/pet.js',
  'src/entities/keystone_item.js',
  'src/entities/rune_item.js',
  'src/core/managers.js',
  'src/core/save_constants.js',
  'src/game/game.js',
  'src/game/post_game.js',
  'src/boot.js',
];

const scriptTags = scripts.map(s => `    <script src="${s}"></script>`).join('\n');

const footer = `
${scriptTags}
</body>
</html>
`;

writeFileSync('index.html', header + bodyMarkup + footer);
console.log('index.html written');
