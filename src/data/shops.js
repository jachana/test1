// NPC traders. Buy price defaults to item.buy, otherwise double the sell value.
import { getItem } from './items.js';

export const SHOPS = [
  {
    id: 'obi', npc: 'Obi', icon: '🧔', title: 'Rookgaard Weaponsmith',
    stock: ['hand_axe', 'club', 'rapier', 'sabre', 'short_sword', 'sword', 'axe', 'mace',
      'spear', 'wooden_shield', 'studded_shield', 'leather_helmet', 'leather_armor',
      'leather_legs', 'leather_boots'],
  },
  {
    id: 'dixi', npc: 'Dixi', icon: '👩', title: 'Thais Armoury',
    stock: ['chain_helmet', 'brass_helmet', 'steel_helmet', 'studded_armor', 'chain_armor',
      'brass_armor', 'plate_armor', 'studded_legs', 'chain_legs', 'brass_legs', 'plate_legs',
      'brass_shield', 'plate_shield', 'battle_axe', 'longsword', 'battle_hammer'],
  },
  {
    id: 'lily', npc: 'Lily', icon: '🧙‍♀️', title: 'Magic Shop & Apothecary',
    stock: ['blank_rune', 'health_potion', 'strong_health_potion', 'great_health_potion',
      'mana_potion', 'strong_mana_potion', 'great_mana_potion', 'silver_amulet',
      'protection_amulet', 'power_ring'],
  },
  {
    id: 'willie', npc: 'Willie', icon: '🧑‍🌾', title: 'Farmer & Fletcher',
    stock: ['brown_mushroom', 'meat', 'ham', 'arrow', 'bolt', 'bow', 'crossbow', 'wooden_sticks', 'board'],
  },
];

export function buyPrice(itemId) {
  const item = getItem(itemId);
  return item.buy ?? Math.max(1, Math.round(item.value * 2));
}

export function sellPrice(itemId) {
  return Math.max(1, Math.floor(getItem(itemId).value * 0.6));
}
