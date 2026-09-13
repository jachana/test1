import { S } from '../core/state.js';
import { getMonster, asChampion, CHAMPION, CHAMPION_CHANCE } from '../data/monsters.js';
import { expMult, goldMult } from '../data/areas.js';
import { getItem, ITEMS } from '../data/items.js';
import { SPELLS } from '../data/spells.js';
import { buyPrice, sellPrice } from '../data/shops.js';
import {
  blockChance, defenceValue, expectedAfterArmour, hitChance,
  RESPAWN_MS, RESTING_SPEEDUP,
} from '../core/formulas.js';
import { totalArmour, shieldDefence } from './inventory.js';
import { bestiaryExpBonus, bestiaryLootBonus } from './bestiary.js';
import { maxHp, playerAttackInterval, playerMaxHit, skillLevel, vocation, weaponProfile, castValue } from './player.js';

const RESPAWN_S = RESPAWN_MS / 1000;

/**
 * Damage per second you deal to one creature, weapon plus auto-cast spell.
 *
 * Every number here comes from the same helpers combat.js rolls against, so
 * the estimate tracks the fight instead of drifting away from it.
 */
function outgoingDps(monster) {
  const profile = weaponProfile();
  const skill = skillLevel(profile.skill);
  const max = playerMaxHit(profile);
  const lo = Math.max(1, Math.floor(max * 0.4));
  const perSwing = hitChance(skill, monster.def) * expectedAfterArmour(lo, max, monster.arm, 1);
  const weapon = perSwing / (playerAttackInterval() / 1000);
  let spellDps = 0;

  const spell = SPELLS[S.settings.attackSpell];
  if (spell) {
    const hit = castValue(spell);
    const soaked = expectedAfterArmour(hit, hit, Math.floor(monster.arm * 0.5), 1);
    // Only counts while you can pay for it; mana regen sets the real ceiling.
    const manaPerSecond = (vocation().manaRegen.amount + Math.floor(S.char.level / 15)) / vocation().manaRegen.seconds;
    const castsPerSecond = Math.min(1000 / spell.cooldown, manaPerSecond / spell.mana);
    spellDps = soaked * castsPerSecond;
  }
  return { weapon, spell: spellDps, total: weapon + spellDps };
}

/** Damage that gets through per blow the creature lands, after blocks and armour. */
function damagePerBlow(monster) {
  const defence = defenceValue(skillLevel('shielding'), shieldDefence(), S.settings.attackMode);
  const armour = totalArmour();

  // Block chance depends on the size of the individual blow, so average across
  // the creature's whole damage range rather than around its midpoint.
  let perHit = 0;
  for (let raw = monster.min; raw <= monster.max; raw++) {
    perHit += (1 - blockChance(defence, raw)) * expectedAfterArmour(raw, raw, armour);
  }
  return perHit / (monster.max - monster.min + 1);
}

/**
 * Gold per ounce at which a drop is fully worth its place in the backpack.
 *
 * On a long hunt the pack is always full, so loot is not free income — every
 * chain armour you carry out is a warrior helmet you did not. Counting all of
 * it at shop price told players the minotaur caves out-earned the orc fortress;
 * hunting both for an hour says the opposite by a factor of two, because the
 * minotaur drops are dense worthless plate and the orcs pay in coin.
 */
const WORTH_CARRYING = 15;

/** Average gold from one kill: coins, plus the loot that earns its weight. */
function killValue(monster, area) {
  const gold = ((monster.gold[0] + monster.gold[1]) / 2) * goldMult(area);
  const rolls = (monster.champion ? CHAMPION.lootRolls : 1) * bestiaryLootBonus(monster.id);
  const loot = monster.loot.reduce((sum, d) => {
    const item = getItem(d.item);
    const value = sellPrice(d.item);
    const perOunce = item.wt > 0 ? (value * 10) / item.wt : Infinity;
    const carried = Math.min(1, perOunce / WORTH_CARRYING);
    return sum + Math.min(1, d.chance * rolls) * ((d.lo + d.hi) / 2) * value * carried;
  }, 0);
  return gold + loot;
}

/**
 * How many blows a creature gets in before a fight that lasts `swings` of the
 * player's attack interval ends.
 *
 * Both timers start at zero on spawn, so the kth blow lands at k * speed and
 * the kill lands at swings * interval — and when those coincide the player
 * swings first, which is why the count is strict. Fractional swing counts are
 * interpolated between the two integers they sit between: rounding instead
 * would drop a whole blow, and the continuous `ttk / speed - 0.5` this
 * replaces was out by up to 30% whenever interval and speed nearly agreed.
 */
function blowsBefore(swings, intervalMs, speedMs) {
  const at = (n) => Math.max(0, Math.ceil((n * intervalMs) / speedMs) - 1);
  const lo = Math.floor(swings);
  const frac = swings - lo;
  return at(lo) * (1 - frac) + at(lo + 1) * frac;
}

/**
 * The estimate for one exact creature — normal or champion, no blending.
 *
 * monsterEstimate wraps this to average the two, because a spawn is a coin
 * flip weighted at one in forty and a champion is 2.6x the health for 3x the
 * experience. Leaving champions out understated damage taken by enough to fail
 * the ground-truth test the moment they were added.
 */
function estimateOne(monster, area) {
  const dps = outgoingDps(monster);
  const intervalMs = playerAttackInterval();

  // Damage arrives in lumps, not as a stream: the first swing only lands a full
  // interval after the creature spawns, so a fight that "should" take 1.05s
  // really takes 2.05s. Half an interval is the average of that delay across
  // fights, weighted by how much of your damage comes from the weapon rather
  // than from an auto-cast spell, which does not wait for the swing timer.
  const weaponShare = dps.total > 0 ? dps.weapon / dps.total : 1;
  const ttk = monster.hp / Math.max(0.1, dps.total) + (intervalMs / 1000) * 0.5 * weaponShare;
  const cycle = ttk + RESPAWN_S;

  const perBlow = damagePerBlow(monster);
  const blowsPerFight = blowsBefore((ttk * 1000) / intervalMs, intervalMs, monster.speed);
  const damagePerKill = perBlow * blowsPerFight;
  return {
    monster,
    ttk,
    cycle,
    expPerHour: (3600 / cycle) * monster.exp * expMult(area) * bestiaryExpBonus(monster.id),
    goldPerHour: (3600 / cycle) * killValue(monster, area),
    incoming: damagePerKill / cycle,
    damagePerKill,
  };
}

export function monsterEstimate(monsterId, area = null) {
  const base = getMonster(monsterId);
  const normal = estimateOne(base, area);
  const champion = estimateOne(asChampion(base), area);

  // Rates are per hour, so they blend on time spent rather than on spawn count:
  // one champion in forty spawns is more than one fortieth of the clock.
  const p = CHAMPION_CHANCE;
  const timeShare = (p * champion.cycle) / (p * champion.cycle + (1 - p) * normal.cycle);
  const mix = (key) => normal[key] * (1 - timeShare) + champion[key] * timeShare;

  return {
    monster: base,
    ttk: normal.ttk * (1 - p) + champion.ttk * p,
    expPerHour: mix('expPerHour'),
    goldPerHour: mix('goldPerHour'),
    incoming: mix('incoming'),
    damagePerKill: normal.damagePerKill * (1 - p) + champion.damagePerKill * p,
  };
}

/**
 * Regeneration you can count on per second while food lasts, including the
 * faster ticks you get resting between spawns.
 */
function regenPerSecond(ttk) {
  const voc = vocation();
  const perSecond = (voc.hpRegen.amount + Math.floor(S.char.level / 15)) / voc.hpRegen.seconds;
  const cycle = ttk + RESPAWN_S;
  return perSecond * ((ttk + RESPAWN_S * RESTING_SPEEDUP) / cycle);
}

/** The strongest health potion this character is allowed to drink. */
export function potionForLevel(level = S.char.level) {
  if (level >= (ITEMS.great_health_potion.reqLevel ?? 80)) return ITEMS.great_health_potion;
  if (level >= (ITEMS.strong_health_potion.reqLevel ?? 50)) return ITEMS.strong_health_potion;
  return ITEMS.health_potion;
}

const VERDICTS = {
  safe: { id: 'safe', label: 'Safe', note: 'You out-heal this place.' },
  comfortable: { id: 'comfortable', label: 'Comfortable', note: 'Supplies are pocket change here.' },
  risky: { id: 'risky', label: 'Risky', note: 'You are hunting to pay for the potions you drink.' },
  deadly: { id: 'deadly', label: 'Deadly', note: 'This costs more than it pays. Come back stronger.' },
};

/**
 * Everything the hunting-guide panel needs for one area, computed from the
 * character as it stands right now: gear, skills, stance and auto-cast.
 *
 * The verdict is about affordability, not regeneration. Potions are what
 * actually keep an idle hunter alive, so an area is survivable when its gold
 * covers its supply bill — judging on regeneration alone declared the entire
 * endgame permanently deadly at every level.
 */
export function areaEstimate(area) {
  const totalWeight = area.spawns.reduce((sum, [, w]) => sum + w, 0);
  const parts = area.spawns.map(([id, weight]) => ({ ...monsterEstimate(id, area), share: weight / totalWeight }));

  const expPerHour = parts.reduce((sum, p) => sum + p.expPerHour * p.share, 0);
  const goldPerHour = parts.reduce((sum, p) => sum + p.goldPerHour * p.share, 0);
  const incoming = parts.reduce((sum, p) => sum + p.incoming * p.share, 0);
  const avgTtk = parts.reduce((sum, p) => sum + p.ttk * p.share, 0);

  const net = incoming - regenPerSecond(avgTtk);
  const potion = potionForLevel();
  const potionsPerHour = (Math.max(0, net) * 3600) / potion.heal;
  const potionGoldPerHour = potionsPerHour * buyPrice(potion.id);

  const biggestHit = Math.max(...area.spawns.map(([id]) => getMonster(id).max));
  let verdict = VERDICTS.safe;
  if (maxHp() < biggestHit) verdict = VERDICTS.deadly; // one blow could end you
  else if (net > 0) {
    if (potionGoldPerHour >= goldPerHour) verdict = VERDICTS.deadly;
    else if (potionGoldPerHour >= goldPerHour * 0.25) verdict = VERDICTS.risky;
    else verdict = VERDICTS.comfortable;
  }

  return {
    area,
    parts,
    expPerHour,
    goldPerHour,
    netGoldPerHour: goldPerHour - potionGoldPerHour,
    incoming,
    avgTtk,
    verdict,
    potion,
    potionsPerHour,
    potionGoldPerHour,
    notableDrops: notableDrops(area),
  };
}

/** The drops worth walking here for: rarest and most valuable first. */
export function notableDrops(area, limit = 6) {
  const seen = new Map();
  for (const [id] of area.spawns) {
    for (const drop of getMonster(id).loot) {
      const item = getItem(drop.item);
      if (item.value < 100) continue;
      const previous = seen.get(drop.item);
      if (!previous || drop.chance > previous.chance) {
        seen.set(drop.item, { item, chance: drop.chance, from: getMonster(id).name });
      }
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.item.value * b.chance - a.item.value * a.chance)
    .slice(0, limit);
}

/**
 * The items this area is the best place in the game to get.
 *
 * Experience and gold per hour are not the only reasons to walk somewhere. The
 * citadel is the slowest experience in the endgame and it is where the three
 * best pieces of armour in the game actually come from, at ten times the rate
 * anywhere else has them. An area whose drop table nothing else matches is not
 * dead content, whatever the columns say.
 */
export function exclusiveDrops(area, allAreas, minValue = 3000) {
  const rateIn = (a, itemId) => Math.max(0, ...a.spawns.map(([id, weight]) => {
    const share = weight / a.spawns.reduce((sum, [, w]) => sum + w, 0);
    const drop = getMonster(id).loot.find((d) => d.item === itemId);
    return drop ? drop.chance * share : 0;
  }));

  const here = new Set();
  for (const [id] of area.spawns) for (const d of getMonster(id).loot) here.add(d.item);

  return [...here]
    .filter((itemId) => getItem(itemId).value >= minValue)
    .map((itemId) => ({ item: getItem(itemId), rate: rateIn(area, itemId) }))
    .filter(({ item, rate }) => allAreas.every((a) => a === area || rateIn(a, item.id) < rate))
    .sort((a, b) => b.item.value * b.rate - a.item.value * a.rate);
}

/** Areas ranked by experience for the character as it stands. */
export function bestAreasFor(areas, { open }) {
  return areas
    .filter((a) => open(a))
    .map(areaEstimate)
    .filter((e) => e.verdict.id !== 'deadly')
    .sort((a, b) => b.expPerHour - a.expPerHour);
}
