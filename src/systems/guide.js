import { S } from '../core/state.js';
import { getMonster } from '../data/monsters.js';
import { getItem } from '../data/items.js';
import { SPELLS } from '../data/spells.js';
import { sellPrice } from '../data/shops.js';
import { maxHit, defenceValue, spellHit } from '../core/formulas.js';
import { clamp } from '../core/util.js';
import { totalArmour, shieldDefence } from './inventory.js';
import { maxHp, playerAttackInterval, skillLevel, vocation, weaponProfile } from './player.js';

const RESPAWN_S = 1.5;
// Mirrors of the random rolls in combat.js, averaged.
const AVG_ROLL = 0.7; // randInt(0.4·max, max)
const AVG_SOAK = 0.7375; // randInt(0.475·armour, armour)
const RESTING_SPEEDUP = 4; // matches player.regenTick

/** Damage per second you deal to one creature, weapon plus auto-cast spell. */
function outgoingDps(monster) {
  const profile = weaponProfile();
  const skill = skillLevel(profile.skill);
  const hitChance = clamp(0.62 + (skill - monster.def) * 0.02, 0.35, 0.96);
  const max = maxHit(profile.attack, skill, S.char.level, S.settings.attackMode);
  const perSwing = hitChance * Math.max(1, max * AVG_ROLL - monster.arm * AVG_SOAK);
  let dps = perSwing / (playerAttackInterval() / 1000);

  const spell = SPELLS[S.settings.attackSpell];
  if (spell) {
    const hit = spellHit(spell.base, spell.perML, S.skills.magic.level, S.char.level);
    const soaked = Math.max(1, hit - monster.arm * 0.5 * AVG_SOAK);
    // Only counts while you can pay for it; mana regen sets the real ceiling.
    const manaPerSecond = (vocation().manaRegen.amount + Math.floor(S.char.level / 15)) / vocation().manaRegen.seconds;
    const castsPerSecond = Math.min(1000 / spell.cooldown, manaPerSecond / spell.mana);
    dps += soaked * castsPerSecond;
  }
  return dps;
}

/** Damage per second the creature deals to you, after blocks and armour. */
function incomingDps(monster) {
  const avgRaw = (monster.min + monster.max) / 2;
  const defence = defenceValue(skillLevel('shielding'), shieldDefence(), S.settings.attackMode);
  const blockChance = clamp(defence / (defence + avgRaw * 1.6), 0, 0.72);
  const perHit = (1 - blockChance) * Math.max(0, avgRaw - totalArmour() * AVG_SOAK);
  return perHit / (monster.speed / 1000);
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

export function monsterEstimate(monsterId) {
  const monster = getMonster(monsterId);
  const dps = outgoingDps(monster);
  const ttk = monster.hp / Math.max(0.1, dps);
  const cycle = ttk + RESPAWN_S;
  const taken = incomingDps(monster);
  return {
    monster,
    ttk,
    expPerHour: (3600 / cycle) * monster.exp,
    goldPerHour: (3600 / cycle) * killValue(monster),
    incoming: taken,
    damagePerKill: taken * ttk,
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
  const restingShare = (ttk + RESPAWN_S * RESTING_SPEEDUP) / cycle;
  return perSecond * restingShare;
}

const VERDICTS = [
  { id: 'safe', label: 'Safe', note: 'You out-heal this place.' },
  { id: 'comfortable', label: 'Comfortable', note: 'Bring some potions and you can stay all night.' },
  { id: 'risky', label: 'Risky', note: 'Watch your supplies — this bites back.' },
  { id: 'deadly', label: 'Deadly', note: 'You will die here. Come back stronger.' },
];

/**
 * Everything the hunting-guide panel needs for one area, computed from the
 * character as it stands right now: gear, skills, stance and auto-cast.
 */
export function areaEstimate(area) {
  const totalWeight = area.spawns.reduce((sum, [, w]) => sum + w, 0);
  const parts = area.spawns.map(([id, weight]) => ({ ...monsterEstimate(id), share: weight / totalWeight }));

  const expPerHour = parts.reduce((sum, p) => sum + p.expPerHour * p.share, 0);
  const goldPerHour = parts.reduce((sum, p) => sum + p.goldPerHour * p.share, 0);
  const incoming = parts.reduce((sum, p) => sum + p.incoming * p.share, 0);
  const avgTtk = parts.reduce((sum, p) => sum + p.ttk * p.share, 0);

  const net = incoming - regenPerSecond(avgTtk);
  const timeToDie = net <= 0 ? Infinity : maxHp() / net;
  let verdict = VERDICTS[0];
  if (net > 0) {
    if (timeToDie > avgTtk * 8) verdict = VERDICTS[1];
    else if (timeToDie > avgTtk * 2.5) verdict = VERDICTS[2];
    else verdict = VERDICTS[3];
  }

  // Potions needed per hour to cover what regeneration cannot.
  const deficitPerHour = Math.max(0, net) * 3600;

  return {
    area, parts, expPerHour, goldPerHour, incoming, avgTtk, verdict, timeToDie,
    potionsPerHour: deficitPerHour / 175, // a strong health potion's worth
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
