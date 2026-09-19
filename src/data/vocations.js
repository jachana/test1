// In Tibia everyone starts as a vocationless citizen on Rookgaard and only
// picks a vocation at level 8, when they are allowed to sail to the mainland.
// Vocation gains therefore apply from level 9 upwards; levels 2-8 use the
// rookie gains below, which is why every level 8 character has exactly
// 185 hp / 35 mana / 470 oz.
export const VOCATION_LEVEL = 8;

export const BASE_HP = 150;
export const BASE_MANA = 0;
export const BASE_CAP = 400;
export const ROOKIE_GAIN = { hp: 5, mana: 5, cap: 10 };

export const VOCATIONS = {
  none: {
    id: 'none', name: 'Citizen', icon: '🧍',
    blurb: 'No vocation. Rookgaard life: slow skills, no spells, no ship to the mainland.',
    hpPerLevel: 5, manaPerLevel: 5, capPerLevel: 10,
    hpRegen: { amount: 1, seconds: 12 }, manaRegen: { amount: 1, seconds: 6 },
    spellPower: 1.0, healPower: 1.0,
  },
  knight: {
    id: 'knight', name: 'Knight', icon: '🛡️',
    blurb: 'Melee bruiser. Fast weapon and shielding skills, huge health pool.',
    weapon: 'Sword, axe or club, and a shield you actually block with.',
    hpPerLevel: 15, manaPerLevel: 5, capPerLevel: 25,
    hpRegen: { amount: 1, seconds: 6 }, manaRegen: { amount: 2, seconds: 6 },
    spellPower: 1.0, healPower: 1.0,
  },
  paladin: {
    id: 'paladin', name: 'Paladin', icon: '🏹',
    blurb: 'Ranged hybrid. Best distance fighting, decent magic and health.',
    weapon: 'Spears, bows and crossbows — keep ammunition in your quiver.',
    hpPerLevel: 10, manaPerLevel: 15, capPerLevel: 20,
    hpRegen: { amount: 1, seconds: 8 }, manaRegen: { amount: 2, seconds: 4 },
    spellPower: 1.0, healPower: 1.0,
  },
  // Sorcerer and druid share Tibia's stat block on purpose — in 7.6 they were
  // identical on paper. What separates them is the spellbook, so they need one
  // difference each that a player can feel: the sorcerer hits harder than
  // anything else in the game, and the druid out-lives everything.
  sorcerer: {
    id: 'sorcerer', name: 'Sorcerer', icon: '🔥',
    blurb: 'Glass cannon. Fastest magic level, strongest attack runes and spells.',
    weapon: 'Runes and attack spells; a wand in one hand, mana potions in the other.',
    hpPerLevel: 5, manaPerLevel: 30, capPerLevel: 10,
    hpRegen: { amount: 1, seconds: 12 }, manaRegen: { amount: 2, seconds: 3 },
    // Fire and energy: sudden death, energy wave, ultimate explosion.
    spellPower: 1.15,
    healPower: 1.0,
  },
  druid: {
    id: 'druid', name: 'Druid', icon: '❄️',
    blurb: 'Support caster. Ice magic, faster recovery, and healing nothing else matches.',
    weapon: 'Healing runes and ice magic; the safest way to out-live a hunt.',
    hpPerLevel: 5, manaPerLevel: 30, capPerLevel: 10,
    hpRegen: { amount: 1, seconds: 8 }, manaRegen: { amount: 2, seconds: 3 },
    // Ice strike, avalanche, icicle — a little behind the sorcerer's damage,
    // well ahead of anyone's healing.
    spellPower: 0.9,
    healPower: 1.35,
  },
};

/** The four you may pick at level 8. Citizen is what you already are. */
export const CHOOSABLE = ['knight', 'paladin', 'sorcerer', 'druid'];

export function canChooseVocation(char) {
  return char.level >= VOCATION_LEVEL && char.vocation === 'none';
}
