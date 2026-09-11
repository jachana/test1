// Item catalogue. `wt` is weight in tenths of an ounce (Tibia-style), `value` is
// the NPC sell price in gold coins.
//
// Shorthand used below:
//   atk  weapon attack        def  shield/weapon defence
//   arm  armour points        ws   weapon skill the item trains

const W = (id, name, icon, ws, atk, def, wt, value, extra = {}) => ({
  id, name, icon, type: 'weapon', slot: 'weapon', ws, atk, def, wt, value, ...extra,
});
const A = (id, name, icon, slot, arm, wt, value, extra = {}) => ({
  id, name, icon, type: 'armour', slot, arm, wt, value, ...extra,
});
const S = (id, name, icon, def, wt, value, extra = {}) => ({
  id, name, icon, type: 'shield', slot: 'shield', def, wt, value, ...extra,
});

export const ITEMS = Object.fromEntries([
  // ---------------------------------------------------------------- currency
  { id: 'gold_coin', name: 'Gold Coin', icon: '🪙', type: 'currency', wt: 1, value: 1 },
  { id: 'platinum_coin', name: 'Platinum Coin', icon: '🟡', type: 'currency', wt: 1, value: 100 },

  // ------------------------------------------------------------------ swords
  W('rapier', 'Rapier', '🗡️', 'sword', 10, 6, 110, 15),
  W('sabre', 'Sabre', '🗡️', 'sword', 13, 8, 190, 35),
  W('short_sword', 'Short Sword', '🗡️', 'sword', 11, 10, 160, 30),
  W('sword', 'Sword', '⚔️', 'sword', 15, 12, 350, 85),
  W('longsword', 'Longsword', '⚔️', 'sword', 20, 16, 420, 160),
  W('bright_sword', 'Bright Sword', '⚔️', 'sword', 30, 22, 540, 6000),
  W('fire_sword', 'Fire Sword', '🔥', 'sword', 24, 20, 230, 4000, { elem: 'fire', elemDmg: 11 }),
  W('giant_sword', 'Giant Sword', '⚔️', 'sword', 42, 22, 2000, 17000, { twoHanded: true }),
  W('magic_sword', 'Magic Sword', '✨', 'sword', 48, 35, 420, 60000),

  // -------------------------------------------------------------------- axes
  W('hand_axe', 'Hand Axe', '🪓', 'axe', 8, 4, 190, 8),
  W('axe', 'Axe', '🪓', 'axe', 12, 6, 250, 20),
  W('battle_axe', 'Battle Axe', '🪓', 'axe', 20, 14, 350, 235),
  W('double_axe', 'Double Axe', '🪓', 'axe', 25, 18, 600, 1500, { twoHanded: true }),
  W('great_axe', 'Great Axe', '🪓', 'axe', 45, 25, 1500, 20000, { twoHanded: true }),
  W('ravagers_axe', "Ravager's Axe", '🪓', 'axe', 44, 28, 1900, 40000, { twoHanded: true }),

  // ------------------------------------------------------------------- clubs
  W('club', 'Club', '🏑', 'club', 8, 4, 190, 5),
  W('mace', 'Mace', '🔨', 'club', 16, 12, 380, 90),
  W('battle_hammer', 'Battle Hammer', '🔨', 'club', 22, 15, 450, 350),
  W('war_hammer', 'War Hammer', '🔨', 'club', 45, 20, 1200, 12000, { twoHanded: true }),
  W('thunder_hammer', 'Thunder Hammer', '⚡', 'club', 46, 30, 1200, 80000, { twoHanded: true }),

  // ---------------------------------------------------------------- distance
  W('spear', 'Spear', '🔱', 'distance', 25, 0, 200, 10, { ranged: true }),
  W('bow', 'Bow', '🏹', 'distance', 28, 0, 280, 400, { ranged: true, twoHanded: true, ammo: 'arrow' }),
  W('crossbow', 'Crossbow', '🏹', 'distance', 32, 0, 420, 500, { ranged: true, twoHanded: true, ammo: 'bolt' }),
  W('royal_crossbow', 'Royal Crossbow', '🏹', 'distance', 45, 0, 420, 60000, { ranged: true, twoHanded: true, ammo: 'bolt' }),
  { id: 'arrow', name: 'Arrow', icon: '➡️', type: 'ammo', ammo: 'arrow', atk: 6, wt: 7, value: 3 },
  { id: 'bolt', name: 'Bolt', icon: '➡️', type: 'ammo', ammo: 'bolt', atk: 8, wt: 8, value: 4 },
  { id: 'power_bolt', name: 'Power Bolt', icon: '💠', type: 'ammo', ammo: 'bolt', atk: 15, wt: 9, value: 7 },

  // ------------------------------------------------------------------ armour
  A('leather_armor', 'Leather Armor', '🧥', 'armour', 4, 90, 12),
  A('studded_armor', 'Studded Armor', '🧥', 'armour', 5, 110, 45),
  A('chain_armor', 'Chain Armor', '🧥', 'armour', 7, 230, 110),
  A('brass_armor', 'Brass Armor', '🧥', 'armour', 9, 275, 450),
  A('plate_armor', 'Plate Armor', '🧥', 'armour', 11, 800, 1200),
  A('crown_armor', 'Crown Armor', '👑', 'armour', 12, 1100, 12000),
  A('knight_armor', 'Knight Armor', '🛡️', 'armour', 13, 1200, 5000),
  A('magic_plate_armor', 'Magic Plate Armor', '✨', 'armour', 17, 1200, 90000),

  A('leather_helmet', 'Leather Helmet', '🎩', 'helmet', 2, 28, 10),
  A('studded_helmet', 'Studded Helmet', '🎩', 'helmet', 3, 40, 50),
  A('chain_helmet', 'Chain Helmet', '⛑️', 'helmet', 4, 42, 52),
  A('brass_helmet', 'Brass Helmet', '⛑️', 'helmet', 5, 48, 120),
  A('steel_helmet', 'Steel Helmet', '⛑️', 'helmet', 7, 430, 800),
  A('crown_helmet', 'Crown Helmet', '👑', 'helmet', 8, 420, 2500),
  A('royal_helmet', 'Royal Helmet', '👑', 'helmet', 9, 465, 30000),
  A('demon_helmet', 'Demon Helmet', '😈', 'helmet', 12, 470, 50000),

  A('leather_legs', 'Leather Legs', '👖', 'legs', 2, 65, 10),
  A('studded_legs', 'Studded Legs', '👖', 'legs', 3, 80, 40),
  A('chain_legs', 'Chain Legs', '👖', 'legs', 4, 130, 80),
  A('brass_legs', 'Brass Legs', '👖', 'legs', 5, 180, 195),
  A('plate_legs', 'Plate Legs', '👖', 'legs', 7, 400, 400),
  A('knight_legs', 'Knight Legs', '👖', 'legs', 8, 500, 5000),
  A('crown_legs', 'Crown Legs', '👑', 'legs', 8, 450, 12000),

  A('leather_boots', 'Leather Boots', '🥾', 'boots', 1, 28, 8),
  A('steel_boots', 'Steel Boots', '🥾', 'boots', 3, 200, 30000),
  A('boots_of_haste', 'Boots of Haste', '💨', 'boots', 1, 75, 30000, { haste: 0.12 }),

  S('wooden_shield', 'Wooden Shield', '🪵', 10, 180, 15),
  S('studded_shield', 'Studded Shield', '🛡️', 14, 210, 50),
  S('brass_shield', 'Brass Shield', '🛡️', 17, 270, 120),
  S('plate_shield', 'Plate Shield', '🛡️', 20, 400, 240),
  S('tower_shield', 'Tower Shield', '🛡️', 38, 600, 8000),
  S('dragon_shield', 'Dragon Shield', '🐉', 32, 460, 15000),
  S('guardian_shield', 'Guardian Shield', '🛡️', 34, 570, 30000),
  S('demon_shield', 'Demon Shield', '😈', 40, 260, 40000),

  // --------------------------------------------------------- amulets / rings
  { id: 'protection_amulet', name: 'Protection Amulet', icon: '📿', type: 'armour', slot: 'amulet', arm: 2, wt: 43, value: 700 },
  { id: 'silver_amulet', name: 'Silver Amulet', icon: '📿', type: 'armour', slot: 'amulet', arm: 1, wt: 42, value: 100 },
  { id: 'dragon_necklace', name: 'Dragon Necklace', icon: '🐲', type: 'armour', slot: 'amulet', arm: 3, wt: 42, value: 1000 },
  { id: 'stone_skin_amulet', name: 'Stone Skin Amulet', icon: '🪨', type: 'armour', slot: 'amulet', arm: 6, wt: 42, value: 5000 },
  { id: 'life_ring', name: 'Life Ring', icon: '💚', type: 'armour', slot: 'ring', arm: 0, wt: 20, value: 900, regenBonus: 1 },
  { id: 'power_ring', name: 'Power Ring', icon: '💪', type: 'armour', slot: 'ring', arm: 0, wt: 20, value: 100, skillBonus: { all: 3 } },
  { id: 'ring_of_healing', name: 'Ring of Healing', icon: '💞', type: 'armour', slot: 'ring', arm: 0, wt: 20, value: 1000, regenBonus: 2 },
  { id: 'dwarven_ring', name: 'Dwarven Ring', icon: '💍', type: 'armour', slot: 'ring', arm: 0, wt: 20, value: 2000, skillBonus: { mining: 5 } },

  // ----------------------------------------------------------------- potions
  { id: 'health_potion', name: 'Health Potion', icon: '🧪', type: 'potion', heal: 75, wt: 27, value: 45, buy: 50 },
  { id: 'strong_health_potion', name: 'Strong Health Potion', icon: '🧪', type: 'potion', heal: 175, wt: 27, value: 90, buy: 100, reqLevel: 50 },
  { id: 'great_health_potion', name: 'Great Health Potion', icon: '🧪', type: 'potion', heal: 375, wt: 27, value: 170, buy: 190, reqLevel: 80 },
  { id: 'mana_potion', name: 'Mana Potion', icon: '🔵', type: 'potion', mana: 100, wt: 27, value: 45, buy: 50 },
  { id: 'strong_mana_potion', name: 'Strong Mana Potion', icon: '🔵', type: 'potion', mana: 200, wt: 27, value: 70, buy: 80, reqLevel: 50 },
  { id: 'great_mana_potion', name: 'Great Mana Potion', icon: '🔵', type: 'potion', mana: 325, wt: 27, value: 110, buy: 120, reqLevel: 80 },

  // -------------------------------------------------------------------- food
  { id: 'brown_mushroom', name: 'Brown Mushroom', icon: '🍄', type: 'food', food: 6, wt: 4, value: 7 },
  { id: 'fish', name: 'Fish', icon: '🐟', type: 'food', food: 9, wt: 5, value: 5 },
  { id: 'ham', name: 'Ham', icon: '🍖', type: 'food', food: 18, wt: 18, value: 8 },
  { id: 'dragon_ham', name: 'Dragon Ham', icon: '🍗', type: 'food', food: 24, wt: 12, value: 20 },
  { id: 'cake', name: 'Cake', icon: '🍰', type: 'food', food: 30, wt: 10, value: 40 },
  { id: 'roasted_salmon', name: 'Roasted Salmon', icon: '🍣', type: 'food', food: 26, wt: 9, value: 30 },
  { id: 'fish_pie', name: 'Fish Pie', icon: '🥧', type: 'food', food: 45, wt: 15, value: 120 },

  // ------------------------------------------------------------------- runes
  { id: 'blank_rune', name: 'Blank Rune', icon: '⚪', type: 'resource', wt: 12, value: 6, buy: 10 },
  { id: 'rune_light_healing', name: 'Light Healing Rune', icon: '💊', type: 'rune', spell: 'light_healing', charges: 3, wt: 12, value: 20 },
  { id: 'rune_intense_healing', name: 'Intense Healing Rune', icon: '💊', type: 'rune', spell: 'intense_healing', charges: 3, wt: 12, value: 95 },
  { id: 'rune_ultimate_healing', name: 'Ultimate Healing Rune', icon: '💖', type: 'rune', spell: 'ultimate_healing', charges: 2, wt: 12, value: 175 },
  { id: 'rune_fireball', name: 'Fireball Rune', icon: '🔥', type: 'rune', spell: 'fireball', charges: 3, wt: 12, value: 30 },
  { id: 'rune_great_fireball', name: 'Great Fireball Rune', icon: '☄️', type: 'rune', spell: 'great_fireball', charges: 2, wt: 12, value: 120 },
  { id: 'rune_explosion', name: 'Explosion Rune', icon: '💥', type: 'rune', spell: 'explosion', charges: 2, wt: 12, value: 125 },
  { id: 'rune_sudden_death', name: 'Sudden Death Rune', icon: '💀', type: 'rune', spell: 'sudden_death', charges: 1, wt: 12, value: 325 },

  // --------------------------------------------------------------- resources
  { id: 'iron_ore', name: 'Iron Ore', icon: '🪨', type: 'resource', wt: 35, value: 40 },
  { id: 'silver_ore', name: 'Silver Ore', icon: '⚪', type: 'resource', wt: 35, value: 90 },
  { id: 'gold_ore', name: 'Gold Ore', icon: '🟨', type: 'resource', wt: 35, value: 200 },
  { id: 'crystal_ore', name: 'Crystalline Ore', icon: '💎', type: 'resource', wt: 40, value: 450 },
  { id: 'daramanian_ore', name: 'Daramanian Ore', icon: '🟥', type: 'resource', wt: 45, value: 900 },
  { id: 'iron_bar', name: 'Iron Bar', icon: '🧱', type: 'resource', wt: 30, value: 120 },
  { id: 'silver_bar', name: 'Silver Bar', icon: '⬜', type: 'resource', wt: 30, value: 260 },
  { id: 'gold_bar', name: 'Gold Bar', icon: '🟧', type: 'resource', wt: 30, value: 600 },
  { id: 'wooden_sticks', name: 'Wooden Sticks', icon: '🥢', type: 'resource', wt: 12, value: 4 },
  { id: 'board', name: 'Board', icon: '🪵', type: 'resource', wt: 40, value: 15 },
  { id: 'hardwood_plank', name: 'Hardwood Plank', icon: '🟫', type: 'resource', wt: 50, value: 60 },
  { id: 'ancient_log', name: 'Ancient Log', icon: '🪓', type: 'resource', wt: 60, value: 180 },
  { id: 'raw_fish', name: 'Raw Fish', icon: '🐠', type: 'resource', wt: 5, value: 2 },
  { id: 'raw_salmon', name: 'Salmon', icon: '🐡', type: 'resource', wt: 9, value: 12 },
  { id: 'northern_pike', name: 'Northern Pike', icon: '🎏', type: 'resource', wt: 9, value: 35 },
  { id: 'rainbow_trout', name: 'Rainbow Trout', icon: '🌈', type: 'resource', wt: 9, value: 80 },
  { id: 'deepling_fish', name: 'Deepling Fish', icon: '🔷', type: 'resource', wt: 9, value: 200 },
  { id: 'meat', name: 'Meat', icon: '🥩', type: 'resource', wt: 18, value: 5 },

  // ------------------------------------------------------------- loot / junk
  { id: 'rat_tail', name: 'Rat Tail', icon: '🐀', type: 'misc', wt: 10, value: 5 },
  { id: 'bone', name: 'Bone', icon: '🦴', type: 'misc', wt: 20, value: 6 },
  { id: 'wolf_paw', name: 'Wolf Paw', icon: '🐾', type: 'misc', wt: 7, value: 70 },
  { id: 'minotaur_leather', name: 'Minotaur Leather', icon: '🟤', type: 'misc', wt: 15, value: 50 },
  { id: 'dragon_scale', name: 'Red Dragon Scale', icon: '🟥', type: 'misc', wt: 12, value: 500 },
  { id: 'dragon_claw', name: 'Dragon Claw', icon: '🦅', type: 'misc', wt: 40, value: 15000 },
  { id: 'demon_dust', name: 'Demon Dust', icon: '🌫️', type: 'misc', wt: 5, value: 2000 },
  { id: 'giant_spider_silk', name: 'Giant Spider Silk', icon: '🕸️', type: 'misc', wt: 8, value: 400 },
  { id: 'hydra_head', name: 'Hydra Head', icon: '🐍', type: 'misc', wt: 25, value: 800 },
  { id: 'scarab_shell', name: 'Scarab Shell', icon: '🪲', type: 'misc', wt: 18, value: 400 },
  { id: 'soul_orb', name: 'Soul Orb', icon: '🔮', type: 'misc', wt: 25, value: 500 },
].map((item) => [item.id, item]));

export function getItem(id) {
  const item = ITEMS[id];
  if (!item) throw new Error(`unknown item: ${id}`);
  return item;
}

export const EQUIP_SLOTS = [
  { id: 'helmet', name: 'Helmet', icon: '⛑️' },
  { id: 'amulet', name: 'Amulet', icon: '📿' },
  { id: 'weapon', name: 'Weapon', icon: '⚔️' },
  { id: 'shield', name: 'Shield', icon: '🛡️' },
  { id: 'armour', name: 'Armor', icon: '🧥' },
  { id: 'ring', name: 'Ring', icon: '💍' },
  { id: 'legs', name: 'Legs', icon: '👖' },
  { id: 'boots', name: 'Boots', icon: '🥾' },
  { id: 'ammo', name: 'Ammo', icon: '➡️' },
];

export function slotOf(item) {
  if (item.type === 'ammo') return 'ammo';
  return item.slot ?? null;
}
