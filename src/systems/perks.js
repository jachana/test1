import { S, pushLog } from '../core/state.js';
import { emit } from '../core/bus.js';
import { PERKS, getPerk, perkCost, SOULS_PER_KILL, SOULS_PER_CHAMPION } from '../data/perks.js';

/**
 * Perk ranks live in `S.perks` as a plain id → rank map.
 *
 * Everything reads through `rank()` rather than touching the map, so a save
 * written before a perk existed — or one naming a perk that has since been cut
 * — answers zero instead of throwing.
 */
export const rank = (id) => S.perks?.[id] ?? 0;

export const souls = () => S.char.soul ?? 0;

/** Cost of the next rank, or null when the perk is finished. */
export function nextCost(id) {
  const perk = getPerk(id);
  if (!perk) return null;
  const at = rank(id);
  return at >= perk.max ? null : perkCost(perk, at);
}

export function canBuy(id) {
  const cost = nextCost(id);
  return cost !== null && souls() >= cost;
}

export function buyPerk(id) {
  const perk = getPerk(id);
  const cost = nextCost(id);
  if (!perk || cost === null) return false;
  if (souls() < cost) {
    pushLog(`You need ${cost - souls()} more soul points for ${perk.name}.`, 'bad');
    return false;
  }
  S.char.soul -= cost;
  S.perks[id] = rank(id) + 1;
  pushLog(`${perk.name} ${S.perks[id]}: ${perk.effect(S.perks[id])}.`, 'level');
  emit('perk:bought', { perk, rank: S.perks[id] });
  return true;
}

/** Every kill is a soul point; the ones worth stopping for are worth more. */
export function grantSouls(monster) {
  const gained = monster.champion ? SOULS_PER_CHAMPION : SOULS_PER_KILL;
  S.char.soul = (S.char.soul ?? 0) + gained;
  S.stats.soulsEarned = (S.stats.soulsEarned ?? 0) + gained;
  return gained;
}

// ------------------------------------------------------------------ effects
//
// One accessor per effect, named for what it does rather than for the perk, so
// the call sites read as game rules and not as a lookup table.

/** Flat armour on top of what is worn. */
export const perkArmour = () => rank('iron_skin') * 2;

/** Multiplier on maximum hit. */
export const perkDamage = () => 1 + rank('sharp_edge') * 0.02;

/** Multiplier on the attack interval — smaller is faster. */
export const perkAttackSpeed = () => 1 - rank('sure_footing') * 0.01;

/** Multiplier on maximum health. */
export const perkHealth = () => 1 + rank('constitution') * 0.02;

/** Multiplier on regeneration ticks. */
export const perkRegen = () => 1 + rank('meditation') * 0.06;

/** Multiplier on carrying capacity. */
export const perkCapacity = () => 1 + rank('deep_pockets') * 0.05;

/** Multiplier on every drop chance. */
export const perkLoot = () => 1 + rank('scavenger') * 0.03;

/** Multiplier on gold from kills. */
export const perkGold = () => 1 + rank('coin_purse') * 0.05;

/** Share of the usual death penalty you actually pay. */
export const perkDeathPenalty = () => 1 - rank('blessed') * 0.15;

/** Everything the board is currently doing, for the UI. */
export function activePerks() {
  return PERKS.filter((p) => rank(p.id) > 0).map((p) => ({ perk: p, rank: rank(p.id), text: p.effect(rank(p.id)) }));
}

/** Total souls sunk into the board so far. */
export function soulsSpent() {
  return PERKS.reduce((sum, perk) => {
    let spent = 0;
    for (let r = 0; r < rank(perk.id); r++) spent += perkCost(perk, r);
    return sum + spent;
  }, 0);
}
