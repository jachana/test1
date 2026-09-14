// The guide is the number players trust before leaving the tab open for twelve
// hours, so it has to agree with the fight itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, S } from '../src/core/state.js';
import { areaEstimate, potionForLevel } from '../src/systems/guide.js';
import { expectedAfterArmour, applyArmour } from '../src/core/formulas.js';
import { getArea } from '../src/data/areas.js';
import { chooseVocation } from '../src/systems/player.js';

test('expectedAfterArmour is the true mean of the roll it describes', () => {
  for (const [lo, hi, armour] of [[8, 28, 24], [1, 6, 0], [40, 120, 30], [3, 12, 30]]) {
    let total = 0;
    const runs = 40000;
    for (let i = 0; i < runs; i++) total += applyArmour(lo + Math.floor(Math.random() * (hi - lo + 1)), armour);
    const sampled = total / runs;
    const predicted = expectedAfterArmour(lo, hi, armour);
    const gap = Math.abs(sampled - predicted);
    assert.ok(gap < Math.max(0.15, sampled * 0.05),
      `armour ${armour} on ${lo}-${hi}: predicted ${predicted.toFixed(2)}, rolled ${sampled.toFixed(2)}`);
  }
});

test('averaging the inputs instead would understate damage — the old bug', () => {
  // 8-28 damage against armour 24: the naive (avgDamage - avgSoak) is ~0.3,
  // because it lets the negative combinations cancel the positive ones out.
  const naive = Math.max(0, 18 - 24 * 0.7375);
  const real = expectedAfterArmour(8, 28, 24);
  assert.ok(real > naive * 3, `real ${real.toFixed(2)} vs naive ${naive.toFixed(2)}`);
  // And armour 30 must not read as complete immunity.
  assert.ok(expectedAfterArmour(8, 28, 30) > 0.5);
});

test('a fresh citizen is told Rookgaard is workable and Hellgate is not', () => {
  setState(createState('Guide'));
  assert.notEqual(areaEstimate(getArea('rookgaard_sewers')).verdict.id, 'deadly');
  assert.equal(areaEstimate(getArea('hellgate')).verdict.id, 'deadly');
});

test('the guide predicts the damage a real hunt deals, per kill', async () => {
  // Ground truth. Held still on purpose: no levelling, no regeneration, no
  // potions, no walking back — so the only thing varying is the dice, and the
  // expectation is summed over the creatures that actually spawned rather than
  // over the area's average mix.
  const { tick } = await import('../src/core/engine.js');
  const { startHunt } = await import('../src/systems/combat.js');
  const { monsterEstimate } = await import('../src/systems/guide.js');
  const { chooseVocation } = await import('../src/systems/player.js');
  const { on } = await import('../src/core/bus.js');

  setState(createState('Truth'));
  S.char.exp = 4200;
  S.char.level = 8;
  chooseVocation('knight');
  S.char.level = 60;
  S.skills.axe.level = 55;
  S.skills.shielding.level = 45;
  Object.assign(S.equipment, { weapon: 'knight_axe', armour: 'plate_armor', shield: 'plate_shield' });
  Object.assign(S.settings, { autoPotion: false, autoEat: false, autoReturn: false });
  S.char.food = 0; // no regeneration, so every point of damage is visible

  const perKill = new Map();
  for (const [id] of getArea('plains_of_havoc').spawns) perKill.set(id, monsterEstimate(id).damagePerKill);

  // Count kills off the event, not off the monster id changing: two ghouls in
  // a row look identical from the outside, and dropping those repeats from the
  // expectation while still counting their damage inflated the ratio by ~35%.
  let expected = 0;
  let kills = 0;
  on('combat:kill', (monster) => {
    expected += perKill.get(monster.id) ?? 0;
    kills++;
  });

  startHunt('plains_of_havoc');
  let taken = 0;
  const maxHp = S.char.hp;

  for (let i = 0; i < 60 * 60 * 10 && kills < 250; i++) {
    const hpBefore = S.char.hp;
    tick(100);
    if (S.char.hp < hpBefore) taken += hpBefore - S.char.hp;
    S.char.hp = maxHp; // top up so the sample is never cut short by a death
  }

  assert.ok(kills > 200, `only ${kills} kills sampled`);
  const ratio = taken / expected;
  assert.ok(ratio > 0.85 && ratio < 1.2,
    `over ${kills} kills the guide predicted ${expected.toFixed(0)} damage, the fight dealt ${taken.toFixed(0)} (${ratio.toFixed(2)}x)`);
});

test('the endgame becomes affordable once you are strong enough', () => {
  setState(createState('Endgame'));
  S.char.exp = 4200;
  S.char.level = 8;
  chooseVocation('knight');
  S.char.level = 130;
  S.skills.axe.level = 95;
  S.skills.shielding.level = 85;
  Object.assign(S.equipment, {
    weapon: 'ravagers_axe', armour: 'magic_plate_armor', helmet: 'demon_helmet',
    legs: 'golden_legs', boots: 'steel_boots', amulet: 'stone_skin_amulet', ring: 'might_ring',
  });
  const e = areaEstimate(getArea('hellgate'));
  assert.notEqual(e.verdict.id, 'deadly',
    `hellgate still deadly for a level 130 knight: ${e.potionGoldPerHour.toFixed(0)} gp of potions vs ${e.goldPerHour.toFixed(0)} gp income`);
  assert.ok(e.netGoldPerHour > 0, 'the endgame should pay for its own supplies');
});

test('the supply estimate names a potion the character may drink', () => {
  setState(createState('Potions'));
  assert.equal(potionForLevel(8).id, 'health_potion');
  assert.equal(potionForLevel(50).id, 'strong_health_potion');
  assert.equal(potionForLevel(80).id, 'great_health_potion');
});
