import { S, pushLog } from '../core/state.js';
import { SKILLS, MAX_SKILL_LEVEL } from '../data/skills.js';
import { VOCATIONS, CHOOSABLE, VOCATION_LEVEL, canChooseVocation } from '../data/vocations.js';
import { getItem } from '../data/items.js';
import {
  expForLevel, levelForExp, maxHealth, maxHit, maxMana, spellHit, triesToAdvance, RESTING_SPEEDUP,
} from '../core/formulas.js';
import { clamp, ratio } from '../core/util.js';
import { emit } from '../core/bus.js';
import { count, removeItem, equipped, hasteBonus, regenBonus, skillBonus } from './inventory.js';
import {
  perkAttackSpeed, perkDamage, perkDeathPenalty, perkHealth, perkRegen,
} from './perks.js';

export const FOOD_CAP_SECONDS = 20 * 60; // Tibia tops you up at ~20 minutes
const BASE_ATTACK_MS = 2000;

/**
 * Exhaustion between potions, in milliseconds.
 *
 * Without it autoPotion ran on every combat slice and would empty the whole
 * backpack into one blow, which made death impossible for anyone who could
 * afford a stack of potions — around level 14 onwards. Tibia exhausts you for
 * about a second; two is the number that keeps a hard hunt actually lethal.
 */
export const POTION_EXHAUST_MS = 2000;

/**
 * How long a death keeps counting towards the streak that sends you home.
 *
 * The streak used to reset on any kill, so a character that died, walked back,
 * killed one rat and died again never tripped the limit: a fresh citizen died
 * ten times an hour in the Sewers and kept marching back in. Deaths inside one
 * window are what "this place is too hard" actually means.
 */
export const DEATH_WINDOW_MS = 10 * 60 * 1000;

/** How often you swing, in milliseconds. Two-handed weapons are slower. */
export function playerAttackInterval() {
  const weapon = equipped('weapon');
  const base = weapon?.twoHanded ? BASE_ATTACK_MS * 1.2 : BASE_ATTACK_MS;
  return Math.max(600, base * (1 - hasteBonus()) * perkAttackSpeed());
}

export const maxHp = () => Math.round(maxHealth(S.char.level, S.char.vocation) * perkHealth());
export const maxMp = () => maxMana(S.char.level, S.char.vocation);
export const vocation = () => VOCATIONS[S.char.vocation];

export function skillLevel(skillId) {
  return S.skills[skillId].level + skillBonus(skillId);
}

export function gainExp(amount) {
  if (amount <= 0) return;
  const before = S.char.level;
  S.char.exp += amount;
  S.stats.expEarned += amount;
  const after = levelForExp(S.char.exp, before);
  if (after > before) {
    S.char.level = after;
    S.char.hp = maxHp();
    S.char.mana = maxMp();
    pushLog(`You advanced from level ${before} to level ${after}!`, 'level');
    emit('levelup', { level: after });
    if (before < VOCATION_LEVEL && canChooseVocation(S.char)) {
      pushLog('You may now choose a vocation and take the ship to the mainland.', 'good');
      emit('vocation:available');
    }
  }
}

/** The level 8 decision: pick a vocation, unlock the mainland. */
export function chooseVocation(id) {
  if (!canChooseVocation(S.char) || !CHOOSABLE.includes(id)) return false;
  S.char.vocation = id;
  S.char.vocationChosenAt = Date.now();
  S.char.hp = Math.min(S.char.hp, maxHp());
  S.char.mana = Math.min(S.char.mana, maxMp());
  pushLog(`You are now a ${VOCATIONS[id].name.toLowerCase()}. The ship to the mainland is waiting.`, 'level');
  emit('vocation:chosen', { id });
  return true;
}

export { canChooseVocation, VOCATION_LEVEL };

export function loseExpOnDeath(fraction = 0.1) {
  const floorExp = expForLevel(S.char.level);
  const lost = Math.floor(S.char.exp * fraction * perkDeathPenalty());
  S.char.exp = Math.max(0, S.char.exp - lost);
  S.char.level = levelForExp(S.char.exp);

  return { lost, demoted: S.char.exp < floorExp };
}

/** Add skill tries; rolls over into levels. */
export function gainSkill(skillId, tries = 1) {
  const skill = S.skills[skillId];
  if (!skill || tries <= 0) return;
  const def = SKILLS[skillId];
  skill.points += tries;
  skill.totalTries += tries;
  let need = triesToAdvance(skillId, skill.level, S.char.vocation);
  while (skill.points >= need && skill.level < MAX_SKILL_LEVEL) {
    skill.points -= need;
    skill.level += 1;
    pushLog(`You advanced to ${def.name} level ${skill.level}.`, 'level');
    emit('skillup', { skillId, level: skill.level });
    need = triesToAdvance(skillId, skill.level, S.char.vocation);
  }
}

/**
 * Maximum hit for this character with the weapon they are holding.
 *
 * Four places computed this straight from the formula — combat, the character
 * sheet, the gear comparison and the hunting guide — which is exactly the shape
 * of bug that let the sorcerer and the druid share a damage number. Anything
 * that wants to know how hard you hit asks here.
 */
export function playerMaxHit(profile = weaponProfile()) {
  const base = maxHit(profile.attack, skillLevel(profile.skill), S.char.level, S.settings.attackMode);
  return Math.max(1, Math.round(base * perkDamage()));
}

/**
 * What a spell actually does for this character, vocation included.
 *
 * Five call sites used to compute this inline straight from spellHit, which is
 * precisely why the sorcerer and the druid were the same vocation with
 * different spell names. Anything that resolves a spell or a rune goes through
 * here so the vocation is never accidentally left out.
 */
export function castValue(spell) {
  const voc = vocation();
  const power = spell.kind === 'heal' ? (voc.healPower ?? 1) : (voc.spellPower ?? 1);
  return Math.max(1, Math.round(spellHit(spell.base, spell.perML, skillLevel('magic'), S.char.level) * power));
}

/** Spending mana is what trains Magic Level in Tibia. */
export function spendMana(amount) {
  if (S.char.mana < amount) return false;
  S.char.mana -= amount;
  gainSkill('magic', amount);
  return true;
}

export function heal(amount) {
  const before = S.char.hp;
  S.char.hp = clamp(S.char.hp + amount, 0, maxHp());
  return S.char.hp - before;
}

export function restoreMana(amount) {
  const before = S.char.mana;
  S.char.mana = clamp(S.char.mana + amount, 0, maxMp());
  return S.char.mana - before;
}

// ------------------------------------------------------------------ regen/food

export function regenTick(dt) {
  const voc = vocation();
  const t = S.timers;
  // Countdowns that run whatever the character is doing. Combat slices call
  // autoPotion many times per engine step, so the exhaust has to be decremented
  // once per step, out here, rather than inside the slice loop.
  t.potion = Math.max(0, (t.potion ?? 0) - dt);
  t.deathWindow = Math.max(0, (t.deathWindow ?? 0) - dt);
  if (t.deathWindow === 0) S.stats.deathStreak = 0;
  const resting = !S.combat || S.combat.respawn > 0;
  // Higher levels heal in bigger chunks, or an idle hunt can never keep up.
  const tickSize = Math.floor(S.char.level / 15);

  if (S.char.food > 0) {
    S.char.food = Math.max(0, S.char.food - dt / 1000);
    t.hpRegen += dt;
    const hpEvery = (voc.hpRegen.seconds * 1000) / (resting ? RESTING_SPEEDUP : 1);
    while (t.hpRegen >= hpEvery) {
      t.hpRegen -= hpEvery;
      if (S.char.hp < maxHp()) heal(Math.round((voc.hpRegen.amount + regenBonus() + tickSize) * perkRegen()));
    }
  } else {
    t.hpRegen = 0;
  }

  // Mana always trickles back, faster with food and a life ring.
  t.manaRegen += dt;
  const manaEvery = (voc.manaRegen.seconds * 1000 * (S.char.food > 0 ? 1 : 2.5)) / (resting ? RESTING_SPEEDUP : 1);
  while (t.manaRegen >= manaEvery) {
    t.manaRegen -= manaEvery;
    if (S.char.mana < maxMp()) restoreMana(Math.round((voc.manaRegen.amount + regenBonus() + tickSize) * perkRegen()));
  }
}

export function eat(itemId) {
  const item = getItem(itemId);
  if (item.type !== 'food' || count(itemId) < 1) return false;
  if (S.char.food >= FOOD_CAP_SECONDS) return false;
  removeItem(itemId, 1);
  S.char.food = Math.min(FOOD_CAP_SECONDS, S.char.food + item.food * 60);
  return true;
}

/** Eats the least valuable food in the backpack. */
export function autoEat() {
  if (!S.settings.autoEat || S.char.food > 60) return false;
  const food = S.inventory
    .map((e) => getItem(e.id))
    .filter((i) => i.type === 'food')
    .sort((a, b) => a.value - b.value)[0];
  if (!food) return false;
  const ate = eat(food.id);
  if (ate) pushLog(`You eat ${food.name.toLowerCase()}.`, 'info');
  return ate;
}

/**
 * The cheapest potion that actually covers `missing`, or the strongest you have
 * when nothing does.
 *
 * Always reaching for the weakest one looks thrifty and is how a level 150
 * knight died in Hellgate: it kept sipping 40 hp starter potions against 115
 * damage a second because they were still in the backpack. Don't waste a great
 * health potion on a scratch, but when you are losing the race, drink the big one.
 */
function bestPotion(kind, missing) {
  const usable = S.inventory
    .map((e) => getItem(e.id))
    .filter((i) => i.type === 'potion' && i[kind] && S.char.level >= (i.reqLevel ?? 1))
    .sort((a, b) => a[kind] - b[kind]);
  return usable.find((i) => i[kind] >= missing) ?? usable[usable.length - 1];
}

/** One swallow per exhaust: health first, mana only if health did not need it. */
export function autoPotion() {
  if (!S.settings.autoPotion || S.timers.potion > 0) return false;

  if (ratio(S.char.hp, maxHp()) < S.settings.potionThreshold) {
    const potion = bestPotion('heal', maxHp() - S.char.hp);
    if (potion && removeItem(potion.id, 1)) {
      S.timers.potion = POTION_EXHAUST_MS;
      const healed = heal(potion.heal);
      pushLog(`You drink ${potion.name.toLowerCase()} (+${healed} hp).`, 'good');
      emit('potion', { potion, healed });
      return true;
    }
  }
  if (ratio(S.char.mana, maxMp()) < 0.3 && (S.settings.attackSpell || S.settings.healSpell)) {
    const potion = bestPotion('mana', maxMp() - S.char.mana);
    if (potion && removeItem(potion.id, 1)) {
      S.timers.potion = POTION_EXHAUST_MS;
      restoreMana(potion.mana);
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------- weapon

export function weaponProfile() {
  const weapon = equipped('weapon');
  if (!weapon) {
    return { name: 'Fists', icon: '👊', skill: 'fist', attack: 7, ranged: false, ok: true };
  }
  if (weapon.ranged && weapon.ammo) {
    const ammo = equipped('ammo');
    const ok = !!ammo && ammo.ammo === weapon.ammo && count(ammo.id) >= 0;
    return {
      name: weapon.name, icon: weapon.icon, skill: 'distance',
      attack: weapon.atk + (ok ? ammo.atk : 0), ranged: true, ok,
      ammoId: ok ? ammo.id : null,
      problem: ok ? null : `Equip ${weapon.ammo}s to use the ${weapon.name.toLowerCase()}.`,
    };
  }
  return {
    name: weapon.name, icon: weapon.icon, skill: weapon.ws ?? 'fist',
    attack: weapon.atk ?? 7, ranged: !!weapon.ranged, ok: true,
    elemDmg: weapon.elemDmg ?? 0,
  };
}

export function death() {
  S.stats.deaths += 1;
  const { lost } = loseExpOnDeath(0.1);
  for (const skill of Object.values(S.skills)) skill.points = Math.floor(skill.points * 0.9);
  S.char.hp = maxHp();
  S.char.mana = maxMp();
  S.char.food = 0;
  S.combat = null;
  S.action = null;
  pushLog(`You are dead. You lost ${lost.toLocaleString('en-US')} experience and woke up in the temple.`, 'death');
  emit('death');
}
