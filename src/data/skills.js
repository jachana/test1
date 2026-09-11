// Every skill advances the Tibia way: you accumulate "tries" (hits landed, ores
// mined, mana spent) and the cost of the next level grows geometrically.
//
//   triesToAdvance(level) = base * factor ^ (level - offset)
//
// The combat/magic/fishing constants are the real ones from the game.

export const SKILLS = {
  fist: {
    name: 'Fist Fighting', icon: '👊', cat: 'combat', unit: 'hits',
    start: 10, offset: 10, base: 50,
    factor: { none: 1.5, knight: 1.1, paladin: 1.2, sorcerer: 1.5, druid: 1.5 },
  },
  club: {
    name: 'Club Fighting', icon: '🔨', cat: 'combat', unit: 'hits',
    start: 10, offset: 10, base: 50,
    factor: { none: 2.0, knight: 1.1, paladin: 1.2, sorcerer: 2.0, druid: 1.8 },
  },
  sword: {
    name: 'Sword Fighting', icon: '⚔️', cat: 'combat', unit: 'hits',
    start: 10, offset: 10, base: 50,
    factor: { none: 2.0, knight: 1.1, paladin: 1.2, sorcerer: 2.0, druid: 1.8 },
  },
  axe: {
    name: 'Axe Fighting', icon: '🪓', cat: 'combat', unit: 'hits',
    start: 10, offset: 10, base: 50,
    factor: { none: 2.0, knight: 1.1, paladin: 1.2, sorcerer: 2.0, druid: 1.8 },
  },
  distance: {
    name: 'Distance Fighting', icon: '🏹', cat: 'combat', unit: 'shots',
    start: 10, offset: 10, base: 25,
    factor: { none: 2.0, knight: 1.4, paladin: 1.1, sorcerer: 2.0, druid: 1.8 },
  },
  shielding: {
    name: 'Shielding', icon: '🛡️', cat: 'combat', unit: 'blocks',
    start: 10, offset: 10, base: 100,
    factor: { none: 1.5, knight: 1.1, paladin: 1.1, sorcerer: 1.5, druid: 1.5 },
  },
  magic: {
    name: 'Magic Level', icon: '✨', cat: 'magic', unit: 'mana',
    start: 0, offset: 0, base: 1600,
    factor: { none: 3.0, knight: 3.0, paladin: 1.4, sorcerer: 1.1, druid: 1.1 },
  },
  fishing: {
    name: 'Fishing', icon: '🎣', cat: 'gathering', unit: 'casts',
    start: 10, offset: 10, base: 20,
    factor: { all: 1.1 },
  },
  mining: {
    name: 'Mining', icon: '⛏️', cat: 'gathering', unit: 'swings',
    start: 1, offset: 1, base: 15,
    factor: { all: 1.065 },
  },
  woodcutting: {
    name: 'Woodcutting', icon: '🌲', cat: 'gathering', unit: 'chops',
    start: 1, offset: 1, base: 15,
    factor: { all: 1.065 },
  },
  cooking: {
    name: 'Cooking', icon: '🍳', cat: 'production', unit: 'meals',
    start: 1, offset: 1, base: 12,
    factor: { all: 1.065 },
  },
  smithing: {
    name: 'Blacksmithing', icon: '🛠️', cat: 'production', unit: 'strikes',
    start: 1, offset: 1, base: 18,
    factor: { all: 1.07 },
  },
  runecrafting: {
    name: 'Rune Making', icon: '📜', cat: 'production', unit: 'runes',
    start: 1, offset: 1, base: 20,
    factor: { all: 1.07 },
  },
};

export const SKILL_IDS = Object.keys(SKILLS);
export const MAX_SKILL_LEVEL = 150;

// Weapon skill used by each weapon category, for convenience elsewhere.
export const WEAPON_SKILLS = ['fist', 'club', 'sword', 'axe', 'distance'];
