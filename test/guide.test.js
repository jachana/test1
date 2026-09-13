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

test('the guide predicts the attrition a real hunt produces', async () => {
  // Ground truth: run the fight and compare it against what the guide claimed.
  const { tick } = await import('../src/core/engine.js');
  const { startHunt } = await import('../src/systems/combat.js');
  setState(createState('Truth'));
  S.settings.autoPotion = false; // isolate the combat model from the supply line
  S.settings.autoReturn = false;
  const predicted = areaEstimate(getArea('rookgaard_sewers')).incoming;

  startHunt('rookgaard_sewers');
  const before = S.char.hp;
  let healed = 0;
  const startDeaths = S.stats.deaths;
  for (let i = 0; i < 600 * 10 && S.stats.deaths === startDeaths; i++) {
    const hpBefore = S.char.hp;
    tick(100);
    if (S.char.hp > hpBefore) healed += S.char.hp - hpBefore;
  }
  const seconds = 600;
  const actual = (before - S.char.hp + healed) / seconds;
  const ratio = actual / predicted;
  assert.ok(ratio > 0.6 && ratio < 1.6,
    `guide predicted ${predicted.toFixed(2)} hp/s, the fight dealt ${actual.toFixed(2)} hp/s`);
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
