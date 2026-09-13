// Quests, the way Tibia actually did progression: one-time trips with a level
// door at the front and a reward chest at the end. Some of them are the only
// way into the deeper hunting grounds.
//
//   req       character level needed to attempt it
//   ms        how long the trip takes
//   dps       damage you take per second on the way in (supplies matter)
//   exp       experience from the chest, tuned to a share of one level at `req`:
//             a third of a level for the first trips, rising to three quarters
//             for the Annihilator and Ferumbras. Left alone, the chain sagged
//             badly in the middle — Fibula Dungeon paid 0.14 of a level where
//             the Bear Room paid 0.60 — so the quests stopped being worth the
//             detour exactly where a player most wants a shortcut.
//   gold      gold in the chest, roughly a third of the experience, which is
//             about half an hour of hunting income at that level
//   rewards   items always granted
//   choice    pick ONE of these before you start (the Annihilator moment)
//   unlocks   area id this quest opens up
//   needs     quest ids that must be finished first

export const QUESTS = [
  // ------------------------------------------------------------- Rookgaard
  {
    id: 'bear_room', name: 'The Bear Room', icon: '🐻', town: 'Rookgaard', req: 2,
    ms: 90_000, dps: 1.2, exp: 30, gold: 40,
    blurb: 'The trapdoor behind the academy. Three bears and a chest nobody guards properly.',
    rewards: [['studded_armor', 1], ['ham', 5]],
  },
  {
    id: 'sewer_treasure', name: 'Rookgaard Sewer Treasure', icon: '🕳️', town: 'Rookgaard', req: 4,
    ms: 120_000, dps: 2, exp: 120, gold: 80, needs: ['bear_room'],
    blurb: 'Down the grate, past the rats, into the water. Everyone does this one once.',
    rewards: [['studded_shield', 1], ['chain_helmet', 1]],
  },
  {
    id: 'minotaur_camp', name: 'Minotaur Camp', icon: '🐂', town: 'Rookgaard', req: 6,
    ms: 180_000, dps: 4, exp: 350, gold: 150, needs: ['sewer_treasure'],
    blurb: 'The camp east of the academy. Loud, hairy, and holding the best gear on the island.',
    rewards: [['mace', 1], ['brass_helmet', 1], ['ham', 10]],
  },

  // ------------------------------------------------------------- Mainland
  {
    id: 'mount_sternum_crypt', name: 'Mount Sternum Undead Cave', icon: '⚰️', town: 'Thais', req: 12,
    ms: 240_000, dps: 8, exp: 1900, gold: 660,
    blurb: 'The crypt under the mountain. Skeletons, a ghoul, and a silver amulet in the dark.',
    rewards: [['silver_amulet', 1], ['brass_armor', 1]],
  },
  {
    id: 'fibula_dungeon', name: 'Fibula Dungeon', icon: '🗝️', town: 'Fibula', req: 20,
    ms: 300_000, dps: 14, exp: 6300, gold: 2200,
    blurb: 'The flooded dungeon under the island village. Bring a rope and something sharp.',
    rewards: [['katana', 1], ['dwarven_shield', 1]],
  },
  {
    id: 'thais_treasure', name: 'The Hidden Treasure of Thais', icon: '💰', town: 'Thais', req: 25,
    ms: 330_000, dps: 18, exp: 10700, gold: 3700, needs: ['mount_sternum_crypt'],
    blurb: 'Behind a wall in the old city, exactly where the rumour says it is.',
    rewards: [['crystal_ring', 1], ['small_diamond', 2]],
  },
  {
    id: 'djinn_trial', name: 'Trial of the Green Djinn', icon: '🧞', town: "Ab'Dendriel", req: 30,
    ms: 360_000, dps: 22, exp: 16500, gold: 5800,
    blurb: 'Do the errands, say the right words, and the tower opens its shop to you.',
    rewards: [['might_ring', 1], ['blank_rune', 20]],
    unlocksShop: 'djinn',
  },
  {
    id: 'dark_cathedral', name: 'The Dark Cathedral', icon: '✝️', town: 'Thais', req: 35,
    ms: 400_000, dps: 30, exp: 24000, gold: 8400, needs: ['thais_treasure'],
    blurb: 'Bonelords under the cathedral, and a helmet worth the walk back.',
    rewards: [['crusader_helmet', 1], ['small_sapphire', 2]],
  },
  {
    id: 'behemoth_quest', name: 'Behemoth Quest', icon: '🗿', town: 'Edron', req: 50,
    ms: 480_000, dps: 55, exp: 57000, gold: 20000, needs: ['fibula_dungeon'],
    blurb: 'Four behemoths, one chest room, and no second chances at the door.',
    rewards: [['dark_armor', 1], ['warrior_helmet', 1], ['great_axe', 1]],
  },
  {
    id: 'ghostlands_pass', name: 'The Ghostlands Pass', icon: '🕯️', town: 'Darashia', req: 55,
    ms: 420_000, dps: 60, exp: 72000, gold: 25000,
    blurb: 'Bribe the right ghoul and the tunnels under Darashia open up for good.',
    rewards: [['spike_sword', 1]],
    unlocks: 'drefia',
  },
  {
    id: 'vampire_crypt', name: 'The Vampire Crypt', icon: '🦇', town: 'Drefia', req: 60,
    ms: 480_000, dps: 75, exp: 89000, gold: 31000, needs: ['ghostlands_pass'],
    blurb: 'Down past the necromancers to the coffin room. The shield is worth it.',
    rewards: [['vampire_shield', 1], ['black_pearl', 3]],
  },
  {
    id: 'black_knight_keep', name: "Black Knight's Keep", icon: '🏴', town: 'Edron', req: 70,
    ms: 540_000, dps: 95, exp: 131000, gold: 46000, needs: ['behemoth_quest'],
    blurb: 'He keeps a full armoury and he is not going to hand it over politely.',
    rewards: [['knight_axe', 1], ['serpent_sword', 1], ['bright_sword', 1]],
  },
  {
    id: 'hellgate_descent', name: 'Hellgate Descent', icon: '🔥', town: 'Kharos', req: 85,
    ms: 600_000, dps: 130, exp: 215000, gold: 75000, needs: ['black_knight_keep'],
    blurb: 'Find the stairs, survive the welcome, and the pit is open to you from now on.',
    rewards: [['demon_shield', 1]],
    unlocks: 'hellgate',
  },
  {
    id: 'pits_of_inferno', name: 'Pits of Inferno', icon: '☠️', town: 'Hellgate', req: 90,
    ms: 900_000, dps: 160, exp: 249000, gold: 87000, needs: ['hellgate_descent'],
    blurb: 'Seven throne rooms. The legs at the end are the ones everyone talks about.',
    rewards: [['golden_legs', 1]],
  },
  {
    id: 'annihilator', name: 'The Annihilator', icon: '💀', town: 'Hellgate', req: 100,
    ms: 720_000, dps: 220, exp: 327000, gold: 114000, needs: ['pits_of_inferno'],
    blurb: 'Four demons in one room. One chest each — pick yours before you go in.',
    rewards: [['demon_helmet', 1]],
    choice: ['demon_armor', 'magic_sword', 'thunder_hammer', 'blue_robe'],
  },
  {
    id: 'ferumbras_tower', name: "Ferumbras' Tower", icon: '🧙‍♂️', town: 'Edron', req: 120,
    ms: 900_000, dps: 300, exp: 527000, gold: 184000, needs: ['annihilator'],
    blurb: 'The old man himself. Nothing after this is harder.',
    rewards: [['magic_plate_armor', 1], ['ravagers_axe', 1], ['royal_crossbow', 1], ['small_diamond', 10]],
  },
];

export function getQuest(id) {
  return QUESTS.find((q) => q.id === id) ?? null;
}

/** Quests that must be completed before this area lets you in. */
export function questGateFor(areaId) {
  return QUESTS.find((q) => q.unlocks === areaId) ?? null;
}
