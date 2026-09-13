// The soul board is the only permanent progression in the game, so it has to be
// exactly as strong as it says on the card and no stronger — and it has to
// survive a save from a version where a perk did not exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, migrateForTest, S } from '../src/core/state.js';
import { PERKS, perkCost } from '../src/data/perks.js';
import { buyPerk, rank, souls, soulsSpent, grantSouls, nextCost } from '../src/systems/perks.js';
import { maxHp, playerAttackInterval, playerMaxHit, loseExpOnDeath, chooseVocation } from '../src/systems/player.js';
import { totalArmour, capacity } from '../src/systems/inventory.js';
import { getMonster, asChampion } from '../src/data/monsters.js';

function fresh(level = 50) {
  setState(createState('Souls'));
  S.char.exp = 4200;
  S.char.level = 8;
  chooseVocation('knight');
  S.char.level = level;
  S.skills.axe.level = 50;
  S.equipment.weapon = 'knight_axe';
  S.char.soul = 100000;
  return S;
}

test('a kill is a soul point and a champion is worth eight', () => {
  fresh();
  S.char.soul = 0;
  const rat = getMonster('rat');
  grantSouls(rat);
  assert.equal(souls(), 1);
  grantSouls(asChampion(rat));
  assert.equal(souls(), 9);
  assert.equal(S.stats.soulsEarned, 9);
});

test('each perk does exactly what its card says', () => {
  const cases = [
    ['iron_skin', () => totalArmour(), (before, after) => assert.equal(after, before + 2)],
    ['constitution', () => maxHp(), (before, after) => assert.equal(after, Math.round(before * 1.02))],
    ['deep_pockets', () => capacity(), (before, after) => assert.equal(after, Math.round(before * 1.05))],
    ['sure_footing', () => playerAttackInterval(), (before, after) => assert.ok(after < before)],
    ['sharp_edge', () => playerMaxHit(), (before, after) => assert.ok(after > before)],
  ];
  for (const [id, read, check] of cases) {
    fresh();
    const before = read();
    assert.equal(buyPerk(id), true, `could not buy ${id}`);
    check(before, read(), id);
  }
});

test('Blessed softens the death penalty by exactly what it promises', () => {
  fresh(60);
  S.char.exp = 1000000;
  const plain = loseExpOnDeath(0.1).lost;

  fresh(60);
  S.char.exp = 1000000;
  buyPerk('blessed');
  const blessed = loseExpOnDeath(0.1).lost;

  assert.equal(blessed, Math.floor(1000000 * 0.1 * 0.85), 'one rank should cut the loss by 15%');
  assert.ok(blessed < plain);
});

test('you cannot buy a rank you cannot pay for, or a rank past the last one', () => {
  fresh();
  S.char.soul = 0;
  assert.equal(buyPerk('iron_skin'), false, 'bought a perk with no souls');
  assert.equal(rank('iron_skin'), 0);

  S.char.soul = 1000000;
  const perk = PERKS.find((p) => p.id === 'blessed');
  for (let i = 0; i < perk.max; i++) assert.equal(buyPerk('blessed'), true);
  assert.equal(rank('blessed'), perk.max);
  assert.equal(nextCost('blessed'), null);
  assert.equal(buyPerk('blessed'), false, 'bought a rank past the maximum');
});

test('souls spent match what the ranks cost', () => {
  fresh();
  const before = souls();
  buyPerk('iron_skin');
  buyPerk('iron_skin');
  buyPerk('coin_purse');
  const expected = perkCost(PERKS.find((p) => p.id === 'iron_skin'), 0)
    + perkCost(PERKS.find((p) => p.id === 'iron_skin'), 1)
    + perkCost(PERKS.find((p) => p.id === 'coin_purse'), 0);
  assert.equal(before - souls(), expected);
  assert.equal(soulsSpent(), expected);
});

test('a save naming a perk this build does not have still loads', () => {
  fresh();
  buyPerk('iron_skin');
  const raw = JSON.parse(JSON.stringify(S));
  raw.perks.a_perk_that_was_cut = 3;
  raw.perks.iron_skin = 99; // beyond its maximum
  raw.char.soul = -5;

  const loaded = migrateForTest(raw);
  assert.equal(loaded.perks.a_perk_that_was_cut, undefined, 'kept a perk that no longer exists');
  assert.equal(loaded.perks.iron_skin, PERKS.find((p) => p.id === 'iron_skin').max, 'kept a rank past the maximum');
  assert.equal(loaded.char.soul, 0, 'kept a negative soul balance');
});
