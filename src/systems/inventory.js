import { S, pushLog } from '../core/state.js';
import { getItem, slotOf } from '../data/items.js';
import { maxCapacity } from '../core/formulas.js';
import { emit } from '../core/bus.js';

export function count(itemId) {
  return S.inventory.find((e) => e.id === itemId)?.qty ?? 0;
}

export function totalWeight() {
  let w = S.gold * 0.1;
  for (const entry of S.inventory) w += getItem(entry.id).wt * entry.qty;
  for (const id of Object.values(S.equipment)) {
    if (id) w += getItem(id).wt;
  }
  return w / 10;
}

export function capacity() {
  return maxCapacity(S.char.level, S.char.vocation);
}

export function freeCapacity() {
  return capacity() - totalWeight();
}

/** Adds items, respecting capacity. Returns how many actually fit. */
export function addItem(itemId, qty = 1, { force = false } = {}) {
  const item = getItem(itemId);
  let allowed = qty;
  if (!force && item.wt > 0) {
    const fits = Math.floor((freeCapacity() * 10) / item.wt);
    allowed = Math.max(0, Math.min(qty, fits));
  }
  if (allowed <= 0) {
    pushLog(`You are too heavy to carry ${item.name}.`, 'bad');
    return 0;
  }
  const entry = S.inventory.find((e) => e.id === itemId);
  if (entry) entry.qty += allowed;
  else S.inventory.push({ id: itemId, qty: allowed });
  emit('inventory:changed');
  return allowed;
}

export function removeItem(itemId, qty = 1) {
  const idx = S.inventory.findIndex((e) => e.id === itemId);
  if (idx === -1) return false;
  const entry = S.inventory[idx];
  if (entry.qty < qty) return false;
  entry.qty -= qty;
  if (entry.qty <= 0) S.inventory.splice(idx, 1);
  emit('inventory:changed');
  return true;
}

export function hasInputs(inputs = []) {
  return inputs.every((i) => count(i.item) >= i.qty);
}

export function consumeInputs(inputs = []) {
  if (!hasInputs(inputs)) return false;
  for (const i of inputs) removeItem(i.item, i.qty);
  return true;
}

export function addGold(amount) {
  S.gold = Math.max(0, S.gold + amount);
  if (amount > 0) S.stats.goldEarned += amount;
  emit('inventory:changed');
}

// ------------------------------------------------------------------ equipment

export function equip(itemId) {
  const item = getItem(itemId);
  const slot = slotOf(item);
  if (!slot) {
    pushLog(`${item.name} cannot be equipped.`, 'bad');
    return false;
  }
  if (count(itemId) < 1) return false;

  // Two-handed weapons and shields fight over the hands.
  if (slot === 'weapon' && item.twoHanded && S.equipment.shield) unequip('shield');
  if (slot === 'shield') {
    const weapon = S.equipment.weapon && getItem(S.equipment.weapon);
    if (weapon?.twoHanded) unequip('weapon');
  }

  const previous = S.equipment[slot];
  removeItem(itemId, 1);
  S.equipment[slot] = itemId;
  if (previous) addItem(previous, 1, { force: true });
  emit('inventory:changed');
  return true;
}

export function unequip(slot) {
  const itemId = S.equipment[slot];
  if (!itemId) return false;
  S.equipment[slot] = null;
  addItem(itemId, 1, { force: true });
  emit('inventory:changed');
  return true;
}

export function equipped(slot) {
  const id = S.equipment[slot];
  return id ? getItem(id) : null;
}

/** Aggregated armour from every worn piece. */
export function totalArmour() {
  let armour = 0;
  for (const id of Object.values(S.equipment)) {
    if (id) armour += getItem(id).arm ?? 0;
  }
  return armour;
}

export function shieldDefence() {
  const shield = equipped('shield');
  const weapon = equipped('weapon');
  return (shield?.def ?? 0) + (weapon?.def ?? 0) * 0.5;
}

/** Skill bonuses granted by equipment (rings, etc.). */
export function skillBonus(skillId) {
  let bonus = 0;
  for (const id of Object.values(S.equipment)) {
    if (!id) continue;
    const sb = getItem(id).skillBonus;
    if (sb) bonus += (sb.all ?? 0) + (sb[skillId] ?? 0);
  }
  return bonus;
}

export function regenBonus() {
  let bonus = 0;
  for (const id of Object.values(S.equipment)) {
    if (id) bonus += getItem(id).regenBonus ?? 0;
  }
  return bonus;
}

export function hasteBonus() {
  let haste = 0;
  for (const id of Object.values(S.equipment)) {
    if (id) haste += getItem(id).haste ?? 0;
  }
  return haste;
}

/** Sorted view of the backpack for the UI. */
export function inventoryView() {
  const order = { weapon: 0, shield: 1, armour: 2, ammo: 3, rune: 4, potion: 5, food: 6, resource: 7, misc: 8, currency: 9 };
  return [...S.inventory]
    .map((e) => ({ ...e, item: getItem(e.id) }))
    .sort((a, b) => (order[a.item.type] ?? 9) - (order[b.item.type] ?? 9) || a.item.name.localeCompare(b.item.name));
}
