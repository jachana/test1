import { SKILLS, MAX_SKILL_LEVEL } from '../data/skills.js';
import { VOCATIONS, BASE_HP, BASE_MANA, BASE_CAP, ROOKIE_GAIN, VOCATION_LEVEL } from '../data/vocations.js';
import { clamp, randInt } from './util.js';

// Tibia's real experience curve.
export function expForLevel(level) {
  if (level <= 1) return 0;
  return Math.round((50 / 3) * (level ** 3 - 6 * level ** 2 + 17 * level - 12));
}

/**
 * `from` is a hint, not a floor: pass the level you already believe the
 * character has and the scan starts there instead of walking up from 1, which
 * matters because this runs on every experience gain and on every UI tick.
 */
export function levelForExp(exp, from = 1) {
  let level = Math.max(1, Math.min(from, 1 + Math.cbrt(Math.max(0, exp) * 3 / 50)));
  level = Math.floor(level);
  while (level > 1 && expForLevel(level) > exp) level--;
  while (expForLevel(level + 1) <= exp) level++;
  return level;
}

export function expProgress(exp, from = 1) {
  const level = levelForExp(exp, from);
  const floor = expForLevel(level);
  const next = expForLevel(level + 1);
  return { level, floor, next, into: exp - floor, need: next - floor, ratio: (exp - floor) / (next - floor) };
}

export function skillFactor(skillId, vocation) {
  const f = SKILLS[skillId].factor;
  return f.all ?? f[vocation] ?? 1.5;
}

// Tries required to go from `level` to `level + 1`.
export function triesToAdvance(skillId, level, vocation) {
  const skill = SKILLS[skillId];
  if (level >= MAX_SKILL_LEVEL) return Infinity;
  // Round before the ceiling: 50 * 1.1 lands on 55.000000000000007 in binary
  // floating point, which would quietly make a knight's sword 10->11 cost 56.
  const cost = skill.base * skillFactor(skillId, vocation) ** (level - skill.offset);
  return Math.ceil(Number(cost.toFixed(6)));
}

// Levels 2-8 are vocationless rookie levels; the vocation only pays out from
// level 9, exactly as in Tibia.
function stat(level, vocation, base, rookieGain, vocationGain) {
  const rookieLevels = Math.min(level, VOCATION_LEVEL) - 1;
  const vocationLevels = Math.max(0, level - VOCATION_LEVEL);
  return base + rookieGain * rookieLevels + VOCATIONS[vocation][vocationGain] * vocationLevels;
}

export function maxHealth(level, vocation) {
  return stat(level, vocation, BASE_HP, ROOKIE_GAIN.hp, 'hpPerLevel');
}

export function maxMana(level, vocation) {
  return stat(level, vocation, BASE_MANA, ROOKIE_GAIN.mana, 'manaPerLevel');
}

export function maxCapacity(level, vocation) {
  return stat(level, vocation, BASE_CAP, ROOKIE_GAIN.cap, 'capPerLevel');
}

// Melee/distance damage, modelled on Tibia's formula:
//   max = 0.085 * factor * weaponAttack * skill + level / 5
export const ATTACK_MODES = {
  offensive: { id: 'offensive', name: 'Full Attack', dmg: 2.5, def: 0.5 },
  balanced: { id: 'balanced', name: 'Balanced', dmg: 2.0, def: 0.75 },
  defensive: { id: 'defensive', name: 'Full Defence', dmg: 1.2, def: 1.0 },
};

export function maxHit(weaponAttack, skillLevel, charLevel, mode) {
  const f = ATTACK_MODES[mode]?.dmg ?? 2.0;
  return Math.max(1, Math.floor(0.085 * f * weaponAttack * skillLevel + charLevel / 5));
}

// Defence value: shielding skill scaled by stance plus the shield's own block.
export function defenceValue(shieldingLevel, shieldDefence, mode) {
  const f = ATTACK_MODES[mode]?.def ?? 0.75;
  return (shieldingLevel * 0.4 + shieldDefence) * f;
}

/** How long a corpse lies there before the next spawn walks in. */
export const RESPAWN_MS = 1500;
/** Regeneration runs this much faster between fights than during one. */
export const RESTING_SPEEDUP = 4;

/** Chance a swing lands, given your weapon skill against the creature's defence. */
export function hitChance(skill, monsterDefence) {
  return clamp(0.62 + (skill - monsterDefence) * 0.02, 0.35, 0.96);
}

/** Chance you block an incoming blow of `raw` damage. */
export function blockChance(defence, raw) {
  return clamp(defence / (defence + raw * 1.6), 0, 0.72);
}

/** Armour soaks a random slice of the blow, Tibia-style. */
export function applyArmour(damage, armour, minimum = 0) {
  if (armour <= 0) return Math.max(minimum, damage);
  const soak = randInt(Math.floor(armour * 0.475), armour);
  return Math.max(minimum, damage - soak);
}

const armourExpectation = new Map();

/**
 * The average of applyArmour over the whole roll, computed exactly.
 *
 * Averaging the inputs instead — (avgDamage - avgSoak) — is not an
 * approximation of this, it is a different number: the max(0, ...) clamp sits
 * inside the draw, so every combination that would go negative contributes
 * zero rather than pulling the mean down. Doing it the naive way made the
 * hunting guide understate damage taken by up to 11x and report armour-heavy
 * hunts as completely safe.
 */
export function expectedAfterArmour(lo, hi, armour, minimum = 0) {
  if (armour <= 0) return Math.max(minimum, (lo + hi) / 2);
  const key = `${lo}|${hi}|${armour}|${minimum}`;
  const cached = armourExpectation.get(key);
  if (cached !== undefined) return cached;

  const soakLo = Math.floor(armour * 0.475);
  let total = 0;
  let n = 0;
  for (let damage = lo; damage <= hi; damage++) {
    for (let soak = soakLo; soak <= armour; soak++) {
      total += Math.max(minimum, damage - soak);
      n++;
    }
  }
  const mean = n ? total / n : 0;
  armourExpectation.set(key, mean);
  return mean;
}

// Rune / spell damage scales with magic level and character level, like Tibia.
export function spellHit(base, perML, magicLevel, charLevel) {
  const power = base + perML * magicLevel + charLevel / 5;
  return Math.max(1, Math.floor(power));
}
