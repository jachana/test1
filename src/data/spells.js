// Instant spells (cast with mana) and the effects behind rune items.
// Healing/damage scale with magic level and character level, like Tibia.
export const SPELLS = {
  // -------------------------------------------------------------- healing
  light_healing: {
    id: 'light_healing', name: 'Light Healing', words: 'exura', kind: 'heal',
    mana: 20, reqML: 0, reqLevel: 8, voc: ['paladin', 'sorcerer', 'druid', 'knight'],
    base: 12, perML: 3.2, cooldown: 1000,
  },
  intense_healing: {
    id: 'intense_healing', name: 'Intense Healing', words: 'exura gran', kind: 'heal',
    mana: 70, reqML: 4, reqLevel: 20, voc: ['paladin', 'sorcerer', 'druid', 'knight'],
    base: 40, perML: 8, cooldown: 1000,
  },
  ultimate_healing: {
    id: 'ultimate_healing', name: 'Ultimate Healing', words: 'exura vita', kind: 'heal',
    mana: 160, reqML: 12, reqLevel: 30, voc: ['sorcerer', 'druid'],
    base: 120, perML: 19, cooldown: 1000,
  },
  wound_cleansing: {
    id: 'wound_cleansing', name: 'Wound Cleansing', words: 'exura ico', kind: 'heal',
    mana: 40, reqML: 0, reqLevel: 8, voc: ['knight'],
    base: 35, perML: 6, cooldown: 1000,
  },

  // ------------------------------------------------------------- offensive
  exori: {
    id: 'exori', name: 'Berserk', words: 'exori', kind: 'attack',
    mana: 115, reqML: 0, reqLevel: 35, voc: ['knight'],
    base: 30, perML: 2, weaponScale: 0.9, cooldown: 4000,
  },
  ethereal_spear: {
    id: 'ethereal_spear', name: 'Ethereal Spear', words: 'exori con', kind: 'attack',
    mana: 25, reqML: 0, reqLevel: 23, voc: ['paladin'],
    base: 20, perML: 4.5, cooldown: 2000,
  },
  flame_strike: {
    id: 'flame_strike', name: 'Flame Strike', words: 'exori flam', kind: 'attack',
    mana: 20, reqML: 0, reqLevel: 14, voc: ['sorcerer', 'druid', 'paladin'],
    base: 15, perML: 4, cooldown: 2000,
  },
  fireball: {
    id: 'fireball', name: 'Fireball', words: 'adori flam', kind: 'attack',
    mana: 60, reqML: 4, reqLevel: 27, voc: ['sorcerer', 'druid'],
    base: 28, perML: 6.5, cooldown: 2000,
  },
  great_fireball: {
    id: 'great_fireball', name: 'Great Fireball', words: 'adori gran flam', kind: 'attack',
    mana: 120, reqML: 12, reqLevel: 30, voc: ['sorcerer', 'druid'],
    base: 50, perML: 10, cooldown: 2000,
  },
  explosion: {
    id: 'explosion', name: 'Explosion', words: 'adevo mas hur', kind: 'attack',
    mana: 170, reqML: 16, reqLevel: 31, voc: ['sorcerer', 'druid'],
    base: 75, perML: 13, cooldown: 2000,
  },
  sudden_death: {
    id: 'sudden_death', name: 'Sudden Death', words: 'adori gran mort', kind: 'attack',
    mana: 250, reqML: 15, reqLevel: 45, voc: ['sorcerer'],
    base: 110, perML: 19, cooldown: 2000,
  },
  energy_wave: {
    id: 'energy_wave', name: 'Energy Wave', words: 'exevo gran vis lux', kind: 'attack',
    mana: 170, reqML: 20, reqLevel: 38, voc: ['sorcerer'],
    base: 95, perML: 16, cooldown: 6000,
  },
  ultimate_explosion: {
    id: 'ultimate_explosion', name: 'Ultimate Explosion', words: 'exevo gran mas vis', kind: 'attack',
    mana: 1050, reqML: 30, reqLevel: 60, voc: ['sorcerer', 'druid'],
    base: 350, perML: 45, cooldown: 12000,
  },
};

export function spellsFor(vocation) {
  return Object.values(SPELLS).filter((s) => s.voc.includes(vocation));
}

export function canCast(spell, level, magicLevel, vocation) {
  return spell.voc.includes(vocation) && level >= spell.reqLevel && magicLevel >= spell.reqML;
}
