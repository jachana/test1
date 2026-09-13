// Hunting grounds as they stood around Tibia 7.6 — no Tiquanda, no Ankrahmun,
// no ice islands. `req` is the recommended character level; entering below it is
// allowed but the game warns you. Everything outside Rookgaard needs a vocation
// first: no vocation, no ship.
//
// Every `req` here is measured, not guessed: it is the lowest level at which
// `node tools/balance.mjs` finishes a simulated hour alive in that place, with
// the gear and skills a character of that level plausibly has.
//
// `expMult` and `goldMult` are what stop twelve areas from collapsing into one
// correct answer. Creature experience and loot come from the real game and are
// not up for negotiation, but which places are worth walking to is: without
// these, six of the twelve areas were never the best choice at any level, and
// Drefia was the right answer from level 50 to the end of the game. They are
// also the areas' personalities — an orc fortress is a pile of loot, the
// ghostlands are experience, the desert is where the gold is.
export const AREAS = [
  {
    id: 'rookgaard_sewers', name: 'Rookgaard Sewers', icon: '🕳️', req: 1, rookgaard: true,
    blurb: 'Damp tunnels under the academy. Where every character starts.',
    // Vermin only. A rotworm in here killed a fresh citizen three times in the
    // first hour: 13 max damage against its armour 8 is a two-minute fight it
    // spends hitting back for up to 22. They live down the mountain instead.
    spawns: [['rat', 5], ['cave_rat', 3], ['spider', 2]],
  },
  {
    id: 'mount_sternum', name: 'Mount Sternum', icon: '⛰️', req: 6, rookgaard: true,
    blurb: 'Wolves on the slopes and an undead crypt below.',
    spawns: [['wolf', 4], ['troll', 3], ['skeleton', 3], ['goblin', 2], ['rotworm', 2], ['ghoul', 1]],
  },
  {
    id: 'minotaur_hills', name: 'Rookgaard Minotaur Caves', icon: '🐂', req: 12, rookgaard: true,
    goldMult: 1.2,
    blurb: 'The last test before the ship: bull-headed warriors and their brass.',
    // The mage belongs in Darashia; two guards in the mix made this a level 20
    // area, and Rookgaard has to carry a character from 8 to the ship.
    spawns: [['minotaur', 6], ['minotaur_archer', 3], ['minotaur_guard', 1]],
  },
  {
    id: 'plains_of_havoc', name: 'Plains of Havoc', icon: '🪦', req: 25,
    expMult: 1.15, goldMult: 0.85,
    blurb: 'Cursed grassland west of Thais. The dead do not rest here.',
    spawns: [['ghoul', 4], ['demon_skeleton', 2], ['mummy', 2], ['beholder', 2]],
  },
  {
    id: 'orc_fortress', name: 'Orc Fortress', icon: '🏰', req: 25,
    expMult: 0.85, goldMult: 1.8,
    blurb: 'The warcamp north of Carlin. Bring a shield.',
    spawns: [['orc', 4], ['orc_warrior', 4], ['orc_berserker', 3], ['orc_shaman', 2], ['orc_leader', 1]],
  },
  {
    id: 'cyclopolis', name: 'Cyclopolis', icon: '👁️‍🗨️', req: 40,
    expMult: 1.3, goldMult: 0.8,
    blurb: 'The ruined city north of Edron. One-eyed brutes and walking rock.',
    spawns: [['cyclops', 4], ['stone_golem', 3], ['dwarf_geomancer', 2], ['elder_beholder', 1]],
  },
  {
    id: 'darashia_desert', name: 'Darashia Desert', icon: '🏜️', req: 50,
    expMult: 1.0, goldMult: 2.6,
    blurb: 'Djinn towers over the Darama sands. Bring water — and a fire shield.',
    spawns: [['green_djinn', 4], ['efreet', 2], ['minotaur_mage', 2], ['wyvern', 1]],
  },
  {
    id: 'demona', name: 'Demona', icon: '⛏️', req: 50,
    expMult: 1.7, goldMult: 1.2,
    blurb: 'Dwarven mines turned battlefield, deep beneath Kazordoon.',
    spawns: [['dwarf_soldier', 4], ['dwarf_guard', 4], ['fire_devil', 2], ['giant_spider', 1]],
  },
  {
    id: 'drefia', name: 'Drefia', icon: '🕯️', req: 60,
    expMult: 1.25, goldMult: 0.9,
    blurb: 'The necromancer city under Darashia. Vampires, liches and worse.',
    spawns: [['vampire', 4], ['necromancer', 3], ['banshee', 2], ['lich', 1]],
  },
  {
    id: 'dragon_lair', name: 'Edron Dragon Lair', icon: '🐉', req: 70,
    expMult: 1.35, goldMult: 1.35,
    blurb: 'Scales, fire and a pile of gold. The classic grind.',
    spawns: [['dragon', 5], ['wyvern', 3], ['giant_spider', 2], ['dragon_lord', 1]],
  },
  {
    id: 'behemoth_caves', name: 'Deep Kazordoon', icon: '🗿', req: 85,
    expMult: 1.35,
    blurb: 'Behemoths in the deep halls, and the knights who never left.',
    spawns: [['behemoth', 3], ['black_knight', 3], ['hero', 3], ['dwarf_geomancer', 1]],
  },
  {
    id: 'hellgate', name: 'Hellgate', icon: '🔥', req: 120,
    expMult: 1.4, goldMult: 1.6,
    blurb: 'The pit under Kharos. Demons, warlocks, and very good loot.',
    // Demons at weight 4 made this a team hunt: three simulated hours killed a
    // best-geared level 150 knight every single time, whatever the dice did.
    // A pit you meet one demon in is still the hardest place in the game.
    spawns: [['warlock', 4], ['dragon_lord', 3], ['black_knight', 3], ['behemoth', 2], ['demon', 1]],
  },
  {
    id: 'ferumbras_citadel', name: "Ferumbras' Citadel", icon: '🏯', req: 140,
    expMult: 0.85, goldMult: 1.0,
    blurb: 'He came back. He always comes back. Bring everything you own.',
    // Three named bosses and nothing else. The one place in the game where the
    // quest that "finishes" a boss is the thing that lets you fight it again:
    // Ferumbras' Tower kills him once, the citadel is where he keeps returning.
    // Deliberately the slowest experience per hour in the endgame and by far
    // the best loot — you come here for what drops, not for the levels.
    spawns: [['orshabaal', 3], ['ghazbaran', 2], ['ferumbras', 1]],
  },
];

/** Area multipliers default to 1: most places are exactly what their creatures are. */
export const expMult = (area) => area?.expMult ?? 1;
export const goldMult = (area) => area?.goldMult ?? 1;

export function getArea(id) {
  return AREAS.find((a) => a.id === id) ?? null;
}
