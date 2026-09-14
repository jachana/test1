// Hunts every area with a representative character and prints what actually
// happens: experience, gold, deaths, potions drunk, and how far the hunting
// guide's prediction sits from the measurement.
//
//   node tools/balance.mjs            one simulated hour per area, per band
//   node tools/balance.mjs 3          three hours, for tighter numbers
//   node tools/balance.mjs 1 demona   just that area
//
// The gear ladder is what a character of that level could plausibly be wearing
// off their own loot and the shops they can reach, not a best-in-slot set.
import { createState, setState, S } from '../src/core/state.js';
import { tick } from '../src/core/engine.js';
import { startHunt, travelProblem } from '../src/systems/combat.js';
import { areaEstimate, exclusiveDrops } from '../src/systems/guide.js';
import { chooseVocation, maxHp, maxMp } from '../src/systems/player.js';
import { addItem } from '../src/systems/inventory.js';
import { AREAS } from '../src/data/areas.js';
import { getItem } from '../src/data/items.js';
import { sellPrice } from '../src/data/shops.js';
import { QUESTS } from '../src/data/quests.js';

// Gear a character of that level could plausibly be wearing off their own loot
// and the shops they can reach, not a best-in-slot set.
const LADDER = [
  { from: 1, gear: {} },
  { from: 6, gear: { weapon: 'sabre', armour: 'studded_armor', helmet: 'leather_helmet' } },
  { from: 12, gear: { weapon: 'battle_axe', armour: 'chain_armor', shield: 'brass_shield', helmet: 'brass_helmet', legs: 'chain_legs' } },
  { from: 25, gear: { weapon: 'double_axe', armour: 'plate_armor', shield: 'battle_shield', helmet: 'steel_helmet', legs: 'plate_legs' } },
  { from: 40, gear: { weapon: 'knight_axe', armour: 'plate_armor', shield: 'plate_shield', helmet: 'crown_helmet', legs: 'knight_legs', boots: 'leather_boots' } },
  { from: 60, gear: { weapon: 'giant_sword', armour: 'knight_armor', shield: 'guardian_shield', helmet: 'crown_helmet', legs: 'knight_legs', boots: 'steel_boots' } },
  { from: 85, gear: { weapon: 'ravagers_axe', armour: 'crown_armor', shield: 'dragon_shield', helmet: 'crown_helmet', legs: 'golden_legs', boots: 'steel_boots' } },
  { from: 110, gear: { weapon: 'ravagers_axe', armour: 'magic_plate_armor', shield: 'dragon_shield', helmet: 'demon_helmet', legs: 'golden_legs', boots: 'steel_boots', amulet: 'stone_skin_amulet', ring: 'might_ring' } },
  { from: 140, gear: { weapon: 'magic_sword', armour: 'demon_armor', shield: 'mastermind_shield', helmet: 'royal_helmet', legs: 'golden_legs', boots: 'boots_of_haste', amulet: 'platinum_amulet', ring: 'might_ring' } },
];

const LEVELS = [1, 8, 15, 20, 25, 30, 40, 50, 60, 70, 85, 100, 120, 150, 180];

const BANDS = LEVELS.map((level) => ({
  level,
  voc: level >= 8 ? 'knight' : 'none',
  // A knight who hunts steadily sits a little under level in weapon skill.
  skill: Math.min(105, Math.round(10 + level * 0.82)),
  shield: Math.min(100, Math.round(10 + level * 0.75)),
  gear: [...LADDER].reverse().find((g) => level >= g.from).gear,
}));

const hours = Number(process.argv[2] ?? 1);
const only = process.argv[3];
const STEPS = Math.round((hours * 3600 * 1000) / 100);

function build(band) {
  setState(createState('Balance'));
  if (band.voc !== 'none') {
    S.char.exp = 4200;
    S.char.level = 8;
    chooseVocation(band.voc);
  }
  S.char.level = band.level;
  S.char.exp = 0;
  for (const id of ['axe', 'sword', 'club', 'distance']) S.skills[id].level = band.skill;
  S.skills.shielding.level = band.shield;
  S.skills.magic.level = Math.floor(band.level / 4);
  Object.assign(S.equipment, band.gear);
  S.quests.done = QUESTS.map((q) => q.id); // gates are a separate question
  S.gold = 0;
  // A full pack of supplies, so the run measures the hunt and not the shopping.
  addItem('ham', 60);
  addItem(band.level >= 80 ? 'great_health_potion' : band.level >= 50 ? 'strong_health_potion' : 'health_potion', 800);
  if (band.level >= 15) addItem('mana_potion', 400);
  S.char.hp = maxHp();
  S.char.mana = maxMp();
}

function run(area, band) {
  build(band);
  const predicted = areaEstimate(area);
  const blocked = travelProblem(area);
  if (blocked) return null;
  const potionsHeld = () => S.inventory
    .filter((e) => getItem(e.id).type === 'potion')
    .reduce((sum, e) => sum + e.qty, 0);
  const potionsBefore = potionsHeld();
  if (!startHunt(area.id)) return null;
  let taken = 0;
  let lowest = 1;
  for (let i = 0; i < STEPS && S.action; i++) {
    const before = S.char.hp;
    tick(100);
    if (S.char.hp < before) taken += before - S.char.hp;
    lowest = Math.min(lowest, S.char.hp / maxHp());
  }
  const left = potionsHeld();
  // Coins are a minority of what a hunt pays; the drops are the rest. Supplies
  // are what you brought, so they do not count as income.
  const loot = S.inventory
    .filter((e) => !['potion', 'food'].includes(getItem(e.id).type))
    .reduce((sum, e) => sum + sellPrice(e.id) * e.qty, 0);
  return {
    exp: S.char.exp / hours,
    gold: (S.gold + loot) / hours,
    deaths: S.stats.deaths,
    potions: (potionsBefore - left) / hours,
    quit: !S.action,
    taken: taken / hours,
    lowest,
    incoming: predicted.incoming * 3600,
    predictedPotions: predicted.potionsPerHour,
    predicted,
  };
}

const num = (n) => Math.round(n).toLocaleString('en-US').padStart(9);
console.log(`${hours}h per cell. exp/h · gold/h · deaths · potions/h · guide verdict (guide exp/h)\n`);

const table = [];
for (const area of AREAS) {
  if (only && area.id !== only) continue;
  console.log(`\x1b[1m${area.name}\x1b[0m  (req ${area.req})`);
  for (const band of BANDS) {
    if (band.level + 25 < area.req) continue; // hopelessly under-levelled
    const r = run(area, band);
    if (!r) { console.log(`  lvl ${String(band.level).padStart(3)}  — unreachable`); continue; }
    table.push({ area, level: band.level, ...r });
    const off = r.exp > 0 ? (r.predicted.expPerHour / r.exp) : 0;
    console.log(
      `  lvl ${String(band.level).padStart(3)}  ${num(r.exp)} exp  ${num(r.gold)} gp  `
      + `${String(r.deaths).padStart(2)}d  `
      + `hit ${num(r.taken)}/h (guide ${num(r.incoming)})  pots ${String(Math.round(r.potions)).padStart(4)} (guide ${String(Math.round(r.predictedPotions)).padStart(4)})  low ${String(Math.round(r.lowest * 100)).padStart(3)}%  `
      + `${r.predicted.verdict.label.padEnd(11)}guide ${off ? `${off.toFixed(2)}x` : '—'}${r.quit ? '  \x1b[31mQUIT\x1b[0m' : ''}`,
    );
  }
}


// What a player would actually pick at each level: the best experience among
// the places they survive. Any area that is never the answer is dead content.
// Ranked among the areas the game actually recommends at that level. The table
// above still shows what happens when you ignore the warning and walk in early.
console.log('\n\x1b[1mBest hunt by level\x1b[0m  (recommended for the level, and finished the hour alive)');
const winners = new Map();
for (const level of LEVELS) {
  const rows = table.filter((r) => r.level === level && !r.quit && r.area.req <= level).sort((a, b) => b.exp - a.exp);
  if (!rows.length) { console.log(`  lvl ${String(level).padStart(3)}  nowhere survivable`); continue; }
  const [best, second] = rows;
  winners.set(best.area.id, (winners.get(best.area.id) ?? 0) + 1);
  console.log(
    `  lvl ${String(level).padStart(3)}  ${best.area.name.padEnd(26)} req ${String(best.area.req).padStart(3)}  ${num(best.exp)} exp/h`
    + (second ? `   (next: ${second.area.name}, ${num(second.exp)})` : ''),
  );
}
console.log('\n\x1b[1mBest gold by level\x1b[0m');
for (const level of LEVELS) {
  const rows = table.filter((r) => r.level === level && !r.quit && r.area.req <= level).sort((a, b) => b.gold - a.gold);
  if (!rows.length) continue;
  const [best] = rows;
  winners.set(best.area.id, (winners.get(best.area.id) ?? 0) + 1);
  console.log(`  lvl ${String(level).padStart(3)}  ${best.area.name.padEnd(26)} req ${String(best.area.req).padStart(3)}  ${num(best.gold)} gp/h`);
}

// An area is worth going to if it leads a column or if it is the only place
// something worth having actually drops.
console.log('\n\x1b[1mOnly place for\x1b[0m');
for (const area of AREAS) {
  if (only && area.id !== only) continue;
  const drops = exclusiveDrops(area, AREAS);
  if (!drops.length) continue;
  winners.set(area.id, (winners.get(area.id) ?? 0) + 1);
  console.log(`  ${area.name.padEnd(26)} ${drops.slice(0, 4).map((d) => d.item.name).join(', ')}`);
}

const dead = AREAS.filter((a) => !winners.has(a.id) && (!only || a.id === only));
console.log(dead.length
  ? `\n\x1b[31mNever worth going to:\x1b[0m ${dead.map((a) => `${a.name} (req ${a.req})`).join(', ')}`
  : '\n\x1b[32mEvery area is the right answer somewhere.\x1b[0m');
