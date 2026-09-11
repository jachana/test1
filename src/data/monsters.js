// Monster stats are loosely based on the real creatures: health and experience
// are close to the originals, damage and defence are tuned for idle pacing.
//
// M(id, name, icon, hp, exp, armour, defence, dmgMin, dmgMax, attackMs, gold, loot)
// loot entry: [itemId, chance, minQty, maxQty]

const M = (id, name, icon, hp, exp, arm, def, min, max, speed, gold, loot = []) => ({
  id, name, icon, hp, exp, arm, def, min, max, speed, gold,
  loot: loot.map(([item, chance, lo = 1, hi = 1]) => ({ item, chance, lo, hi })),
});

export const MONSTERS = Object.fromEntries([
  // ------------------------------------------------------------- Rookgaard-ish
  M('rat', 'Rat', '🐀', 20, 5, 1, 5, 1, 6, 2400, [0, 4], [['rat_tail', 0.05], ['meat', 0.15]]),
  M('cave_rat', 'Cave Rat', '🐁', 30, 20, 2, 8, 2, 10, 2200, [0, 12], [['rat_tail', 0.08], ['meat', 0.2], ['brown_mushroom', 0.05]]),
  M('spider', 'Spider', '🕷️', 35, 18, 3, 10, 3, 12, 2000, [0, 8], [['bone', 0.05]]),
  M('wolf', 'Wolf', '🐺', 45, 25, 3, 12, 4, 15, 1800, [0, 15], [['meat', 0.3], ['wolf_paw', 0.01]]),
  M('goblin', 'Goblin', '👺', 40, 25, 4, 12, 3, 14, 2000, [2, 20], [['hand_axe', 0.06], ['leather_helmet', 0.05]]),
  M('skeleton', 'Skeleton', '💀', 50, 35, 5, 14, 4, 18, 2000, [0, 25], [['bone', 0.25], ['sabre', 0.04], ['studded_shield', 0.03]]),
  M('troll', 'Troll', '🧟', 50, 20, 3, 12, 4, 16, 2000, [0, 20], [['leather_boots', 0.05], ['wooden_shield', 0.06], ['hand_axe', 0.05]]),
  M('orc', 'Orc', '👹', 70, 25, 6, 15, 5, 20, 1900, [0, 30], [['axe', 0.05], ['studded_armor', 0.03]]),
  M('rotworm', 'Rotworm', '🪱', 65, 40, 6, 15, 6, 22, 2000, [0, 25], [['meat', 0.2], ['bone', 0.1]]),
  M('minotaur', 'Minotaur', '🐂', 100, 50, 8, 18, 8, 28, 1900, [0, 40], [['minotaur_leather', 0.1], ['mace', 0.04], ['chain_armor', 0.02]]),
  M('minotaur_archer', 'Minotaur Archer', '🏹', 100, 65, 8, 18, 10, 34, 1800, [0, 45], [['arrow', 0.5, 3, 9], ['bow', 0.03], ['minotaur_leather', 0.1]]),
  M('minotaur_guard', 'Minotaur Guard', '🐃', 185, 150, 14, 25, 14, 50, 1800, [10, 90], [['minotaur_leather', 0.12], ['battle_axe', 0.03], ['brass_armor', 0.02]]),

  // ---------------------------------------------------------- Mainland, early
  M('ghoul', 'Ghoul', '🧟‍♂️', 100, 240, 10, 20, 12, 40, 2000, [0, 100], [['bone', 0.2], ['ham', 0.15], ['steel_helmet', 0.01]]),
  M('demon_skeleton', 'Demon Skeleton', '☠️', 240, 260, 16, 28, 18, 55, 2000, [20, 130], [['bone', 0.25], ['battle_hammer', 0.03], ['brass_legs', 0.04]]),
  M('mummy', 'Mummy', '🧻', 240, 150, 18, 26, 16, 48, 2200, [0, 120], [['silver_amulet', 0.03], ['bone', 0.2]]),
  M('beholder', 'Beholder', '👁️', 150, 130, 12, 22, 14, 42, 1900, [0, 110], [['mana_potion', 0.08], ['blank_rune', 0.1, 1, 2]]),
  M('orc_warrior', 'Orc Warrior', '👹', 125, 100, 10, 22, 12, 38, 1900, [0, 65], [['battle_axe', 0.03], ['brass_helmet', 0.04]]),
  M('orc_berserker', 'Orc Berserker', '🪓', 210, 195, 14, 26, 18, 56, 1700, [10, 95], [['double_axe', 0.02], ['brass_armor', 0.03]]),
  M('orc_shaman', 'Orc Shaman', '🔮', 115, 110, 8, 20, 12, 40, 2000, [0, 70], [['blank_rune', 0.15, 1, 3], ['mana_potion', 0.08]]),
  M('orc_leader', 'Orc Leader', '👑', 230, 270, 18, 30, 20, 62, 1800, [30, 150], [['plate_shield', 0.05], ['chain_armor', 0.05]]),
  M('dwarf_soldier', 'Dwarf Soldier', '🧔', 135, 145, 14, 25, 14, 44, 1900, [0, 90], [['small_amethyst', 0.03], ['battle_hammer', 0.03]]),
  M('dwarf_guard', 'Dwarf Guard', '🪖', 220, 165, 18, 30, 18, 58, 1800, [20, 120], [['small_sapphire', 0.03], ['steel_helmet', 0.02], ['plate_shield', 0.04]]),
  M('fire_devil', 'Fire Devil', '😈', 160, 250, 12, 26, 20, 60, 1800, [20, 130], [['blank_rune', 0.1, 1, 2], ['rune_fireball', 0.04]]),

  // ------------------------------------------------------------ Mid / deserts
  M('minotaur_mage', 'Minotaur Mage', '🧙', 232, 300, 12, 28, 22, 70, 1900, [20, 160], [['minotaur_leather', 0.12], ['rune_great_fireball', 0.02]]),
  M('wyvern', 'Wyvern', '🐲', 925, 515, 26, 40, 35, 105, 1800, [50, 250], [['dragon_scale', 0.05], ['power_ring', 0.02]]),
  M('giant_spider', 'Giant Spider', '🕸️', 1000, 900, 28, 42, 40, 130, 1700, [60, 300], [['giant_spider_silk', 0.08], ['plate_shield', 0.05], ['knight_legs', 0.005]]),

  // --------------------------------------------------- Edron / Cyclopolis
  M('cyclops', 'Cyclops', '👁️‍🗨️', 260, 150, 20, 28, 20, 60, 2000, [20, 110], [['meat', 0.25], ['battle_hammer', 0.03], ['plate_shield', 0.03]]),
  M('stone_golem', 'Stone Golem', '🗿', 200, 190, 28, 32, 20, 58, 2000, [0, 0], [['small_emerald', 0.04], ['small_diamond', 0.01], ['stone_skin_amulet', 0.005]]),
  M('dwarf_geomancer', 'Dwarf Geomancer', '🔮', 250, 220, 16, 30, 25, 75, 1900, [30, 160], [['small_sapphire', 0.03], ['mana_potion', 0.1], ['blank_rune', 0.15, 1, 3]]),
  M('elder_beholder', 'Elder Beholder', '👀', 350, 380, 18, 32, 28, 85, 1800, [40, 200], [['mana_potion', 0.12], ['rune_great_fireball', 0.03], ['blank_rune', 0.15, 1, 3]]),
  M('green_djinn', 'Green Djinn', '🧞', 800, 350, 22, 34, 30, 90, 1900, [50, 220], [['blank_rune', 0.2, 1, 3], ['silver_amulet', 0.04], ['mana_potion', 0.12]]),
  M('efreet', 'Efreet', '🧞‍♂️', 550, 680, 24, 38, 40, 115, 1800, [80, 300], [['rune_great_fireball', 0.06], ['protection_amulet', 0.03], ['great_mana_potion', 0.05]]),

  // ------------------------------------------------------- Drefia / Ghostlands
  M('vampire', 'Vampire', '🧛', 475, 305, 20, 34, 30, 88, 1800, [40, 190], [['bone', 0.2], ['silver_amulet', 0.04], ['dragon_necklace', 0.01]]),
  M('necromancer', 'Necromancer', '🕯️', 580, 580, 22, 38, 38, 110, 1800, [60, 250], [['blank_rune', 0.2, 1, 3], ['rune_sudden_death', 0.02], ['mana_potion', 0.15]]),
  M('banshee', 'Banshee', '👻', 1000, 900, 24, 40, 45, 130, 1800, [80, 320], [['rune_ultimate_healing', 0.04], ['silver_amulet', 0.06], ['crown_helmet', 0.004]]),
  M('lich', 'Lich', '💀', 880, 780, 26, 42, 48, 140, 1800, [100, 380], [['rune_sudden_death', 0.05], ['dragon_necklace', 0.02], ['gold_ring', 0.03]]),

  // --------------------------------------------------------------- Dragons etc
  M('dragon', 'Dragon', '🐉', 1000, 700, 25, 40, 40, 120, 1800, [50, 280], [['dragon_scale', 0.08], ['dragon_necklace', 0.02], ['steel_helmet', 0.02], ['dragon_ham', 0.2]]),
  M('dragon_lord', 'Dragon Lord', '🐲', 1900, 2100, 32, 50, 60, 190, 1700, [150, 550], [['dragon_scale', 0.15], ['dragon_shield', 0.01], ['royal_helmet', 0.003], ['dragon_ham', 0.3]]),

  // ------------------------------------------------- Deep Kazordoon / Hellgate
  M('black_knight', 'Black Knight', '🏴', 1400, 1200, 32, 48, 60, 175, 1700, [150, 500], [['knight_armor', 0.004], ['knight_legs', 0.004], ['battle_hammer', 0.05], ['great_health_potion', 0.05]]),
  M('hero', 'Hero', '🦸', 1400, 1000, 30, 46, 55, 165, 1700, [140, 480], [['crown_armor', 0.004], ['crown_helmet', 0.006], ['boots_of_haste', 0.002], ['great_health_potion', 0.06]]),
  M('behemoth', 'Behemoth', '👹', 4000, 2500, 40, 56, 85, 260, 1600, [300, 1000], [['giant_spider_silk', 0.05], ['small_diamond', 0.04], ['war_hammer', 0.003], ['great_health_potion', 0.1]]),

  // --------------------------------------------------------------- Late game
  M('warlock', 'Warlock', '🧙‍♂️', 1000, 4000, 26, 48, 95, 300, 1600, [300, 900], [['rune_sudden_death', 0.1, 1, 2], ['magic_plate_armor', 0.001], ['great_mana_potion', 0.15]]),
  M('demon', 'Demon', '👿', 8200, 6000, 44, 64, 110, 380, 1500, [500, 1800], [['demon_dust', 0.15], ['demon_shield', 0.003], ['demon_helmet', 0.002], ['magic_sword', 0.001], ['great_mana_potion', 0.2]]),
].map((m) => [m.id, m]));

export function getMonster(id) {
  const m = MONSTERS[id];
  if (!m) throw new Error(`unknown monster: ${id}`);
  return m;
}
