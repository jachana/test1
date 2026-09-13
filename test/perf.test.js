// The caches added to stop the UI recomputing everything ten times a second.
// A cache that goes stale is worse than the churn it replaced, so these check
// that each one notices when the thing it is keyed on moves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, S } from '../src/core/state.js';
import { totalArmour, shieldDefence, skillBonus, hasteBonus, regenBonus } from '../src/systems/inventory.js';
import { compareEquip, isUpgrade } from '../src/systems/compare.js';
import { chooseVocation, skillLevel } from '../src/systems/player.js';
import { getItem } from '../src/data/items.js';

function knight(level = 40) {
  setState(createState('Cache'));
  S.char.exp = 4200;
  S.char.level = 8;
  chooseVocation('knight');
  S.char.level = level;
  S.skills.axe.level = 50;
  S.skills.sword.level = 50;
  S.skills.shielding.level = 45;
  return S;
}

test('the worn-gear totals follow the gear', () => {
  knight();
  Object.assign(S.equipment, {
    weapon: 'knight_axe', armour: 'leather_armor', shield: 'wooden_shield',
    helmet: null, legs: null, boots: null, ring: null, amulet: null,
  });
  const light = totalArmour();
  const lightDef = shieldDefence();

  S.equipment.armour = 'plate_armor';
  assert.ok(totalArmour() > light, 'armour total did not notice a better breastplate');

  S.equipment.shield = 'plate_shield';
  assert.ok(shieldDefence() > lightDef, 'shield defence did not notice a better shield');

  S.equipment.armour = null;
  S.equipment.shield = null;
  assert.equal(totalArmour(), getItem('knight_axe').arm ?? 0);
});

test('a skill-bonus ring is seen the moment it goes on and off', () => {
  knight();
  S.equipment.ring = null;
  const bare = skillLevel('sword');

  assert.deepEqual(getItem('sword_ring').skillBonus, { sword: 3 });
  S.equipment.ring = 'sword_ring';
  assert.equal(skillLevel('sword'), bare + 3, 'the ring went on and the skill bonus did not move');
  assert.equal(skillBonus('axe'), 0, 'a sword ring should do nothing for an axe');

  S.equipment.ring = null;
  assert.equal(skillLevel('sword'), bare, 'the ring came off and the bonus stayed');
});

test('haste and regeneration totals invalidate too', () => {
  knight();
  for (const slot of Object.keys(S.equipment)) S.equipment[slot] = null;
  const bareHaste = hasteBonus();
  const bareRegen = regenBonus();

  S.equipment.boots = 'boots_of_haste';
  S.equipment.ring = 'life_ring';
  assert.ok(hasteBonus() > bareHaste || regenBonus() > bareRegen,
    'neither total noticed boots of haste and a life ring');

  S.equipment.boots = null;
  S.equipment.ring = null;
  assert.equal(hasteBonus(), bareHaste);
  assert.equal(regenBonus(), bareRegen);
});

test('a cached comparison does not survive the thing it compared against', () => {
  knight();
  Object.assign(S.equipment, { weapon: 'sabre', shield: 'wooden_shield' });

  // Against a sabre, a knight axe is an upgrade.
  assert.equal(isUpgrade('knight_axe'), true, 'knight axe should beat a sabre');
  const first = compareEquip('knight_axe');
  assert.equal(compareEquip('knight_axe'), first, 'nothing changed, so it should be the same object');

  // Wear it, and the same question has a different answer. (Set the slot
  // directly: equip() wants the item in the backpack, which is not the point here.)
  S.equipment.weapon = 'knight_axe';
  assert.equal(compareEquip('knight_axe').equipped, true, 'the cache outlived the equip');
  assert.equal(isUpgrade('sabre'), false, 'a sabre is not an upgrade over a knight axe');

  // A level-up changes max hit, which changes what counts as better.
  const before = compareEquip('sabre');
  S.char.level = 120;
  assert.notEqual(compareEquip('sabre'), before, 'the cache outlived a level-up');
});

test('comparing an item does not corrupt the gear it swapped in', () => {
  knight();
  Object.assign(S.equipment, { weapon: 'sabre', shield: 'wooden_shield' });
  const before = { ...S.equipment };
  const armourBefore = totalArmour();

  // A two-handed weapon takes the shield off inside the measurement.
  compareEquip('giant_sword');
  compareEquip('plate_armor');
  compareEquip('dragon_shield');

  assert.deepEqual({ ...S.equipment }, before, 'a comparison left gear swapped in');
  assert.equal(totalArmour(), armourBefore, 'the worn-gear cache kept a comparison in it');
});
