// The things that make it possible to lose. Each of these was a measured
// defect: death was unreachable above about level 14, a fresh citizen died ten
// times an hour and kept walking back, and a level 150 knight drank forty-hit-
// point starter potions against a demon until it ran out and died.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, S } from '../src/core/state.js';
import { tick } from '../src/core/engine.js';
import { autoPotion, regenTick, chooseVocation, POTION_EXHAUST_MS, DEATH_WINDOW_MS } from '../src/systems/player.js';
import { addItem, count } from '../src/systems/inventory.js';
import { startHunt } from '../src/systems/combat.js';
import { AREAS } from '../src/data/areas.js';
import { areaEstimate, exclusiveDrops } from '../src/systems/guide.js';

const GEAR = [
  { from: 1, gear: {} },
  { from: 6, gear: { weapon: 'sabre', armour: 'studded_armor', helmet: 'leather_helmet' } },
  { from: 12, gear: { weapon: 'battle_axe', armour: 'chain_armor', shield: 'brass_shield', helmet: 'brass_helmet', legs: 'chain_legs' } },
  { from: 25, gear: { weapon: 'double_axe', armour: 'plate_armor', shield: 'battle_shield', helmet: 'steel_helmet', legs: 'plate_legs' } },
  { from: 40, gear: { weapon: 'knight_axe', armour: 'plate_armor', shield: 'plate_shield', helmet: 'crown_helmet', legs: 'knight_legs' } },
  { from: 60, gear: { weapon: 'giant_sword', armour: 'knight_armor', shield: 'guardian_shield', helmet: 'crown_helmet', legs: 'knight_legs', boots: 'steel_boots' } },
  { from: 85, gear: { weapon: 'ravagers_axe', armour: 'crown_armor', shield: 'dragon_shield', helmet: 'crown_helmet', legs: 'golden_legs', boots: 'steel_boots' } },
  { from: 110, gear: { weapon: 'ravagers_axe', armour: 'magic_plate_armor', shield: 'dragon_shield', helmet: 'demon_helmet', legs: 'golden_legs', boots: 'steel_boots', amulet: 'stone_skin_amulet', ring: 'might_ring' } },
];

function knight(level, { potions = 0, strong = 0 } = {}) {
  setState(createState('Challenge'));
  S.char.exp = 4200;
  S.char.level = 8;
  chooseVocation('knight');
  S.char.level = level;
  S.inventory = [];
  if (potions) addItem('health_potion', potions);
  if (strong) addItem('great_health_potion', strong);
  S.char.hp = 1;
  return S;
}

test('one potion per exhaust, not the whole backpack in a single blow', () => {
  knight(60, { potions: 40 });
  const before = count('health_potion');

  // A hundred calls inside one exhaust window is what combat actually does:
  // tickCombat slices on event boundaries and calls autoPotion in every slice.
  for (let i = 0; i < 100; i++) autoPotion();
  assert.equal(count('health_potion'), before - 1, 'drank more than one potion without waiting');

  regenTick(POTION_EXHAUST_MS - 1);
  autoPotion();
  assert.equal(count('health_potion'), before - 1, 'drank again before the exhaust ran out');

  S.char.hp = 1;
  regenTick(2);
  autoPotion();
  assert.equal(count('health_potion'), before - 2, 'never drank again after the exhaust ended');
});

test('badly hurt means the big potion, a scratch means the cheap one', () => {
  const s = knight(90, { potions: 10, strong: 10 });
  s.char.hp = 1; // thousands of hit points missing: nothing small covers this
  autoPotion();
  assert.equal(count('great_health_potion'), 9, 'sipped a starter potion while dying');
  assert.equal(count('health_potion'), 10);

  s.timers.potion = 0;
  s.char.hp = s.char.hp - 1 + 1; // still hurt, but only by a sliver
  s.char.hp = 1400; // maxHp is 1415 at level 90
  autoPotion();
  assert.equal(count('great_health_potion'), 9, 'wasted a great health potion on a scratch');
});

test('the death streak is a ten-minute window, not "since the last kill"', () => {
  knight(20);
  S.stats.deathStreak = 2;
  S.timers.deathWindow = DEATH_WINDOW_MS;

  // A kill in between used to reset this to zero, which is why a character
  // could die, walk back, kill one rat, and die again forever.
  regenTick(DEATH_WINDOW_MS - 1000);
  assert.equal(S.stats.deathStreak, 2, 'the streak expired early');

  regenTick(1000);
  assert.equal(S.stats.deathStreak, 0, 'the streak never expired');
});

test('running dry sends you home instead of killing you three times', () => {
  const s = knight(15, { potions: 1 });
  s.char.food = 0;
  startHunt('mount_sternum');
  assert.ok(s.action, 'the hunt did not start');

  s.inventory = []; // the last potion goes down, and there is nothing behind it
  s.char.hp = 1;
  for (let i = 0; i < 100 && s.action; i++) tick(100);

  assert.equal(s.action, null, 'kept hunting at 1 hp with an empty backpack');
  assert.equal(s.stats.deaths, 0, 'died rather than retreating');
  assert.match(s.log[0].text, /out of potions/);
});

test('no hunting ground is dead content', () => {
  // Twelve areas are only worth writing if a player would consider each of
  // them. Six of them used to be beaten outright at every single level.
  //
  // This checks the guide's prediction, which is cheap; `node tools/balance.mjs`
  // checks it by hunting each area for a simulated hour, which is the real
  // answer and takes minutes. The two rank slightly differently — the guide
  // values every drop at its shop price, while a real hunt only keeps what fits
  // in the backpack — so this asserts top-two rather than outright first.
  const leaders = new Set();
  for (const level of [1, 8, 20, 30, 40, 50, 60, 70, 85, 100, 130, 160]) {
    setState(createState('Ladder'));
    if (level >= 8) {
      S.char.exp = 4200;
      S.char.level = 8;
      chooseVocation('knight');
    }
    S.char.level = level;
    for (const id of ['axe', 'sword', 'club']) S.skills[id].level = Math.min(105, Math.round(10 + level * 0.82));
    S.skills.shielding.level = Math.min(100, Math.round(10 + level * 0.75));
    // Same gear ladder tools/balance.mjs measures with, or the ranking is the
    // ranking for a naked character and means nothing.
    Object.assign(S.equipment, [...GEAR].reverse().find((g) => level >= g.from).gear);

    const open = AREAS.filter((a) => a.req <= level).map(areaEstimate);
    if (!open.length) continue;
    for (const key of ['expPerHour', 'goldPerHour']) {
      for (const e of [...open].sort((a, b) => b[key] - a[key]).slice(0, 2)) leaders.add(e.area.id);
    }
  }
  // An area is also worth walking to if it is the only sensible source of
  // something: the citadel is the slowest experience in the endgame and where
  // three of the best pieces of armour in the game actually come from.
  const dead = AREAS.filter((a) => !leaders.has(a.id) && exclusiveDrops(a, AREAS).length === 0);
  assert.deepEqual(dead.map((a) => a.id), [],
    `dead content — never a top-two choice for experience or gold, and nothing drops here that does not drop better elsewhere: ${dead.map((a) => a.name).join(', ')}`);
});

test('a rune you cannot pay for is a rune you wait for', async () => {
  const { startIdle } = await import('../src/systems/idle.js');
  const { count: held } = await import('../src/systems/inventory.js');

  setState(createState('Runes'));
  S.char.exp = 4200;
  S.char.level = 8;
  chooseVocation('sorcerer');
  S.char.level = 60;
  S.skills.runecrafting.level = 50;
  S.skills.magic.level = 30;
  S.inventory = [];
  addItem('blank_rune', 200);
  addItem('ham', 20);
  S.char.mana = 0;

  assert.ok(startIdle('runecrafting', 'rune_sudden_death'), 'could not start');
  // A sudden death rune costs 985 mana. No vocation regenerates that inside one
  // action, so this used to cancel itself on the first completion and an
  // overnight session made a handful of runes and then stopped.
  for (let i = 0; i < 60 * 60 * 10 * 3; i++) tick(100);

  assert.ok(S.action, 'stopped crafting instead of waiting for mana');
  assert.ok(held('rune_sudden_death') > 0, `waited forever without crafting anything`);
  assert.ok(held('blank_rune') < 200, 'never consumed a blank rune');
});

test('the sorcerer and the druid are no longer the same vocation', async () => {
  const { castValue } = await import('../src/systems/player.js');
  const { SPELLS, spellsFor } = await import('../src/data/spells.js');

  const cast = (voc, spell) => {
    setState(createState('Split'));
    S.char.exp = 4200;
    S.char.level = 8;
    chooseVocation(voc);
    S.char.level = 60;
    S.skills.magic.level = 40;
    return castValue(spell);
  };

  // The druid used to hold every sorcerer spell but three, with an identical
  // stat block — a strictly worse sorcerer, so nobody had a reason to pick it.
  const sorcererOnly = spellsFor('sorcerer').filter((s) => !s.voc.includes('druid'));
  const druidOnly = spellsFor('druid').filter((s) => !s.voc.includes('sorcerer'));
  assert.ok(sorcererOnly.length >= 4, 'the sorcerer has nothing of its own');
  assert.ok(druidOnly.length >= 4, 'the druid has nothing of its own');

  assert.ok(cast('sorcerer', SPELLS.light_healing) < cast('druid', SPELLS.light_healing),
    'the druid does not heal for more');
  assert.ok(cast('sorcerer', SPELLS.great_fireball) > cast('druid', SPELLS.avalanche),
    'the sorcerer does not hit for more');
});
