const FILES = [
  'classes', 'abilities', 'dungeons', 'families',
  'formulas', 'rarity', 'slots', 'sprite_mapping', 'starter_classes',
  'tree'
];

export async function loadGameData() {
  const out = {};
  await Promise.all(FILES.map(async name => {
    const res = await fetch(`./data/${name}.json`);
    if (!res.ok) throw new Error(`Failed to load data/${name}.json: ${res.status}`);
    out[name] = await res.json();
  }));
  out.classesById = Object.fromEntries(out.classes.classes.map(c => [c.id, c]));
  out.abilitiesById = out.abilities.abilities;
  out.familiesById = Object.fromEntries(out.families.families.map(f => [f.id, f]));
  out.dungeonsById = Object.fromEntries(out.dungeons.dungeons.map(d => [d.id, d]));
  out.slotsById = Object.fromEntries(out.slots.slots.map(s => [s.id, s]));
  out.treeNodesById = Object.fromEntries((out.tree.nodes ?? []).map(n => [n.id, n]));
  return out;
}
