// Cross-checks the content tables: every id a monster, area, action or shop
// refers to must exist. Run it after editing anything in src/data/.
//
//   node tools/check-data.mjs
import { ITEMS } from '../src/data/items.js';
import { MONSTERS } from '../src/data/monsters.js';
import { AREAS } from '../src/data/areas.js';
import { ACTIONS } from '../src/data/actions.js';
import { SHOPS } from '../src/data/shops.js';
import { SPELLS } from '../src/data/spells.js';
import { SKILLS } from '../src/data/skills.js';
import { VOCATIONS, CHOOSABLE } from '../src/data/vocations.js';

const problems = [];
const item = (id, where) => {
  if (!ITEMS[id]) problems.push(`${where}: unknown item "${id}"`);
};

for (const m of Object.values(MONSTERS)) {
  for (const drop of m.loot) item(drop.item, `monster ${m.id}`);
  if (m.hp <= 0 || m.exp < 0) problems.push(`monster ${m.id}: nonsense hp/exp`);
  if (m.min > m.max) problems.push(`monster ${m.id}: min damage above max`);
}

for (const area of AREAS) {
  for (const [id] of area.spawns) {
    if (!MONSTERS[id]) problems.push(`area ${area.id}: unknown monster "${id}"`);
  }
  if (!area.spawns.length) problems.push(`area ${area.id}: no spawns`);
}

for (const [skillId, actions] of Object.entries(ACTIONS)) {
  if (!SKILLS[skillId]) problems.push(`actions: unknown skill "${skillId}"`);
  for (const action of actions) {
    for (const o of action.out) item(o.item, `action ${action.id}`);
    for (const i of action.inputs ?? []) item(i.item, `action ${action.id} input`);
    if (!action.out.length) problems.push(`action ${action.id}: produces nothing`);
  }
}

for (const shop of SHOPS) {
  for (const id of shop.stock) item(id, `shop ${shop.id}`);
}

for (const s of Object.values(SPELLS)) {
  for (const voc of s.voc) {
    if (!VOCATIONS[voc]) problems.push(`spell ${s.id}: unknown vocation "${voc}"`);
  }
}

for (const it of Object.values(ITEMS)) {
  if (it.type === 'rune' && !SPELLS[it.spell]) problems.push(`item ${it.id}: unknown spell "${it.spell}"`);
  if (it.ws && !SKILLS[it.ws]) problems.push(`item ${it.id}: unknown weapon skill "${it.ws}"`);
}

for (const id of CHOOSABLE) {
  if (!VOCATIONS[id]) problems.push(`vocations: choosable "${id}" does not exist`);
}

// Warn about content nobody can reach.
const spawned = new Set(AREAS.flatMap((a) => a.spawns.map(([id]) => id)));
const orphans = Object.keys(MONSTERS).filter((id) => !spawned.has(id));
if (orphans.length) console.warn(`note: monsters in no area: ${orphans.join(', ')}`);

if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`data ok — ${Object.keys(ITEMS).length} items, ${Object.keys(MONSTERS).length} monsters, ${AREAS.length} areas, ${Object.values(ACTIONS).flat().length} actions`);
