// Hunting grounds as they stood around Tibia 7.6 — no Tiquanda, no Ankrahmun,
// no ice islands. `req` is the recommended character level; entering below it is
// allowed but the game warns you. Everything outside Rookgaard needs a vocation
// first: no vocation, no ship.
export const AREAS = [
  {
    id: 'rookgaard_sewers', name: 'Rookgaard Sewers', icon: '🕳️', req: 1, rookgaard: true,
    blurb: 'Damp tunnels under the academy. Where every character starts.',
    spawns: [['rat', 5], ['cave_rat', 3], ['spider', 2], ['rotworm', 1]],
  },
  {
    id: 'mount_sternum', name: 'Mount Sternum', icon: '⛰️', req: 4, rookgaard: true,
    blurb: 'Wolves on the slopes and an undead crypt below.',
    spawns: [['wolf', 4], ['troll', 3], ['skeleton', 3], ['goblin', 2], ['ghoul', 1]],
  },
  {
    id: 'minotaur_hills', name: 'Rookgaard Minotaur Caves', icon: '🐂', req: 6, rookgaard: true,
    blurb: 'The last test before the ship: bull-headed warriors and their brass.',
    spawns: [['minotaur', 5], ['minotaur_archer', 3], ['minotaur_guard', 2], ['minotaur_mage', 1]],
  },
  {
    id: 'plains_of_havoc', name: 'Plains of Havoc', icon: '🪦', req: 15,
    blurb: 'Cursed grassland west of Thais. The dead do not rest here.',
    spawns: [['ghoul', 4], ['demon_skeleton', 2], ['mummy', 2], ['beholder', 2]],
  },
  {
    id: 'orc_fortress', name: 'Orc Fortress', icon: '🏰', req: 25,
    blurb: 'The warcamp north of Carlin. Bring a shield.',
    spawns: [['orc', 4], ['orc_warrior', 4], ['orc_berserker', 3], ['orc_shaman', 2], ['orc_leader', 1]],
  },
  {
    id: 'cyclopolis', name: 'Cyclopolis', icon: '👁️‍🗨️', req: 35,
    blurb: 'The ruined city north of Edron. One-eyed brutes and walking rock.',
    spawns: [['cyclops', 4], ['stone_golem', 3], ['dwarf_geomancer', 2], ['elder_beholder', 1]],
  },
  {
    id: 'darashia_desert', name: 'Darashia Desert', icon: '🏜️', req: 42,
    blurb: 'Djinn towers over the Darama sands. Bring water — and a fire shield.',
    spawns: [['green_djinn', 4], ['efreet', 2], ['minotaur_mage', 2], ['wyvern', 1]],
  },
  {
    id: 'demona', name: 'Demona', icon: '⛏️', req: 50,
    blurb: 'Dwarven mines turned battlefield, deep beneath Kazordoon.',
    spawns: [['dwarf_soldier', 4], ['dwarf_guard', 4], ['fire_devil', 2], ['giant_spider', 1]],
  },
  {
    id: 'drefia', name: 'Drefia', icon: '🕯️', req: 60,
    blurb: 'The necromancer city under Darashia. Vampires, liches and worse.',
    spawns: [['vampire', 4], ['necromancer', 3], ['banshee', 2], ['lich', 1]],
  },
  {
    id: 'dragon_lair', name: 'Edron Dragon Lair', icon: '🐉', req: 70,
    blurb: 'Scales, fire and a pile of gold. The classic grind.',
    spawns: [['dragon', 5], ['wyvern', 3], ['giant_spider', 2], ['dragon_lord', 1]],
  },
  {
    id: 'behemoth_caves', name: 'Deep Kazordoon', icon: '🗿', req: 85,
    blurb: 'Behemoths in the deep halls, and the knights who never left.',
    spawns: [['behemoth', 3], ['black_knight', 3], ['hero', 3], ['dwarf_geomancer', 1]],
  },
  {
    id: 'hellgate', name: 'Hellgate', icon: '🔥', req: 100,
    blurb: 'The pit under Kharos. Demons, warlocks, and very good loot.',
    spawns: [['demon', 4], ['warlock', 3], ['behemoth', 2], ['dragon_lord', 2], ['black_knight', 1]],
  },
];

export function getArea(id) {
  return AREAS.find((a) => a.id === id) ?? null;
}
