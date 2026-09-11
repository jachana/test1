// Hunting grounds. `req` is the recommended character level — entering below it
// is allowed but the game warns you, Tibia-style.
export const AREAS = [
  {
    id: 'rookgaard_sewers', name: 'Rookgaard Sewers', icon: '🕳️', req: 1,
    blurb: 'Damp tunnels under the academy. Where every hero starts.',
    spawns: [['rat', 5], ['cave_rat', 3], ['spider', 2], ['rotworm', 1]],
  },
  {
    id: 'mount_sternum', name: 'Mount Sternum', icon: '⛰️', req: 8,
    blurb: 'Wolves on the slopes, undead in the crypt below.',
    spawns: [['wolf', 4], ['skeleton', 3], ['goblin', 2], ['ghoul', 1]],
  },
  {
    id: 'minotaur_hills', name: 'Minotaur Hills', icon: '🐂', req: 15,
    blurb: 'Bull-headed warriors guarding their leather and brass.',
    spawns: [['minotaur', 5], ['minotaur_archer', 3], ['minotaur_guard', 2], ['minotaur_mage', 1]],
  },
  {
    id: 'plains_of_havoc', name: 'Plains of Havoc', icon: '🪦', req: 25,
    blurb: 'Cursed grassland west of Thais. The dead do not rest here.',
    spawns: [['ghoul', 4], ['demon_skeleton', 2], ['mummy', 2], ['beholder', 2]],
  },
  {
    id: 'orc_fortress', name: 'Orc Fortress', icon: '🏰', req: 30,
    blurb: 'The warcamp north of Carlin. Bring a shield.',
    spawns: [['orc', 4], ['orc_warrior', 4], ['orc_berserker', 3], ['orc_shaman', 2], ['orc_leader', 1]],
  },
  {
    id: 'darashia_desert', name: 'Darashian Desert', icon: '🏜️', req: 40,
    blurb: 'Sand, scarabs and larvae. Hot enough to melt plate armor.',
    spawns: [['scarab', 4], ['larva', 3], ['ancient_scarab', 1], ['minotaur_mage', 2]],
  },
  {
    id: 'demona', name: 'Demona', icon: '⛏️', req: 50,
    blurb: 'Dwarven mines turned battlefield, deep beneath Kazordoon.',
    spawns: [['dwarf_soldier', 4], ['dwarf_guard', 4], ['fire_devil', 2], ['giant_spider', 1]],
  },
  {
    id: 'dragon_lair', name: 'Edron Dragon Lair', icon: '🐉', req: 65,
    blurb: 'Scales, fire and a pile of gold. The classic grind.',
    spawns: [['dragon', 5], ['wyvern', 3], ['wyrm', 2], ['dragon_lord', 1]],
  },
  {
    id: 'banuta', name: 'Banuta', icon: '🌴', req: 80,
    blurb: 'Jungle temple of Tiquanda. Hydras below, serpents above.',
    spawns: [['hydra', 4], ['serpent_spawn', 3], ['medusa', 2], ['frost_dragon', 1]],
  },
  {
    id: 'hellgate', name: 'Hellgate', icon: '🔥', req: 100,
    blurb: 'The pit under Kharos. Demons, warlocks, and very good loot.',
    spawns: [['demon', 4], ['warlock', 3], ['hellhound', 2], ['ghastly_dragon', 2], ['juggernaut', 1]],
  },
];

export function getArea(id) {
  return AREAS.find((a) => a.id === id) ?? null;
}
