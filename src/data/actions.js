// Idle actions: gathering spots and production recipes.
//
//   req     skill level required
//   ms      base duration of one action
//   tries   skill tries granted per completed action
//   inputs  consumed items  [{ item, qty }]
//   out     produced items  [{ item, chance, lo, hi }]
//   mana    mana spent per action (also trains Magic Level)

const out = (list) => list.map(([item, chance = 1, lo = 1, hi = lo]) => ({ item, chance, lo, hi }));
const inp = (list) => list.map(([item, qty = 1]) => ({ item, qty }));

export const ACTIONS = {
  mining: [
    { id: 'mine_iron', name: 'Iron Vein', icon: '🪨', req: 1, ms: 3000, tries: 1, out: out([['iron_ore', 1]]) },
    { id: 'mine_silver', name: 'Silver Vein', icon: '⚪', req: 15, ms: 4000, tries: 2, out: out([['silver_ore', 1]]) },
    { id: 'mine_gold', name: 'Gold Vein', icon: '🟨', req: 30, ms: 5000, tries: 3, out: out([['gold_ore', 1]]) },
    { id: 'mine_crystal', name: 'Crystal Seam', icon: '💎', req: 45, ms: 6500, tries: 5, out: out([['crystal_ore', 1], ['iron_ore', 0.3]]) },
    { id: 'mine_daramanian', name: 'Daramanian Rock', icon: '🟥', req: 60, ms: 8000, tries: 7, out: out([['daramanian_ore', 1], ['crystal_ore', 0.2]]) },
  ],
  woodcutting: [
    { id: 'chop_bush', name: 'Thorn Bush', icon: '🌿', req: 1, ms: 2500, tries: 1, out: out([['wooden_sticks', 1, 1, 2]]) },
    { id: 'chop_pine', name: 'Pine Tree', icon: '🌲', req: 12, ms: 4000, tries: 2, out: out([['board', 1]]) },
    { id: 'chop_hardwood', name: 'Tiquandan Hardwood', icon: '🌳', req: 28, ms: 5500, tries: 4, out: out([['hardwood_plank', 1], ['wooden_sticks', 0.4]]) },
    { id: 'chop_ancient', name: 'Ancient Oak', icon: '🎄', req: 50, ms: 7500, tries: 6, out: out([['ancient_log', 1], ['hardwood_plank', 0.3]]) },
  ],
  fishing: [
    { id: 'fish_shallows', name: 'Rookgaard Shallows', icon: '🌊', req: 10, ms: 2800, tries: 1, out: out([['raw_fish', 0.75]]) },
    { id: 'fish_river', name: 'Venore River', icon: '🏞️', req: 25, ms: 3600, tries: 1, out: out([['raw_fish', 0.5], ['raw_salmon', 0.4]]) },
    { id: 'fish_lake', name: 'Carlin Lake', icon: '🎏', req: 45, ms: 4500, tries: 1, out: out([['raw_salmon', 0.4], ['northern_pike', 0.4]]) },
    { id: 'fish_falls', name: 'Tiquandan Falls', icon: '🌈', req: 65, ms: 5500, tries: 1, out: out([['northern_pike', 0.4], ['rainbow_trout', 0.35]]) },
    { id: 'fish_deep', name: 'Deepling Grounds', icon: '🔷', req: 85, ms: 7000, tries: 1, out: out([['deepling_fish', 0.5], ['rainbow_trout', 0.3]]) },
  ],
  cooking: [
    { id: 'cook_mushroom', name: 'Stewed Mushrooms', icon: '🍄', req: 1, ms: 2000, tries: 1, inputs: inp([['brown_mushroom', 2]]), out: out([['ham', 1]]) },
    { id: 'cook_fish', name: 'Fried Fish', icon: '🐟', req: 1, ms: 2200, tries: 1, inputs: inp([['raw_fish', 1]]), out: out([['fish', 1]]) },
    { id: 'cook_ham', name: 'Roasted Ham', icon: '🍖', req: 8, ms: 2600, tries: 2, inputs: inp([['meat', 1]]), out: out([['ham', 1]]) },
    { id: 'cook_salmon', name: 'Roasted Salmon', icon: '🍣', req: 20, ms: 3200, tries: 3, inputs: inp([['raw_salmon', 1]]), out: out([['roasted_salmon', 1]]) },
    { id: 'cook_cake', name: 'Bake Cake', icon: '🍰', req: 35, ms: 4000, tries: 4, inputs: inp([['northern_pike', 1], ['brown_mushroom', 2]]), out: out([['cake', 1]]) },
    { id: 'cook_fish_pie', name: 'Fish Pie', icon: '🥧', req: 50, ms: 5000, tries: 6, inputs: inp([['rainbow_trout', 1], ['board', 1]]), out: out([['fish_pie', 1]]) },
    { id: 'cook_dragon_ham', name: 'Dragon Ham', icon: '🍗', req: 60, ms: 5500, tries: 7, inputs: inp([['dragon_scale', 1], ['meat', 2]]), out: out([['dragon_ham', 2]]) },
  ],
  smithing: [
    { id: 'smelt_iron', name: 'Smelt Iron Bar', icon: '🧱', req: 1, ms: 3000, tries: 1, inputs: inp([['iron_ore', 2]]), out: out([['iron_bar', 1]]) },
    { id: 'smelt_silver', name: 'Smelt Silver Bar', icon: '⬜', req: 15, ms: 3600, tries: 2, inputs: inp([['silver_ore', 2]]), out: out([['silver_bar', 1]]) },
    { id: 'smelt_gold', name: 'Smelt Gold Bar', icon: '🟧', req: 30, ms: 4200, tries: 3, inputs: inp([['gold_ore', 2]]), out: out([['gold_bar', 1]]) },
    { id: 'forge_sword', name: 'Forge Sword', icon: '⚔️', req: 10, ms: 4500, tries: 3, inputs: inp([['iron_bar', 2]]), out: out([['sword', 1]]) },
    { id: 'forge_axe', name: 'Forge Battle Axe', icon: '🪓', req: 18, ms: 5000, tries: 4, inputs: inp([['iron_bar', 3]]), out: out([['battle_axe', 1]]) },
    { id: 'forge_mace', name: 'Forge Mace', icon: '🔨', req: 14, ms: 4800, tries: 3, inputs: inp([['iron_bar', 2], ['wooden_sticks', 1]]), out: out([['mace', 1]]) },
    { id: 'forge_chain_armor', name: 'Forge Chain Armor', icon: '🧥', req: 22, ms: 5500, tries: 5, inputs: inp([['iron_bar', 4]]), out: out([['chain_armor', 1]]) },
    { id: 'forge_plate_shield', name: 'Forge Plate Shield', icon: '🛡️', req: 30, ms: 6000, tries: 6, inputs: inp([['iron_bar', 4], ['board', 2]]), out: out([['plate_shield', 1]]) },
    { id: 'forge_longsword', name: 'Forge Longsword', icon: '⚔️', req: 35, ms: 6200, tries: 7, inputs: inp([['iron_bar', 3], ['silver_bar', 1]]), out: out([['longsword', 1]]) },
    { id: 'forge_plate_armor', name: 'Forge Plate Armor', icon: '🧥', req: 45, ms: 7000, tries: 9, inputs: inp([['iron_bar', 5], ['silver_bar', 2]]), out: out([['plate_armor', 1]]) },
    { id: 'forge_knight_armor', name: 'Forge Knight Armor', icon: '🛡️', req: 60, ms: 8500, tries: 12, inputs: inp([['iron_bar', 6], ['gold_bar', 2], ['crystal_ore', 1]]), out: out([['knight_armor', 1]]) },
    { id: 'forge_giant_sword', name: 'Forge Giant Sword', icon: '🗡️', req: 70, ms: 9500, tries: 15, inputs: inp([['iron_bar', 8], ['gold_bar', 2], ['daramanian_ore', 1]]), out: out([['giant_sword', 1]]) },
  ],
  runecrafting: [
    { id: 'rune_light_healing', name: 'Light Healing Rune', icon: '💊', req: 1, reqMagic: 1, ms: 2500, tries: 1, mana: 20, inputs: inp([['blank_rune', 1]]), out: out([['rune_light_healing', 1, 1, 2]]) },
    { id: 'rune_fireball', name: 'Fireball Rune', icon: '🔥', req: 5, reqMagic: 4, ms: 3000, tries: 2, mana: 60, inputs: inp([['blank_rune', 1]]), out: out([['rune_fireball', 1, 1, 2]]) },
    { id: 'rune_intense_healing', name: 'Intense Healing Rune', icon: '💊', req: 12, reqMagic: 8, ms: 3400, tries: 3, mana: 120, inputs: inp([['blank_rune', 1]]), out: out([['rune_intense_healing', 1]]) },
    { id: 'rune_great_fireball', name: 'Great Fireball Rune', icon: '☄️', req: 20, reqMagic: 12, ms: 3800, tries: 4, mana: 240, inputs: inp([['blank_rune', 1]]), out: out([['rune_great_fireball', 1]]) },
    { id: 'rune_explosion', name: 'Explosion Rune', icon: '💥', req: 28, reqMagic: 16, ms: 4200, tries: 5, mana: 350, inputs: inp([['blank_rune', 1]]), out: out([['rune_explosion', 1]]) },
    { id: 'rune_ultimate_healing', name: 'Ultimate Healing Rune', icon: '💖', req: 36, reqMagic: 20, ms: 4600, tries: 6, mana: 400, inputs: inp([['blank_rune', 1]]), out: out([['rune_ultimate_healing', 1]]) },
    { id: 'rune_sudden_death', name: 'Sudden Death Rune', icon: '💀', req: 48, reqMagic: 25, ms: 5200, tries: 8, mana: 985, inputs: inp([['blank_rune', 1]]), out: out([['rune_sudden_death', 1]]) },
  ],
};

export function getAction(skillId, actionId) {
  return ACTIONS[skillId]?.find((a) => a.id === actionId) ?? null;
}

export const IDLE_SKILLS = Object.keys(ACTIONS);
