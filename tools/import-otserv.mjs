// Rewrites src/data/monsters.js from an OTServ data dump, so health, experience,
// armour, defence and loot tables come from real server files instead of memory.
//
//   git clone --depth 1 https://github.com/OpenTibiaArchives/otserv /tmp/otserv
//   node tools/import-otserv.mjs /tmp/otserv
//
// Damage, attack speed and gold stay as they are in monsters.js: those are tuned
// for idle pacing. (Server gold is capped at 100 coins per stack and split across
// bags, so importing it would read a demon as carrying 100 gold.) Loot entries whose items this
// game does not have are reported and skipped, which also keeps post-7.6 gear out.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEMS } from '../src/data/items.js';
import { MONSTERS } from '../src/data/monsters.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const otserv = resolve(process.argv[2] ?? '/tmp/otserv');
const DRY = process.argv.includes('--dry');

// OTServ states loot chance in parts per 100,000.
const CHANCE_SCALE = 100_000;

// Item names that differ between the server files and this game.
const ALIAS = {
  fish: 'raw_fish',
  'red dragon scale': 'dragon_scale',
  'minotaur leather': 'minotaur_leather',
  'wolf paw': 'wolf_paw',
  'giant spider silk': 'giant_spider_silk',
  'demonic essence': 'demon_dust',
  'hydra head': null, // no hydras in a 7.6 game
  'piece of royal steel': null,
  'platinium amulet': 'platinum_amulet', // the server files' own typo
  'spell book': 'spellbook',
  'demonic essence': 'demon_dust',
  'perfect behemoth fang': 'behemoth_claw',
  'wydern fang': null,
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const byName = new Map();
for (const [id, item] of Object.entries(ITEMS)) byName.set(item.name.toLowerCase(), id);

function resolveItem(name) {
  const key = name.trim().toLowerCase();
  if (key in ALIAS) return ALIAS[key];
  return byName.get(key) ?? null;
}

/** Pulls every loot line, including the ones nested inside bags. */
function parseLoot(xml) {
  const drops = [];
  const re = /<item id="(\d+)"([^>]*)>?\s*(?:<!--\s*([^>]*?)\s*-->)?/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[2];
    const name = m[3];
    if (!name) continue;
    const chance = Number(/chance="(\d+)"/.exec(attrs)?.[1] ?? 0) / CHANCE_SCALE;
    const countmax = Number(/countmax="(\d+)"/.exec(attrs)?.[1] ?? 1);
    if (!chance) continue;
    drops.push({ name, chance, countmax });
  }
  return drops;
}

const files = walk(join(otserv, 'data', 'monster')).filter((f) => f.endsWith('.xml'));
const sources = new Map();
for (const file of files) {
  const xml = readFileSync(file, 'utf8');
  const name = /<monster name="([^"]+)"/.exec(xml)?.[1];
  if (name) sources.set(name.toLowerCase(), xml);
}

const missingMonsters = [];
const unmappedItems = new Map();
const updates = new Map();

for (const monster of Object.values(MONSTERS)) {
  const xml = sources.get(monster.name.toLowerCase());
  if (!xml) {
    missingMonsters.push(monster.name);
    continue;
  }
  const lootBlock = /<loot>([\s\S]*?)<\/loot>/.exec(xml)?.[1] ?? '';
  const hp = Number(/<health now="\d+" max="(\d+)"/.exec(xml)?.[1] ?? monster.hp);
  const exp = Number(/experience="(\d+)"/.exec(xml)?.[1] ?? monster.exp);
  const armor = Number(/<defenses armor="(\d+)"/.exec(xml)?.[1] ?? monster.arm);
  const defense = Number(/<defenses[^>]*defense="(\d+)"/.exec(xml)?.[1] ?? monster.def);

  const loot = [];
  for (const drop of parseLoot(lootBlock)) {
    if (drop.name === 'gold coin' || drop.name === 'platinum coin') continue;
    const id = resolveItem(drop.name);
    if (!id) {
      if (drop.name !== 'bag' && drop.name !== 'backpack') {
        unmappedItems.set(drop.name, (unmappedItems.get(drop.name) ?? 0) + 1);
      }
      continue;
    }
    const existing = loot.find((l) => l.item === id);
    if (existing) existing.chance = Math.max(existing.chance, drop.chance);
    else loot.push({ item: id, chance: Number(drop.chance.toFixed(5)), lo: 1, hi: drop.countmax });
  }
  updates.set(monster.id, { hp, exp, arm: armor, def: defense, gold: monster.gold, loot });
}

console.log(`matched ${updates.size}/${Object.keys(MONSTERS).length} creatures in ${files.length} server files`);
if (missingMonsters.length) console.log(`no server file for: ${missingMonsters.join(', ')}`);
const top = [...unmappedItems.entries()].sort((a, b) => b[1] - a[1]).slice(0, 200);
if (top.length) console.log(`dropped loot this game has no item for (all):\n  ${top.map(([n, c]) => `${n} ×${c}`).join('\n  ')}`);

// Rewrite each M(...) line in place, leaving damage, speed and comments alone.
let src = readFileSync(join(root, 'src/data/monsters.js'), 'utf8');
let rewritten = 0;
for (const [id, u] of updates) {
  const line = new RegExp(`^  M\\('${id}',.*$`, 'm');
  const current = line.exec(src);
  if (!current) continue;
  const parts = /^  M\('([^']+)', '([^']+)', '([^']+)', \d+, \d+, \d+, \d+, (\d+), (\d+), (\d+),/.exec(current[0]);
  if (!parts) continue;
  const [, mid, name, icon, min, max, speed] = parts;
  const loot = u.loot
    .map((l) => `['${l.item}', ${l.chance}${l.hi > 1 ? `, ${l.lo}, ${l.hi}` : ''}]`)
    .join(', ');
  src = src.replace(line,
    `  M('${mid}', '${name}', '${icon}', ${u.hp}, ${u.exp}, ${u.arm}, ${u.def}, ${min}, ${max}, ${speed}, `
    + `[${u.gold[0]}, ${u.gold[1]}], [${loot}]),`);
  rewritten++;
}

if (DRY) {
  console.log(`dry run — would rewrite ${rewritten} creature lines`);
} else {
  writeFileSync(join(root, 'src/data/monsters.js'), src);
  console.log(`rewrote ${rewritten} creature lines in src/data/monsters.js`);
}
