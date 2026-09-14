// Saves outlive the content they name. These cover the two ways that has gone
// wrong: a save naming things that no longer exist, and a save the game cannot
// run at all (which must never reach character creation, whose first write
// would overwrite it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, migrateForTest, exportSave, importSave, S } from '../src/core/state.js';
import { expForLevel } from '../src/core/formulas.js';

const stale = () => ({
  version: 1,
  char: { name: 'Ghost', vocation: 'necromancer', level: 40, exp: expForLevel(12), hp: 9999, mana: 9999, food: 0 },
  skills: { sword: { level: 30, points: 5, totalTries: 900 }, mining: { level: 20, points: 0, totalTries: 0 } },
  equipment: { weapon: 'pickaxe', armour: 'leather_armor', shield: null, helmet: null, amulet: null, ring: null, legs: null, boots: null, ammo: null },
  inventory: [{ id: 'iron_ore', qty: 12 }, { id: 'ham', qty: 5 }, { id: 'ham', qty: 0 }],
  gold: 5000,
  action: { type: 'idle', skill: 'mining', actionId: 'mine_iron', progress: 0 },
  combat: { monsterId: 'hydra', hp: 900, maxHp: 2350, respawn: 0 },
  quests: { done: ['bear_room', 'quest_that_never_was'], choice: { annihilator: 'unobtainium' } },
  settings: { attackSpell: 'wave_of_nonsense', healSpell: 'light_healing' },
  stats: { kills: { hydra: 12, rat: 3 } },
  log: [],
});

test('a save naming removed content loads with the rest intact', () => {
  const s = migrateForTest(stale());
  assert.equal(s.gold, 5000, 'gold survives');
  assert.equal(s.char.name, 'Ghost');
  assert.equal(s.skills.sword.level, 30, 'surviving skills keep their levels');

  assert.equal(s.char.vocation, 'none', 'unknown vocation falls back');
  assert.equal(s.equipment.weapon, null, 'unknown item leaves the slot');
  assert.equal(s.equipment.armour, 'leather_armor', 'known item stays');
  assert.deepEqual(s.inventory.map((e) => e.id), ['ham'], 'unknown and empty stacks are dropped');
  assert.equal(s.skills.mining, undefined, 'removed skills go');
  assert.equal(s.combat, null, 'a fight with a removed creature is cleared');
  assert.equal(s.action, null, 'an action pointing at a removed recipe is stopped');
  assert.deepEqual(s.quests.done, ['bear_room'], 'unknown quest ids are dropped');
  assert.deepEqual(s.quests.choice, {}, 'a choice naming a removed item is dropped');
  assert.equal(s.settings.attackSpell, null, 'a removed spell is unbound');
  assert.equal(s.settings.healSpell, 'light_healing', 'a real spell stays bound');
  assert.deepEqual(Object.keys(s.stats.kills), ['rat'], 'kill counters for removed creatures go');
});

test('level is re-derived from experience, never trusted', () => {
  const s = migrateForTest(stale());
  assert.equal(s.char.level, 12, 'an inflated level is corrected down');
  assert.ok(s.char.hp <= 185 + 5 * 4, 'hp is clamped to the corrected maximum');
});

test('export/import round-trips a character', () => {
  setState(createState('Rounder'));
  S.gold = 1234;
  S.char.exp = expForLevel(15);
  S.char.level = 15;
  const restored = importSave(exportSave());
  assert.equal(restored.gold, 1234);
  assert.equal(restored.char.level, 15);
  assert.equal(restored.char.name, 'Rounder');
});

test('a save that cannot be parsed throws rather than being ignored', () => {
  assert.throws(() => importSave('not-a-save'));
});
