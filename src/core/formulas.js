import { SKILLS, MAX_SKILL_LEVEL } from '../data/skills.js';
import { VOCATIONS, BASE_HP, BASE_MANA, BASE_CAP, ROOKIE_GAIN, VOCATION_LEVEL } from '../data/vocations.js';

// Tibia's real experience curve.
export function expForLevel(level) {
  if (level <= 1) return 0;
  return Math.round((50 / 3) * (level ** 3 - 6 * level ** 2 + 17 * level - 12));
}

export function levelForExp(exp) {
  let level = 1;
  while (expForLevel(level + 1) <= exp) level++;
  return level;
}

export function expProgress(exp) {
  const level = levelForExp(exp);
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
  return Math.ceil(skill.base * skillFactor(skillId, vocation) ** (level - skill.offset));
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

// Rune / spell damage scales with magic level and character level, like Tibia.
export function spellHit(base, perML, magicLevel, charLevel) {
  const power = base + perML * magicLevel + charLevel / 5;
  return Math.max(1, Math.floor(power));
}
