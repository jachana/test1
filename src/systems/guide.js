import { S } from '../core/state.js';
import { getMonster } from '../data/monsters.js';
import { getItem, ITEMS } from '../data/items.js';
import { SPELLS } from '../data/spells.js';
import { buyPrice, sellPrice } from '../data/shops.js';
import {
  blockChance, defenceValue, expectedAfterArmour, hitChance, maxHit, spellHit,
  RESPAWN_MS, RESTING_SPEEDUP,
} from '../core/formulas.js';
import { totalArmour, shieldDefence } from './inventory.js';
import { maxHp, playerAttackInterval, skillLevel, vocation, weaponProfile } from './player.js';

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
  const max = maxHit(profile.attack, skill, S.char.level, S.settings.attackMode);
  const lo = Math.max(1, Math.floor(max * 0.4));
  const perSwing = hitChance(skill, monster.def) * expectedAfterArmour(lo, max, monster.arm, 1);
  const weapon = perSwing / (playerAttackInterval() / 1000);
  let spellDps = 0;

  const spell = SPELLS[S.settings.attackSpell];
  if (spell) {
    const hit = spellHit(spell.base, spell.perML, skillLevel('magic'), S.char.level);
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

/** Average gold from one kill, counting loot you could sell. */
function killValue(monster) {
  const gold = (monster.gold[0] + monster.gold[1]) / 2;
  const loot = monster.loot.reduce((sum, d) => {
    const qty = (d.lo + d.hi) / 2;
    return sum + d.chance * qty * sellPrice(d.item);
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

export function monsterEstimate(monsterId) {
  const monster = getMonster(monsterId);
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
    expPerHour: (3600 / cycle) * monster.exp,
    goldPerHour: (3600 / cycle) * killValue(monster),
    incoming: damagePerKill / cycle,
    damagePerKill,
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
  const parts = area.spawns.map(([id, weight]) => ({ ...monsterEstimate(id), share: weight / totalWeight }));

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

/** Areas ranked by experience for the character as it stands. */
export function bestAreasFor(areas, { open }) {
  return areas
    .filter((a) => open(a))
    .map(areaEstimate)
    .filter((e) => e.verdict.id !== 'deadly')
    .sort((a, b) => b.expPerHour - a.expPerHour);
}
