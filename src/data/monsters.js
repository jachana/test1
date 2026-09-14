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
  M('rat', 'Rat', '🐀', 20, 5, 1, 2, 1, 6, 2400, [0, 4], []),
  M('cave_rat', 'Cave Rat', '🐁', 30, 10, 1, 3, 2, 10, 2200, [0, 12], []),
  M('spider', 'Spider', '🕷️', 20, 12, 2, 2, 3, 12, 2000, [0, 8], []),
  M('wolf', 'Wolf', '🐺', 25, 18, 1, 4, 4, 15, 1800, [0, 15], [['meat', 0.9, 1, 3], ['wolf_paw', 0.06666]]),
  M('goblin', 'Goblin', '👺', 50, 25, 6, 8, 3, 14, 2000, [2, 20], [['leather_helmet', 0.1], ['short_sword', 0.1], ['leather_armor', 0.1], ['raw_fish', 0.2, 1, 2], ['bone', 0.1]]),
  M('skeleton', 'Skeleton', '💀', 50, 35, 2, 9, 4, 18, 2000, [0, 25], [['legion_helmet', 0.06666], ['mace', 0.1], ['brass_shield', 0.05], ['viking_helmet', 0.05], ['sword', 0.03333]]),
  M('troll', 'Troll', '🧟', 50, 20, 6, 8, 4, 16, 2000, [0, 20], [['spear', 0.33333], ['leather_boots', 0.1], ['leather_helmet', 0.2], ['bronze_amulet', 0.03333], ['wooden_shield', 0.06666], ['meat', 0.3, 1, 2], ['hand_axe', 0.1], ['silver_amulet', 0.01428]]),
  M('orc', 'Orc', '👹', 70, 25, 4, 8, 5, 20, 1900, [0, 30], [['meat', 0.33333, 1, 2], ['studded_armor', 0.1], ['legion_helmet', 0.1], ['sabre', 0.1], ['studded_shield', 0.1], ['axe', 0.1]]),
  M('rotworm', 'Rotworm', '🪱', 65, 40, 8, 11, 6, 22, 2000, [0, 25], [['legion_helmet', 0.015], ['copper_shield', 0.02857], ['meat', 0.2, 1, 2], ['ham', 0.2, 1, 2], ['mace', 0.03333], ['sword', 0.1], ['katana', 0.01]]),
  M('minotaur', 'Minotaur', '🐂', 100, 50, 11, 11, 8, 28, 1900, [0, 40], [['chain_armor', 0.1], ['axe', 0.1], ['leather_legs', 0.1], ['minotaur_leather', 0.05], ['chain_helmet', 0.1], ['brass_helmet', 0.1], ['plate_shield', 0.1], ['mace', 0.1], ['bronze_amulet', 0.025]]),
  M('minotaur_archer', 'Minotaur Archer', '🏹', 100, 65, 7, 8, 10, 34, 1800, [0, 45], [['bolt', 0.7, 1, 18], ['meat', 0.5, 1, 3], ['scale_armor', 0.1], ['soldier_helmet', 0.06666], ['minotaur_leather', 0.05], ['crossbow', 0.06666], ['brass_armor', 0.05], ['chain_armor', 0.1], ['chain_legs', 0.04], ['chain_helmet', 0.1]]),
  M('minotaur_guard', 'Minotaur Guard', '🐃', 185, 160, 15, 25, 14, 50, 1800, [10, 90], [['meat', 0.7, 1, 3], ['double_axe', 0.05], ['leather_legs', 0.1], ['minotaur_leather', 0.05], ['axe', 0.06666], ['chain_legs', 0.05], ['chain_helmet', 0.1], ['brass_armor', 0.025], ['battle_shield', 0.1]]),

  // ---------------------------------------------------------- Mainland, early
  M('ghoul', 'Ghoul', '🧟‍♂️', 100, 85, 8, 17, 12, 40, 2000, [0, 100], [['scale_armor', 0.1], ['viking_helmet', 0.06666], ['mace', 0.2], ['brass_helmet', 0.06666], ['skull', 0.2, 1, 2], ['life_ring', 0.025]]),
  M('demon_skeleton', 'Demon Skeleton', '☠️', 400, 240, 25, 25, 18, 55, 2000, [20, 130], [['guardian_shield', 0.004], ['mind_stone', 0.01], ['battle_hammer', 0.05], ['studded_helmet', 0.02857], ['mace', 0.1]]),
  M('mummy', 'Mummy', '🧻', 240, 150, 14, 20, 16, 48, 2200, [0, 120], [['silver_brooch', 0.06666], ['black_shield', 0.02557], ['black_pearl', 0.05, 1, 2], ['crystal_ring', 0.02], ['time_ring', 0.01333], ['silver_amulet', 0.025]]),
  M('beholder', 'Beholder', '👁️', 260, 170, 15, 10, 14, 42, 1900, [0, 110], [['spellbook', 0.04], ['steel_shield', 0.03333], ['two_handed_sword', 0.02], ['wooden_shield', 0.03], ['morning_star', 0.05], ['longsword', 0.06666]]),
  M('orc_warrior', 'Orc Warrior', '👹', 125, 50, 8, 14, 12, 38, 1900, [0, 65], [['meat', 0.4, 1, 2], ['wooden_shield', 0.1], ['copper_shield', 0.04], ['sabre', 0.06666], ['chain_armor', 0.05]]),
  M('orc_berserker', 'Orc Berserker', '🪓', 210, 195, 15, 12, 18, 56, 1700, [10, 95], [['meat', 0.33333, 1, 3], ['halberd', 0.06666], ['chain_armor', 0.1], ['chain_helmet', 0.1], ['battle_axe', 0.05]]),
  M('orc_shaman', 'Orc Shaman', '🔮', 115, 110, 8, 10, 12, 40, 2000, [0, 70], [['chain_helmet', 0.02222], ['spear', 0.04]]),
  M('orc_leader', 'Orc Leader', '👑', 450, 270, 20, 30, 20, 62, 1800, [30, 150], [['scimitar', 0.1], ['plate_shield', 0.05], ['raw_fish', 0.2], ['plate_legs', 0.01818], ['broadsword', 0.02857], ['sword_ring', 0.02], ['meat', 0.33333, 1, 2], ['warrior_helmet', 0.01], ['longsword', 0.1], ['brass_legs', 0.02857], ['plate_armor', 0.01818]]),
  M('dwarf_soldier', 'Dwarf Soldier', '🧔', 135, 70, 9, 20, 14, 44, 1900, [0, 90], [['bolt', 0.2, 1, 10], ['soldier_helmet', 0.1], ['crossbow', 0.1], ['chain_armor', 0.2], ['leather_boots', 0.25], ['dwarven_shield', 0.01666], ['battle_axe', 0.03333], ['dwarven_ring', 0.025]]),
  M('dwarf_guard', 'Dwarf Guard', '🪖', 245, 165, 15, 22, 18, 58, 1800, [20, 120], [['scale_armor', 0.2], ['battle_hammer', 0.33333], ['double_axe', 0.25], ['iron_helmet', 0.1], ['battle_shield', 0.06666], ['small_amethyst', 0.04, 1, 2], ['battle_axe', 0.05], ['time_ring', 0.025]]),
  M('fire_devil', 'Fire Devil', '😈', 200, 110, 13, 15, 20, 60, 1800, [20, 130], [['meat', 0.33333, 1, 3], ['scimitar', 0.1], ['double_axe', 0.05], ['guardian_shield', 0.02857], ['blank_rune', 0.06666], ['small_amethyst', 0.01666, 1, 2]]),

  // ------------------------------------------------------------ Mid / deserts
  M('minotaur_mage', 'Minotaur Mage', '🧙', 155, 150, 18, 20, 22, 70, 1900, [20, 160], [['leather_helmet', 0.08], ['leather_legs', 0.08], ['minotaur_leather', 0.05], ['brass_armor', 0.04], ['chain_legs', 0.04]]),
  M('wyvern', 'Wyvern', '🐲', 795, 515, 25, 18, 35, 105, 1800, [50, 250], [['dragon_ham', 0.2, 1, 3], ['power_bolt', 0.01667, 1, 3], ['plate_legs', 0.02], ['small_sapphire', 0.01]]),
  M('giant_spider', 'Giant Spider', '🕸️', 1300, 900, 20, 20, 40, 130, 1700, [60, 300], [['time_ring', 0.008], ['plate_armor', 0.04], ['platinum_amulet', 0.004], ['giant_spider_silk', 0.05], ['steel_helmet', 0.05], ['knight_armor', 0.007], ['knight_legs', 0.005], ['brass_legs', 0.1], ['strong_health_potion', 0.005]]),

  // --------------------------------------------------- Edron / Cyclopolis
  M('cyclops', 'Cyclops', '👁️‍🗨️', 260, 150, 15, 20, 20, 60, 2000, [20, 110], [['short_sword', 0.33333], ['club_ring', 0.02], ['meat', 0.33333, 1, 3], ['battle_shield', 0.025], ['brass_shield', 0.02857], ['halberd', 0.05], ['ham', 0.33333, 1, 3]]),
  M('stone_golem', 'Stone Golem', '🗿', 270, 280, 10, 18, 20, 58, 2000, [0, 0], [['scale_armor', 0.1], ['carlin_sword', 0.025]]),
  M('dwarf_geomancer', 'Dwarf Geomancer', '🔮', 380, 245, 15, 15, 25, 75, 1900, [30, 160], [['blank_rune', 0.04], ['leather_legs', 0.1], ['leather_boots', 0.2]]),
  M('elder_beholder', 'Elder Beholder', '👀', 1100, 280, 13, 26, 28, 85, 1800, [40, 200], [['steel_shield', 0.06], ['longsword', 0.12], ['djinn_blade', 0.003], ['two_handed_sword', 0.06], ['spellbook', 0.01], ['morning_star', 0.1], ['clerical_mace', 0.05], ['war_hammer', 0.01333]]),
  M('green_djinn', 'Green Djinn', '🧞', 330, 215, 18, 10, 30, 90, 1900, [50, 220], [['small_emerald', 0.06666, 1, 4]]),
  M('efreet', 'Efreet', '🧞‍♂️', 550, 325, 15, 20, 40, 115, 1800, [80, 300], [['green_gem', 0.001], ['small_emerald', 0.07, 1, 2]]),

  // ------------------------------------------------------- Drefia / Ghostlands
  M('vampire', 'Vampire', '🧛', 450, 305, 17, 23, 30, 88, 1800, [40, 190], [['leather_legs', 0.08], ['spike_sword', 0.01666], ['vampire_dust', 0.02], ['bronze_amulet', 0.002], ['skull', 0.1, 1, 3], ['katana', 0.15], ['vampire_shield', 0.005], ['ice_rapier', 0.006], ['black_pearl', 0.01538, 1, 3]]),
  M('necromancer', 'Necromancer', '🕯️', 580, 580, 20, 20, 38, 110, 1800, [60, 250], [['short_sword', 0.15], ['katana', 0.1], ['scale_armor', 0.1], ['skull', 0.2, 1, 3], ['skull_staff', 0.00833], ['boots_of_haste', 0.00666], ['clerical_mace', 0.05]]),
  M('banshee', 'Banshee', '👻', 1000, 900, 15, 20, 45, 130, 1800, [80, 320], [['black_pearl', 0.01, 1, 3], ['life_ring', 0.01333], ['silver_amulet', 0.02], ['blue_robe', 0.006]]),
  M('lich', 'Lich', '💀', 880, 900, 20, 20, 48, 140, 1800, [100, 380], [['platinum_amulet', 0.01666], ['blue_robe', 0.00709], ['stealth_ring', 0.00888], ['spellbook', 0.1], ['gold_ring', 0.009]]),

  // --------------------------------------------------------------- Dragons etc
  M('dragon', 'Dragon', '🐉', 1000, 700, 25, 18, 40, 120, 1800, [50, 280], [['dragon_ham', 0.2, 1, 2], ['mace', 0.2], ['crossbow', 0.06666], ['dragon_hammer', 0.01333], ['steel_shield', 0.01818], ['short_sword', 0.2], ['plate_legs', 0.02222], ['steel_helmet', 0.03333], ['double_axe', 0.04], ['longsword', 0.05], ['green_dragon_leather', 0.04], ['dragon_shield', 0.006], ['small_diamond', 0.01538, 1, 3], ['broadsword', 0.06666], ['serpent_sword', 0.00509], ['green_dragon_scale', 0.05]]),
  M('dragon_lord', 'Dragon Lord', '🐲', 1900, 2100, 22, 35, 60, 190, 1700, [150, 550], [['dragon_ham', 0.2, 1, 2], ['golden_mug', 0.01818], ['gemmed_book', 0.03333], ['broadsword', 0.05], ['royal_helmet', 0.00588], ['dragon_scale_mail', 0.00333], ['power_bolt', 0.02222, 1, 10], ['red_dragon_leather', 0.05], ['small_emerald', 0.00833, 1, 2], ['fire_sword', 0.01428], ['small_sapphire', 0.02222, 1, 2], ['tower_shield', 0.01333], ['dragon_lance', 0.00909], ['dragon_scale', 0.05]]),

  // ------------------------------------------------- Deep Kazordoon / Hellgate
  M('black_knight', 'Black Knight', '🏴', 1800, 1600, 25, 30, 60, 175, 1700, [150, 500], [['steel_helmet', 0.1], ['battle_hammer', 0.07], ['knight_armor', 0.008], ['dark_armor', 0.01428], ['halberd', 0.09], ['spear', 0.2], ['knight_legs', 0.01], ['brass_legs', 0.13], ['warrior_helmet', 0.02], ['plate_armor', 0.025], ['double_axe', 0.06666], ['two_handed_sword', 0.02857], ['knight_axe', 0.01333], ['dragon_lance', 0.00909], ['boots_of_haste', 0.00555]]),
  M('hero', 'Hero', '🦸', 1400, 1200, 30, 20, 55, 165, 1700, [140, 480], [['crown_helmet', 0.012], ['bow', 0.1], ['meat', 0.2, 1, 3], ['two_handed_sword', 0.015], ['crown_armor', 0.006], ['fire_sword', 0.007], ['crown_shield', 0.009], ['crown_legs', 0.008], ['arrow', 0.2, 1, 13], ['might_ring', 0.01], ['war_hammer', 0.01333]]),
  M('behemoth', 'Behemoth', '👹', 4000, 2500, 40, 45, 85, 260, 1600, [300, 1000], [['ham', 0.1, 1, 3], ['double_axe', 0.02], ['two_handed_sword', 0.04], ['big_bone', 0.07], ['behemoth_claw', 0.015], ['giant_sword', 0.00688], ['war_axe', 0.00488], ['small_amethyst', 0.04, 1, 2], ['plate_armor', 0.02], ['meat', 0.4, 1, 6], ['dark_armor', 0.03], ['steel_boots', 0.004]]),

  // --------------------------------------------------------------- Late game
  M('warlock', 'Warlock', '🧙‍♂️', 3500, 4000, 25, 30, 95, 300, 1600, [300, 900], [['crystal_ring', 0.01], ['talon', 0.011, 1, 2], ['small_sapphire', 0.014, 1, 2], ['mind_stone', 0.025], ['blue_robe', 0.02], ['golden_armor', 0.00588], ['skull_staff', 0.01428]]),
  M('demon', 'Demon', '👿', 8200, 6000, 50, 55, 110, 380, 1500, [500, 1800], [['giant_sword', 0.01428], ['mastermind_shield', 0.005], ['magic_plate_armor', 0.0013], ['demon_dust', 0.01], ['demon_horn', 0.01], ['might_ring', 0.002], ['stealth_ring', 0.014], ['ring_of_healing', 0.005], ['ice_rapier', 0.006], ['gold_ring', 0.011], ['talon', 0.04, 1, 4], ['devil_helmet', 0.012], ['small_emerald', 0.11, 1, 3], ['platinum_amulet', 0.008], ['double_axe', 0.2], ['golden_legs', 0.004], ['demon_shield', 0.007], ['two_handed_sword', 0.03333]]),
  // ------------------------------------------------------------------ bosses
  // The only creatures in the game with a name rather than a species. They live
  // in one area, behind the quest that kills them once, and they come back —
  // which is the point: everything else in Tibia ends, and the citadel does not.
  //
  // Sized against tools/balance.mjs rather than against the lore. At the health
  // the real Ferumbras has, a best-geared level 150 knight spends four and a
  // half minutes in one fight taking three hundred damage a second, which is
  // not a boss, it is a wall. These are fights you can lose, not ones you
  // cannot win: about ninety seconds each, and they still empty a backpack.
  M('orshabaal', 'Orshabaal', '👹', 7500, 9000, 48, 55, 100, 300, 1700, [1500, 4000], [['demon_shield', 0.04], ['golden_armor', 0.03], ['magic_plate_armor', 0.012], ['demon_horn', 0.3, 1, 3], ['talon', 0.2, 1, 5], ['small_emerald', 0.4, 2, 6], ['golden_legs', 0.02], ['might_ring', 0.05], ['platinum_amulet', 0.05]]),
  M('ghazbaran', 'Ghazbaran', '🦇', 9000, 11000, 50, 58, 110, 330, 1700, [1800, 4500], [['mastermind_shield', 0.035], ['magic_plate_armor', 0.015], ['demon_dust', 0.3, 1, 3], ['stealth_ring', 0.1], ['small_sapphire', 0.4, 2, 6], ['dragon_scale_mail', 0.012], ['crystal_ring', 0.1], ['ring_of_healing', 0.06]]),
  M('ferumbras', 'Ferumbras', '🧙‍♂️', 13000, 17000, 52, 62, 120, 380, 1600, [2500, 6000], [['magic_plate_armor', 0.03], ['demon_armor', 0.02], ['golden_legs', 0.04], ['dragon_scale_mail', 0.02], ['thunder_hammer', 0.03], ['magic_sword', 0.03], ['royal_helmet', 0.06], ['small_diamond', 0.5, 2, 8], ['gold_ring', 0.15], ['blue_robe', 0.08]]),
].map((m) => [m.id, m]));

/**
 * Champions: the same creature, but the one that has been eating.
 *
 * Roughly one spawn in forty comes up bigger, hits harder, and is worth three
 * times as much — and rolls its loot table twice, so the drop you have been
 * hunting for is twice as likely out of it. It is the reason to glance at a tab
 * you left running: an hour of rats is an hour of rats, but somewhere in it is
 * a Champion Rat worth stopping for.
 *
 * Attack speed is deliberately not scaled: a champion is a longer, heavier
 * fight, not a faster one.
 */
export const CHAMPION_CHANCE = 0.025;
export const CHAMPION = { hp: 2.6, damage: 1.35, exp: 3, gold: 3, lootRolls: 2 };

/** The champion version of a creature. Pure: it does not touch game state. */
export function asChampion(monster) {
  return {
    ...monster,
    name: `Champion ${monster.name}`,
    hp: Math.round(monster.hp * CHAMPION.hp),
    min: Math.round(monster.min * CHAMPION.damage),
    max: Math.round(monster.max * CHAMPION.damage),
    exp: Math.round(monster.exp * CHAMPION.exp),
    gold: [Math.round(monster.gold[0] * CHAMPION.gold), Math.round(monster.gold[1] * CHAMPION.gold)],
    champion: true,
  };
}

export function getMonster(id) {
  const m = MONSTERS[id];
  if (!m) throw new Error(`unknown monster: ${id}`);
  return m;
}
