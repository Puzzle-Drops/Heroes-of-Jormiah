// Verify every non-trivial line of everfall script content ended up in a module.
// "Non-trivial" = anything that isn't pure whitespace or a comment-only line.

import { readFileSync } from 'node:fs';

const everfall = readFileSync('everfall/index.html', 'utf-8').split('\n');

const slices = [
  { file: 'src/core/preloader.js',          start: 3787, end: 3935 },
  { file: 'src/core/configs.js',            start: 3937, end: 4047 },
  { file: 'src/world/dungeon_layout.js',    start: 4049, end: 4206 },
  { file: 'src/world/character_sprite.js',  start: 4208, end: 7536 },
  { file: 'src/world/dungeon_room.js',      start: 7538, end: 7672 },
  { file: 'src/entities/character.js',      start: 7674, end: 8203 },
  { file: 'src/entities/character_classes.js', start: 8205, end: 8550 },
  { file: 'src/entities/enemy.js',          start: 8552, end: 8723 },
  { file: 'src/entities/boss.js',           start: 8725, end: 8777 },
  { file: 'src/entities/pet.js',            start: 8779, end: 8919 },
  { file: 'src/entities/item.js',           start: 8921, end: 9176 },
  { file: 'src/entities/keystone_item.js',  start: 9178, end: 9472 },
  { file: 'src/entities/rune_item.js',      start: 9474, end: 9609 },
  { file: 'src/core/managers.js',           start: 9616, end: 9719 },
  { file: 'src/core/save_constants.js',     start: 9723, end: 9740 },
  { file: 'src/game/game.js',               start: 9741, end: 26646 },
  { file: 'src/game/post_game.js',          start: 26648, end: 28798 },
  // skip 28799 = </script>, 28800 = blank, 28801 = <script>
  { file: 'src/boot.js',                    start: 28802, end: 29559 },
];

const SCRIPT_START = 3786; // line after <script>
const SCRIPT_END = 29559;  // line before final </script>

const covered = new Set();
for (const s of slices) {
  for (let i = s.start; i <= s.end; i++) covered.add(i);
}

// Mark the script tag boundaries themselves as ignored
covered.add(28799); covered.add(28800); covered.add(28801);

const isTrivial = (line) => {
  const t = line.trim();
  if (t === '') return true;
  if (t.startsWith('//')) return true;
  if (t === '/*' || t === '*/' || t.startsWith('* ')) return true;
  return false;
};

const orphans = [];
for (let ln = SCRIPT_START; ln <= SCRIPT_END; ln++) {
  if (covered.has(ln)) continue;
  const text = everfall[ln - 1] ?? '';
  if (!isTrivial(text)) {
    orphans.push({ ln, text: text.slice(0, 120) });
  }
}

console.log(`Total script lines: ${SCRIPT_END - SCRIPT_START + 1}`);
console.log(`Lines covered by modules: ${covered.size - 3}`);
console.log(`Uncovered non-trivial lines: ${orphans.length}`);
if (orphans.length) {
  console.log('\nUncovered code lines (first 30):');
  for (const o of orphans.slice(0, 30)) {
    console.log(`  ${o.ln}: ${o.text}`);
  }
}
process.exit(orphans.length > 0 ? 1 : 0);
