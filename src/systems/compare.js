import { S } from '../core/state.js';
import { getItem, slotOf } from '../data/items.js';
import { SKILLS } from '../data/skills.js';
import { maxHit, defenceValue } from '../core/formulas.js';
import { hasteBonus, regenBonus, shieldDefence, skillBonus, totalArmour } from './inventory.js';
import { playerAttackInterval, skillLevel, weaponProfile } from './player.js';

/**
 * What your character actually looks like right now, in the numbers that decide
 * fights. Everything reads S.equipment, so comparing means swapping the gear in,
 * measuring, and putting it back.
 */
function snapshot() {
  const profile = weaponProfile();
  const skill = skillLevel(profile.skill);
  return {
    maxHit: maxHit(profile.attack, skill, S.char.level, S.settings.attackMode),
    armour: totalArmour(),
    defence: Math.round(defenceValue(skillLevel('shielding'), shieldDefence(), S.settings.attackMode)),
    interval: playerAttackInterval(),
    regen: regenBonus(),
    haste: hasteBonus(),
    weaponSkill: profile.skill,
    skillName: SKILLS[profile.skill].name,
    skillLevel: skill,
  };
}

/** Runs `fn` as if `itemId` were worn, then puts your real gear back. */
function asIfWearing(itemId, slot, fn) {
  const saved = { ...S.equipment };
  try {
    // Mirror the two-handed rules in inventory.equip().
    if (slot === 'weapon' && getItem(itemId).twoHanded) S.equipment.shield = null;
    if (slot === 'shield') {
      const weapon = S.equipment.weapon && getItem(S.equipment.weapon);
      if (weapon?.twoHanded) S.equipment.weapon = null;
    }
    S.equipment[slot] = itemId;
    return fn();
  } finally {
    S.equipment = saved;
  }
}

const STATS = [
  { key: 'maxHit', label: 'Max hit' },
  { key: 'armour', label: 'Armor' },
  { key: 'defence', label: 'Defence' },
];

/**
 * Compares an item against whatever occupies its slot. Returns null for things
 * you cannot wear.
 *
 * The comparison is of your whole character before and after, not of the two
 * items' printed stats — so it knows that a rapier out-damages a battle axe when
 * your sword skill is 60 and your axe skill is 10, and that a two-handed sword
 * costs you the shield you are holding.
 */
export function compareEquip(itemId) {
  const item = getItem(itemId);
  const slot = slotOf(item);
  if (!slot) return null;

  const currentId = S.equipment[slot];
  if (currentId === itemId) return { slot, equipped: true, verdict: 'equipped', deltas: [] };

  const before = snapshot();
  const after = asIfWearing(itemId, slot, snapshot);

  const deltas = [];
  for (const { key, label } of STATS) {
    const change = after[key] - before[key];
    if (change) deltas.push({ label, from: before[key], to: after[key], change });
  }
  // Faster is better, so the sign is flipped for the attack timer.
  if (after.interval !== before.interval) {
    deltas.push({
      label: 'Attack speed',
      from: `${(before.interval / 1000).toFixed(1)}s`,
      to: `${(after.interval / 1000).toFixed(1)}s`,
      change: before.interval - after.interval,
      unit: 's',
    });
  }
  if (after.regen !== before.regen) {
    deltas.push({ label: 'Regeneration', from: before.regen, to: after.regen, change: after.regen - before.regen });
  }
  for (const skillId of Object.keys(SKILLS)) {
    const change = asIfWearing(itemId, slot, () => skillBonus(skillId)) - skillBonus(skillId);
    if (change) deltas.push({ label: SKILLS[skillId].name, from: null, to: null, change });
  }

  const ups = deltas.filter((d) => d.change > 0).length;
  const downs = deltas.filter((d) => d.change < 0).length;
  let verdict = 'same';
  if (ups && downs) verdict = 'sidegrade';
  else if (ups) verdict = 'better';
  else if (downs) verdict = 'worse';

  return {
    slot,
    verdict,
    deltas,
    equipped: false,
    current: currentId ? getItem(currentId) : null,
    // A weapon that trains a skill you have barely touched is worth saying out loud.
    weaponNote: slot === 'weapon' && after.weaponSkill !== before.weaponSkill
      ? `Trains ${after.skillName} (${after.skillLevel}) instead of ${before.skillName} (${before.skillLevel})`
      : null,
  };
}

/** True when picking this up would be an outright improvement. */
export function isUpgrade(itemId) {
  return compareEquip(itemId)?.verdict === 'better';
}

export const VERDICT_LABEL = {
  better: 'Upgrade',
  worse: 'Worse',
  sidegrade: 'Trade-off',
  same: 'No change',
  equipped: 'Equipped',
};
