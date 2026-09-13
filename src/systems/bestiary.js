import { S } from '../core/state.js';
import { MONSTERS, getMonster } from '../data/monsters.js';
import { AREAS } from '../data/areas.js';

/**
 * Kill tiers.
 *
 * Killing your ten-thousandth rat should mean something other than a bigger
 * number. Each tier reveals more of what the creature actually is — the guide
 * was handing out full statistics for things you had never met — and the last
 * two pay: a small permanent bonus to experience and loot from that creature,
 * so a place you have hunted properly stays worth hunting.
 */
export const TIERS = [
  { at: 0, name: 'Unknown', shows: 'nothing', expBonus: 0, lootBonus: 0 },
  { at: 1, name: 'Seen', shows: 'health and experience', expBonus: 0, lootBonus: 0 },
  { at: 25, name: 'Studied', shows: 'damage and armour', expBonus: 0, lootBonus: 0 },
  { at: 100, name: 'Hunted', shows: 'the full loot table', expBonus: 0.03, lootBonus: 0 },
  { at: 500, name: 'Mastered', shows: 'everything', expBonus: 0.06, lootBonus: 0.05 },
  { at: 2500, name: 'Nemesis', shows: 'everything', expBonus: 0.10, lootBonus: 0.10 },
];

export const killsOf = (monsterId) => S.stats.kills[monsterId] ?? 0;

/** The tier a creature currently sits at for this character. */
export function tierOf(monsterId) {
  const kills = killsOf(monsterId);
  let tier = TIERS[0];
  for (const t of TIERS) if (kills >= t.at) tier = t;
  return tier;
}

/** The next tier and how many kills are left, or null once it is maxed. */
export function nextTier(monsterId) {
  const kills = killsOf(monsterId);
  const next = TIERS.find((t) => t.at > kills);
  return next ? { tier: next, remaining: next.at - kills } : null;
}

/** Experience multiplier earned by knowing this creature well. */
export const bestiaryExpBonus = (monsterId) => 1 + tierOf(monsterId).expBonus;

/** Extra chance on this creature's drops, as a multiplier. */
export const bestiaryLootBonus = (monsterId) => 1 + tierOf(monsterId).lootBonus;

/** How much of a creature's entry the player has earned the right to see. */
export function knows(monsterId, what) {
  const kills = killsOf(monsterId);
  if (what === 'basics') return kills >= 1;
  if (what === 'combat') return kills >= 25;
  if (what === 'loot') return kills >= 100;
  return false;
}

/** Where this creature can be found, among the areas that spawn it. */
export function homesOf(monsterId) {
  return AREAS.filter((a) => a.spawns.some(([id]) => id === monsterId));
}

/**
 * The whole bestiary, in the order a player would want to read it: creatures
 * they are working on first, then the ones they have finished, then the rest.
 */
export function bestiaryEntries() {
  return Object.keys(MONSTERS)
    .map((id) => {
      const monster = getMonster(id);
      const kills = killsOf(id);
      const tier = tierOf(id);
      const next = nextTier(id);
      return {
        monster,
        kills,
        tier,
        next,
        homes: homesOf(id),
        progress: next ? (kills - tier.at) / (next.tier.at - tier.at) : 1,
      };
    })
    .sort((a, b) => {
      if ((a.kills > 0) !== (b.kills > 0)) return b.kills - a.kills;
      if (a.kills > 0) return b.kills - a.kills;
      return a.monster.exp - b.monster.exp; // unmet creatures, weakest first
    });
}

export function bestiarySummary() {
  const ids = Object.keys(MONSTERS);
  const met = ids.filter((id) => killsOf(id) > 0);
  const mastered = ids.filter((id) => killsOf(id) >= 500);
  return {
    met: met.length,
    total: ids.length,
    mastered: mastered.length,
    kills: ids.reduce((sum, id) => sum + killsOf(id), 0),
  };
}
