// The whole engine runs headless: no DOM, no shims. These drive real hunts and
// assert the invariants that a balance change is most likely to break.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, S } from '../src/core/state.js';
import { tick } from '../src/core/engine.js';
import { startHunt } from '../src/systems/combat.js';
import { chooseVocation } from '../src/systems/player.js';
import { AREAS } from '../src/data/areas.js';
import { MONSTERS } from '../src/data/monsters.js';

/** Runs `minutes` of game time at the live tick rate. */
function play(minutes, step = 100) {
  for (let i = 0; i < (minutes * 60 * 1000) / step; i++) tick(step);
}

function fresh(name = 'Tester') {
  setState(createState(name));
  return S;
}

test('ten minutes in the sewers advances a character', () => {
  fresh();
  assert.ok(startHunt('rookgaard_sewers'));
  play(10);

  assert.ok(S.char.exp > 0, 'earned experience');
  assert.ok(S.char.level > 1, 'levelled up');
  assert.ok(S.gold >= 100, 'never lost gold');
  assert.ok(Object.values(S.stats.kills).reduce((a, b) => a + b, 0) > 10, 'killed things');
  assert.ok(S.skills.club.totalTries > 0, 'trained the weapon it is holding');
  assert.ok(S.skills.shielding.totalTries > 0, 'trained shielding by being attacked');
});

test('vitals stay inside their bounds through a long hunt', () => {
  fresh();
  startHunt('rookgaard_sewers');
  for (let i = 0; i < 30 * 60 * 10; i++) {
    tick(100);
    assert.ok(Number.isFinite(S.char.hp) && S.char.hp >= 0, `hp went bad: ${S.char.hp}`);
    assert.ok(Number.isFinite(S.char.mana) && S.char.mana >= 0, `mana went bad: ${S.char.mana}`);
    assert.ok(Number.isFinite(S.char.exp) && S.char.exp >= 0, `exp went bad: ${S.char.exp}`);
    assert.ok(S.char.level >= 1);
    if (S.combat) assert.ok(MONSTERS[S.combat.monsterId], 'spawned a real creature');
  }
});

test('a citizen cannot sail, a knight can', () => {
  fresh();
  assert.equal(startHunt('plains_of_havoc'), false, 'mainland refuses a citizen');
  assert.equal(S.action, null);

  S.char.exp = 4200;
  S.char.level = 8;
  assert.ok(chooseVocation('knight'));
  assert.ok(startHunt('plains_of_havoc'), 'a vocation opens the ship');
});

test('quest-gated areas stay shut until the quest is done', () => {
  fresh();
  S.char.exp = 4200;
  S.char.level = 60;
  chooseVocation('knight');
  assert.equal(startHunt('drefia'), false, 'Drefia needs the Ghostlands Pass');
  S.quests.done.push('ghostlands_pass');
  assert.ok(startHunt('drefia'));
});

test('every area is reachable and spawns only real creatures', () => {
  for (const area of AREAS) {
    assert.ok(area.spawns.length, `${area.id} has no spawns`);
    for (const [id] of area.spawns) assert.ok(MONSTERS[id], `${area.id} spawns unknown ${id}`);
  }
});
