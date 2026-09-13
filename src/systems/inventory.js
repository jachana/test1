import { S, pushLog } from '../core/state.js';
import { getItem, slotOf } from '../data/items.js';
import { maxCapacity } from '../core/formulas.js';
import { emit } from '../core/bus.js';
import { perkArmour, perkCapacity } from './perks.js';

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
  return Math.round(maxCapacity(S.char.level, S.char.vocation) * perkCapacity());
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

/**
 * Everything the worn set adds up to, computed once per change of gear.
 *
 * These five totals each walked all nine slots, and skillBonus is behind every
 * skillLevel() call — which combat makes several times a swing and the hunting
 * guide makes inside a loop over a creature's whole damage range. Nine lookups
 * times five totals times all of that, for numbers that change when you press
 * Equip.
 *
 * Keyed on the equipment itself rather than invalidated by hand, because
 * compare.js swaps gear in and straight back out to measure it: a key that
 * follows the slots cannot go stale behind that, and a flag would.
 */
let wornKey = null;
let wornCache = null;

function worn() {
  const e = S.equipment;
  const key = `${e.helmet}|${e.amulet}|${e.weapon}|${e.shield}|${e.armour}|${e.ring}|${e.legs}|${e.boots}|${e.ammo}`;
  if (wornCache && wornKey === key) return wornCache;

  const summary = { armour: 0, regen: 0, haste: 0, skills: null, shieldDef: 0 };
  let skills = null;
  for (const id of Object.values(e)) {
    if (!id) continue;
    const item = getItem(id);
    summary.armour += item.arm ?? 0;
    summary.regen += item.regenBonus ?? 0;
    summary.haste += item.haste ?? 0;
    if (item.skillBonus) {
      skills ??= {};
      for (const [skill, value] of Object.entries(item.skillBonus)) {
        skills[skill] = (skills[skill] ?? 0) + value;
      }
    }
  }
  summary.skills = skills;
  const shield = e.shield ? getItem(e.shield) : null;
  const weapon = e.weapon ? getItem(e.weapon) : null;
  summary.shieldDef = (shield?.def ?? 0) + (weapon?.def ?? 0) * 0.5;

  wornKey = key;
  wornCache = summary;
  return summary;
}

/** Aggregated armour from every worn piece, plus whatever the board adds. */
export function totalArmour() {
  return worn().armour + perkArmour();
}

export function shieldDefence() {
  return worn().shieldDef;
}

/** Skill bonuses granted by equipment (rings, etc.). */
export function skillBonus(skillId) {
  const { skills } = worn();
  if (!skills) return 0;
  return (skills.all ?? 0) + (skills[skillId] ?? 0);
}

export function regenBonus() {
  return worn().regen;
}

export function hasteBonus() {
  return worn().haste;
}

/** Sorted view of the backpack for the UI. */
export function inventoryView() {
  const order = { weapon: 0, shield: 1, armour: 2, ammo: 3, rune: 4, potion: 5, food: 6, resource: 7, misc: 8, currency: 9 };
  return [...S.inventory]
    .map((e) => ({ ...e, item: getItem(e.id) }))
    .sort((a, b) => (order[a.item.type] ?? 9) - (order[b.item.type] ?? 9) || a.item.name.localeCompare(b.item.name));
}
