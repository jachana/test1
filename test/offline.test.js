// Offline progress replays the same tick function at a coarser step. It must
// pay out what playing live would have paid — the coarse step used to silently
// throw away the tail of every respawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, S } from '../src/core/state.js';
import { tick } from '../src/core/engine.js';
import { startHunt } from '../src/systems/combat.js';
import { setSeed } from '../src/core/util.js';

function run(stepMs, minutes, seed) {
  // Both sides of every comparison below run from the same seed, so they see
  // the same creatures, the same champions and the same loot. Without that,
  // the two runs are independent samples and champion variance alone was
  // enough to fail a 5% band roughly one run in six.
  setSeed(seed);
  setState(createState(`Off-${seed}`));
  startHunt('rookgaard_sewers');
  const steps = (minutes * 60 * 1000) / stepMs;
  for (let i = 0; i < steps; i++) tick(stepMs);
  const result = {
    kills: Object.values(S.stats.kills).reduce((a, b) => a + b, 0),
    exp: S.char.exp,
  };
  setSeed(null);
  return result;
}

/** Averages several seeds, so one unlucky spawn table cannot decide the test. */
function average(stepMs, minutes, runs = 6) {
  let kills = 0;
  for (let i = 1; i <= runs; i++) kills += run(stepMs, minutes, i).kills;
  return kills / runs;
}

test('a coarse offline step pays out like the live tick', () => {
  const live = average(100, 20);
  const offline = average(1000, 20);
  const ratio = offline / live;
  // Tight, because both sides saw the same dice: anything outside this is the
  // coarse step actually losing or inventing time, not luck.
  assert.ok(ratio > 0.97 && ratio < 1.03,
    `offline replay at 1s steps paid ${(ratio * 100).toFixed(1)}% of live (${offline} vs ${live} kills)`);
});

test('even a very coarse step does not lose the respawn remainder', () => {
  const live = average(100, 20);
  const coarse = average(5000, 20);
  assert.ok(coarse / live > 0.93,
    `5s steps paid ${((coarse / live) * 100).toFixed(1)}% of live (${coarse} vs ${live} kills)`);
});

test('the same seed replays exactly the same hunt', () => {
  // The guarantee the two tests above lean on.
  const a = run(100, 5, 7);
  const b = run(100, 5, 7);
  assert.deepEqual(a, b, 'seeded runs diverged');
  assert.notDeepEqual(run(100, 5, 8), a, 'different seeds produced identical runs');
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
