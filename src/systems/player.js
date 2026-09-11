import { S, pushLog } from '../core/state.js';
import { SKILLS, MAX_SKILL_LEVEL } from '../data/skills.js';
import { VOCATIONS, CHOOSABLE, VOCATION_LEVEL, canChooseVocation } from '../data/vocations.js';
import { getItem } from '../data/items.js';
import { expForLevel, levelForExp, maxHealth, maxMana, triesToAdvance } from '../core/formulas.js';
import { clamp, ratio } from '../core/util.js';
import { emit } from '../core/bus.js';
import { count, removeItem, equipped, regenBonus, skillBonus } from './inventory.js';

export const FOOD_CAP_SECONDS = 20 * 60; // Tibia tops you up at ~20 minutes

export const maxHp = () => maxHealth(S.char.level, S.char.vocation);
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
  const after = levelForExp(S.char.exp);
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
  const lost = Math.floor(S.char.exp * fraction);
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

/** Between fights you catch your breath, the way you would walking to the next spawn. */
const RESTING_SPEEDUP = 4;

export function regenTick(dt) {
  const voc = vocation();
  const t = S.timers;
  const resting = !S.combat || S.combat.respawn > 0;
  // Higher levels heal in bigger chunks, or an idle hunt can never keep up.
  const tickSize = Math.floor(S.char.level / 15);

  if (S.char.food > 0) {
    S.char.food = Math.max(0, S.char.food - dt / 1000);
    t.hpRegen += dt;
    const hpEvery = (voc.hpRegen.seconds * 1000) / (resting ? RESTING_SPEEDUP : 1);
    while (t.hpRegen >= hpEvery) {
      t.hpRegen -= hpEvery;
      if (S.char.hp < maxHp()) heal(voc.hpRegen.amount + regenBonus() + tickSize);
    }
  } else {
    t.hpRegen = 0;
  }

  // Mana always trickles back, faster with food and a life ring.
  t.manaRegen += dt;
  const manaEvery = (voc.manaRegen.seconds * 1000 * (S.char.food > 0 ? 1 : 2.5)) / (resting ? RESTING_SPEEDUP : 1);
  while (t.manaRegen >= manaEvery) {
    t.manaRegen -= manaEvery;
    if (S.char.mana < maxMp()) restoreMana(voc.manaRegen.amount + regenBonus() + tickSize);
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

function weakestPotion(kind) {
  return S.inventory
    .map((e) => getItem(e.id))
    .filter((i) => i.type === 'potion' && i[kind] && S.char.level >= (i.reqLevel ?? 1))
    .sort((a, b) => a[kind] - b[kind])[0];
}

export function autoPotion() {
  if (!S.settings.autoPotion) return;
  const hpRatio = ratio(S.char.hp, maxHp());
  if (hpRatio < S.settings.potionThreshold) {
    const potion = weakestPotion('heal');
    if (potion && removeItem(potion.id, 1)) {
      const healed = heal(potion.heal);
      pushLog(`You drink ${potion.name.toLowerCase()} (+${healed} hp).`, 'good');
    }
  }
  if (ratio(S.char.mana, maxMp()) < 0.3 && (S.settings.attackSpell || S.settings.healSpell)) {
    const potion = weakestPotion('mana');
    if (potion && removeItem(potion.id, 1)) {
      restoreMana(potion.mana);
    }
  }
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
