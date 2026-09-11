// Per-level gains follow Tibia's vocation progression (simplified: gains apply
// from level 2 instead of from level 9).
export const VOCATIONS = {
  none: {
    id: 'none', name: 'Citizen', icon: '🧍',
    blurb: 'No vocation. Balanced but unremarkable — the Rookgaard life.',
    hpPerLevel: 5, manaPerLevel: 5, capPerLevel: 10,
    hpRegen: { amount: 1, seconds: 12 }, manaRegen: { amount: 1, seconds: 6 },
  },
  knight: {
    id: 'knight', name: 'Knight', icon: '🛡️',
    blurb: 'Melee bruiser. Fast weapon and shielding skills, huge health pool.',
    hpPerLevel: 15, manaPerLevel: 5, capPerLevel: 25,
    hpRegen: { amount: 1, seconds: 6 }, manaRegen: { amount: 2, seconds: 6 },
  },
  paladin: {
    id: 'paladin', name: 'Paladin', icon: '🏹',
    blurb: 'Ranged hybrid. Best distance fighting, decent magic and health.',
    hpPerLevel: 10, manaPerLevel: 15, capPerLevel: 20,
    hpRegen: { amount: 1, seconds: 8 }, manaRegen: { amount: 2, seconds: 4 },
  },
  sorcerer: {
    id: 'sorcerer', name: 'Sorcerer', icon: '🔥',
    blurb: 'Glass cannon. Fastest magic level, strongest attack runes.',
    hpPerLevel: 5, manaPerLevel: 30, capPerLevel: 10,
    hpRegen: { amount: 1, seconds: 12 }, manaRegen: { amount: 2, seconds: 3 },
  },
  druid: {
    id: 'druid', name: 'Druid', icon: '❄️',
    blurb: 'Support caster. Fast magic level, the best healing runes.',
    hpPerLevel: 5, manaPerLevel: 30, capPerLevel: 10,
    hpRegen: { amount: 1, seconds: 12 }, manaRegen: { amount: 2, seconds: 3 },
  },
};

export const BASE_HP = 150;
export const BASE_MANA = 35;
export const BASE_CAP = 1000;
