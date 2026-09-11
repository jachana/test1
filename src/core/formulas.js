import { SKILLS, MAX_SKILL_LEVEL } from '../data/skills.js';
import { VOCATIONS, BASE_HP, BASE_MANA, BASE_CAP } from '../data/vocations.js';

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

export function maxHealth(level, vocation) {
  return BASE_HP + VOCATIONS[vocation].hpPerLevel * (level - 1);
}

export function maxMana(level, vocation) {
  return BASE_MANA + VOCATIONS[vocation].manaPerLevel * (level - 1);
}

export function maxCapacity(level, vocation) {
  return BASE_CAP + VOCATIONS[vocation].capPerLevel * (level - 1);
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
