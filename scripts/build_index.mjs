import { readFileSync, writeFileSync } from 'node:fs';

const everfall = readFileSync('everfall/index.html', 'utf-8').split('\n');
const bodyMarkup = everfall.slice(2958, 3784).join('\n'); // lines 2959..3784 inclusive

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
  'src/entities/character_classes.js',
  'src/entities/enemy.js',
  'src/entities/boss.js',
  'src/entities/pet.js',
  'src/entities/item.js',
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
