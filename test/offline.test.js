// Offline progress replays the same tick function at a coarser step. It must
// pay out what playing live would have paid — the coarse step used to silently
// throw away the tail of every respawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, S } from '../src/core/state.js';
import { tick } from '../src/core/engine.js';
import { startHunt } from '../src/systems/combat.js';

function run(stepMs, minutes, seed = 'x') {
  setState(createState(`Off-${seed}`));
  startHunt('rookgaard_sewers');
  const steps = (minutes * 60 * 1000) / stepMs;
  for (let i = 0; i < steps; i++) tick(stepMs);
  return {
    kills: Object.values(S.stats.kills).reduce((a, b) => a + b, 0),
    exp: S.char.exp,
  };
}

/** Averages several runs so the comparison is not at the mercy of one seed. */
function average(stepMs, minutes, runs = 6) {
  let kills = 0;
  for (let i = 0; i < runs; i++) kills += run(stepMs, minutes, i).kills;
  return kills / runs;
}

test('a coarse offline step pays out like the live tick', () => {
  const live = average(100, 20);
  const offline = average(1000, 20);
  const ratio = offline / live;
  assert.ok(ratio > 0.95 && ratio < 1.05,
    `offline replay at 1s steps paid ${(ratio * 100).toFixed(1)}% of live (${offline} vs ${live} kills)`);
});

test('even a very coarse step does not lose the respawn remainder', () => {
  const live = average(100, 20);
  const coarse = average(5000, 20);
  assert.ok(coarse / live > 0.9,
    `5s steps paid ${((coarse / live) * 100).toFixed(1)}% of live (${coarse} vs ${live} kills)`);
});

test('replaying time never produces impossible state', () => {
  setState(createState('Replay'));
  startHunt('rookgaard_sewers');
  for (let i = 0; i < 12 * 60 * 60; i++) tick(1000); // 12 hours, the offline cap
  assert.ok(S.char.exp > 0);
  assert.ok(S.char.hp > 0 && S.char.hp <= 150 + 5 * (S.char.level - 1) + 15 * 40);
  assert.ok(S.gold >= 0);
  assert.ok(Number.isInteger(S.stats.deaths) && S.stats.deaths >= 0);
});
