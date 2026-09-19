// The soul board.
//
// Tibia's soul points paid for runes and summons. Nothing in this game needs
// summoning, so they buy the one thing an idle game with a level cap nobody
// will reach still needs: somewhere for a long night's kills to go that is not
// just a bigger number. Every kill is a soul point, champions and bosses are
// worth more, and the board is the only permanent progression that survives a
// death.
//
// Deliberately small numbers. The board is a slow, compounding edge — five
// ranks of everything is roughly a free tier of equipment, earned over tens of
// thousands of kills — not a second game bolted to the side of the first.

/** Souls a kill is worth, before the area's own multiplier. */
export const SOULS_PER_KILL = 1;
export const SOULS_PER_CHAMPION = 8;

/**
 * Cost of the rank you are buying, counting from zero.
 *
 * Rank one is cheap enough to buy on your first evening; rank five costs about
 * as much as the four below it together.
 */
export function perkCost(perk, rank) {
  return Math.round(perk.base * (rank + 1) ** 1.7);
}

export const PERKS = [
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    icon: '🛡️',
    blurb: 'Scar tissue counts as armour.',
    max: 5,
    base: 40,
    /** Flat armour added to whatever you are wearing. */
    effect: (rank) => `+${rank * 2} armor`,
  },
  {
    id: 'sharp_edge',
    name: 'Sharp Edge',
    icon: '🗡️',
    blurb: 'You have learned where things are soft.',
    max: 5,
    base: 55,
    effect: (rank) => `+${rank * 2}% maximum hit`,
  },
  {
    id: 'sure_footing',
    name: 'Sure Footing',
    icon: '👣',
    blurb: 'Less shuffling between swings.',
    max: 5,
    base: 70,
    effect: (rank) => `${rank * 1}% faster attacks`,
  },
  {
    id: 'constitution',
    name: 'Constitution',
    icon: '❤️',
    blurb: 'More of you to go around.',
    max: 5,
    base: 55,
    effect: (rank) => `+${rank * 2}% maximum health`,
  },
  {
    id: 'meditation',
    name: 'Meditation',
    icon: '🧘',
    blurb: 'You rest properly, for once.',
    max: 5,
    base: 45,
    effect: (rank) => `+${rank * 6}% health and mana regeneration`,
  },
  {
    id: 'deep_pockets',
    name: 'Deep Pockets',
    icon: '🎒',
    blurb: 'You have worked out how to fold a suit of armour.',
    max: 5,
    base: 35,
    effect: (rank) => `+${rank * 5}% carrying capacity`,
  },
  {
    id: 'scavenger',
    name: 'Scavenger',
    icon: '🔍',
    blurb: 'You check the pockets.',
    max: 5,
    base: 80,
    effect: (rank) => `+${rank * 3}% chance on every drop`,
  },
  {
    id: 'coin_purse',
    name: 'Coin Purse',
    icon: '🪙',
    blurb: 'Nothing rolls under the furniture any more.',
    max: 5,
    base: 45,
    effect: (rank) => `+${rank * 5}% gold from kills`,
  },
  {
    id: 'blessed',
    name: 'Blessed',
    icon: '✨',
    blurb: 'The temple remembers you.',
    max: 4,
    base: 90,
    effect: (rank) => `lose ${rank * 15}% less experience when you die`,
  },
];

export const getPerk = (id) => PERKS.find((p) => p.id === id) ?? null;
