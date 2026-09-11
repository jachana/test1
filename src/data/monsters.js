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
  M('dwarf_soldier', 'Dwarf Soldier', '🧔', 135, 145, 14, 25, 14, 44, 1900, [0, 90], [['iron_ore', 0.08], ['battle_hammer', 0.03]]),
  M('dwarf_guard', 'Dwarf Guard', '🪖', 220, 165, 18, 30, 18, 58, 1800, [20, 120], [['iron_ore', 0.1], ['steel_helmet', 0.02], ['plate_shield', 0.04]]),
  M('fire_devil', 'Fire Devil', '😈', 160, 250, 12, 26, 20, 60, 1800, [20, 130], [['blank_rune', 0.1, 1, 2], ['rune_fireball', 0.04]]),

  // ------------------------------------------------------------ Mid / deserts
  M('scarab', 'Scarab', '🪲', 240, 180, 22, 30, 18, 52, 2000, [0, 100], [['scarab_shell', 0.08]]),
  M('ancient_scarab', 'Ancient Scarab', '🟫', 1100, 1500, 30, 45, 40, 120, 1800, [100, 400], [['scarab_shell', 0.2], ['crown_helmet', 0.01]]),
  M('larva', 'Larva', '🐛', 75, 90, 8, 18, 10, 32, 2000, [0, 60], [['meat', 0.2]]),
  M('minotaur_mage', 'Minotaur Mage', '🧙', 232, 300, 12, 28, 22, 70, 1900, [20, 160], [['minotaur_leather', 0.12], ['rune_great_fireball', 0.02]]),
  M('wyvern', 'Wyvern', '🐲', 925, 515, 26, 40, 35, 105, 1800, [50, 250], [['dragon_scale', 0.05], ['power_ring', 0.02]]),
  M('giant_spider', 'Giant Spider', '🕸️', 1000, 900, 28, 42, 40, 130, 1700, [60, 300], [['giant_spider_silk', 0.08], ['plate_shield', 0.05], ['knight_legs', 0.005]]),

  // --------------------------------------------------------------- Dragons etc
  M('dragon', 'Dragon', '🐉', 1000, 700, 25, 40, 40, 120, 1800, [50, 280], [['dragon_scale', 0.08], ['dragon_necklace', 0.02], ['steel_helmet', 0.02], ['dragon_ham', 0.2]]),
  M('dragon_lord', 'Dragon Lord', '🐲', 1900, 2100, 32, 50, 60, 190, 1700, [150, 550], [['dragon_scale', 0.15], ['dragon_shield', 0.01], ['royal_helmet', 0.003], ['dragon_ham', 0.3]]),
  M('wyrm', 'Wyrm', '🪰', 1825, 1550, 30, 46, 50, 160, 1700, [120, 420], [['dragon_scale', 0.1], ['crystal_ore', 0.05]]),
  M('frost_dragon', 'Frost Dragon', '❄️', 1400, 2100, 32, 48, 55, 175, 1700, [150, 500], [['dragon_scale', 0.12], ['crown_armor', 0.005], ['great_health_potion', 0.05]]),
  M('hellhound', 'Hellhound', '🔥', 5000, 6000, 40, 60, 90, 300, 1500, [400, 1200], [['demon_dust', 0.1], ['great_health_potion', 0.1]]),

  // --------------------------------------------------------------- Late game
  M('hydra', 'Hydra', '🐍', 2350, 3000, 34, 52, 70, 220, 1700, [200, 700], [['hydra_head', 0.1], ['great_health_potion', 0.08], ['tower_shield', 0.004]]),
  M('serpent_spawn', 'Serpent Spawn', '🐊', 1800, 3000, 36, 54, 75, 230, 1700, [250, 800], [['soul_orb', 0.15], ['guardian_shield', 0.004]]),
  M('medusa', 'Medusa', '🦎', 3000, 3500, 38, 56, 80, 250, 1700, [300, 900], [['soul_orb', 0.15], ['boots_of_haste', 0.003]]),
  M('warlock', 'Warlock', '🧙‍♂️', 1000, 4000, 26, 48, 95, 300, 1600, [300, 900], [['rune_sudden_death', 0.1, 1, 2], ['magic_plate_armor', 0.001], ['great_mana_potion', 0.15]]),
  M('ghastly_dragon', 'Ghastly Dragon', '👻', 7200, 4000, 42, 60, 100, 320, 1600, [400, 1400], [['soul_orb', 0.2], ['dragon_claw', 0.002]]),
  M('demon', 'Demon', '👿', 8200, 6000, 44, 64, 110, 380, 1500, [500, 1800], [['demon_dust', 0.15], ['demon_shield', 0.003], ['demon_helmet', 0.002], ['magic_sword', 0.001], ['great_mana_potion', 0.2]]),
  M('juggernaut', 'Juggernaut', '🤖', 8000, 9000, 50, 70, 130, 450, 1500, [700, 2200], [['soul_orb', 0.25], ['thunder_hammer', 0.002], ['ravagers_axe', 0.003]]),
].map((m) => [m.id, m]));

export function getMonster(id) {
  const m = MONSTERS[id];
  if (!m) throw new Error(`unknown monster: ${id}`);
  return m;
}
