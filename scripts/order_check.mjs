// Each top-level class/const declaration must be in a file loaded
// no later than any file that references it from top-level code
// (i.e. not inside a function body where the lookup happens at call time).
// References inside class methods / function bodies are fine — they resolve
// at call time, by which point everything is loaded.

import { readFileSync } from 'node:fs';

const FILES = [
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
  'src/ui/roster_browser.js',
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

const declaredAt = new Map(); // name -> file index

for (let i = 0; i < FILES.length; i++) {
  const txt = readFileSync(FILES[i], 'utf-8');
  // Top-level class/let/const/function/var declarations
  const classRe  = /^\s*class\s+([A-Z]\w+)/gm;
  const constRe  = /^\s*(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\b/gm;
  let m;
  while ((m = classRe.exec(txt))) declaredAt.set(m[1], i);
  while ((m = constRe.exec(txt))) {
    if (!declaredAt.has(m[1])) declaredAt.set(m[1], i);
  }
}

// Find top-level (non-method, non-function-body) usages.
// Cheap heuristic: any line whose indentation level is 0 OR has a class/const
// declaration referencing another name. We're really only looking for
// `class X extends Y` and top-level `new X()` etc. before X is loaded.
const issues = [];

for (let i = 0; i < FILES.length; i++) {
  const txt = readFileSync(FILES[i], 'utf-8');
  const lines = txt.split('\n');

  // class X extends Y -- Y must be declared in a file <= i
  for (const line of lines) {
    const m = /class\s+([A-Z]\w+)\s+extends\s+([A-Z]\w+)/.exec(line);
    if (m) {
      const parent = m[2];
      const at = declaredAt.get(parent);
      if (at === undefined) {
        issues.push(`${FILES[i]}: class ${m[1]} extends ${parent} — ${parent} never declared`);
      } else if (at > i) {
        issues.push(`${FILES[i]}: class ${m[1]} extends ${parent} — ${parent} declared later in ${FILES[at]}`);
      }
    }
  }
}

console.log(`Top-level declarations indexed: ${declaredAt.size}`);
console.log(`Forward-reference issues: ${issues.length}`);
if (issues.length) {
  console.log('\nIssues:');
  for (const s of issues) console.log(`  ${s}`);
}
process.exit(issues.length > 0 ? 1 : 0);
