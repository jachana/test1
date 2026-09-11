import { S, pushLog } from '../core/state.js';
import { getArea } from '../data/areas.js';
import { getMonster } from '../data/monsters.js';
import { SPELLS } from '../data/spells.js';
import { getItem } from '../data/items.js';
import { maxHit, defenceValue, spellHit } from '../core/formulas.js';
import { clamp, pickWeighted, randInt, roll } from '../core/util.js';
import { emit } from '../core/bus.js';
import { addGold, addItem, count, equipped, hasteBonus, removeItem, totalArmour, shieldDefence } from './inventory.js';
import {
  autoEat, autoPotion, death, gainExp, gainSkill, heal, maxHp, maxMp,
  regenTick, skillLevel, spendMana, weaponProfile,
} from './player.js';

const RESPAWN_MS = 1500;
const BASE_ATTACK_MS = 2000;
/** Dying this many times without a kill in between means the area is too hard. */
const DEATH_STREAK_LIMIT = 3;

export function startHunt(areaId) {
  const area = getArea(areaId);
  if (!area) return false;
  S.action = { type: 'combat', areaId };
  S.combat = null;
  spawn(area);
  pushLog(`You travel to ${area.name}.`, 'info');
  emit('action:changed');
  return true;
}

export function stopAction(reason) {
  if (!S.action) return;
  S.action = null;
  S.combat = null;
  if (reason) pushLog(reason, 'info');
  emit('action:changed');
}

function spawn(area) {
  const pick = pickWeighted(area.spawns.map(([id, weight]) => ({ id, weight })));
  const monster = getMonster(pick.id);
  S.combat = {
    monsterId: monster.id,
    hp: monster.hp,
    maxHp: monster.hp,
    playerTimer: 0,
    monsterTimer: 0,
    spellTimer: 0,
    respawn: 0,
    lastPlayerHit: null,
    lastMonsterHit: null,
  };
  emit('combat:spawn', monster);
}

export function playerAttackInterval() {
  const weapon = equipped('weapon');
  const base = weapon?.twoHanded ? BASE_ATTACK_MS * 1.2 : BASE_ATTACK_MS;
  return Math.max(600, base * (1 - hasteBonus()));
}

/** Armour soaks a random slice of the incoming blow, Tibia-style. */
function applyArmour(damage, armour) {
  if (armour <= 0) return damage;
  return Math.max(0, damage - randInt(Math.floor(armour * 0.475), armour));
}

function playerAttack(monster) {
  const profile = weaponProfile();
  if (!profile.ok) {
    stopAction(profile.problem ?? 'You cannot attack with that weapon.');
    return;
  }
  if (profile.ranged && profile.ammoId) {
    if (!removeItem(profile.ammoId, 1)) {
      stopAction('You are out of ammunition.');
      return;
    }
  }

  const skill = skillLevel(profile.skill);
  const hitChance = clamp(0.62 + (skill - monster.def) * 0.02, 0.35, 0.96);
  if (!roll(hitChance)) {
    S.combat.lastPlayerHit = { amount: 0, miss: true };
    return;
  }

  const max = maxHit(profile.attack, skill, S.char.level, S.settings.attackMode);
  let damage = randInt(Math.max(1, Math.floor(max * 0.4)), max);
  damage += profile.elemDmg ? randInt(1, profile.elemDmg) : 0;
  damage = Math.max(1, applyArmour(damage, monster.arm));

  S.combat.hp -= damage;
  S.combat.lastPlayerHit = { amount: damage, miss: false };
  gainSkill(profile.skill, 1);
  emit('combat:hit', { source: 'player', damage });
}

/** Returns true when the blow killed us (the caller must stop immediately). */
function monsterAttack(monster) {
  const raw = randInt(monster.min, monster.max);
  const defence = defenceValue(skillLevel('shielding'), shieldDefence(), S.settings.attackMode);
  const blockChance = clamp(defence / (defence + raw * 1.6), 0, 0.72);

  gainSkill('shielding', 1); // you train shielding by being attacked
  if (roll(blockChance)) {
    S.combat.lastMonsterHit = { amount: 0, blocked: true };
    return false;
  }

  const damage = Math.max(0, applyArmour(raw, totalArmour()));
  S.char.hp -= damage;
  S.combat.lastMonsterHit = { amount: damage, blocked: false };
  emit('combat:hit', { source: 'monster', damage });

  if (S.char.hp > 0) return false;

  const areaId = S.action?.areaId;
  death(); // clears the current action and sends you to the temple
  S.stats.deathStreak = (S.stats.deathStreak ?? 0) + 1;
  if (S.settings.autoReturn && areaId && S.stats.deathStreak < DEATH_STREAK_LIMIT) {
    startHunt(areaId);
  } else if (areaId) {
    pushLog('You stay in the temple rather than walk back into that.', 'bad');
  }
  return true;
}

function castSpells(dt) {
  const c = S.combat;
  c.spellTimer += dt;

  // Emergency heal first.
  const healId = S.settings.healSpell;
  if (S.settings.autoHeal && healId && SPELLS[healId]) {
    const spell = SPELLS[healId];
    const missing = maxHp() - S.char.hp;
    if (missing > 0 && S.char.hp / maxHp() < 0.7 && S.char.mana >= spell.mana) {
      if (spendMana(spell.mana)) {
        const amount = spellHit(spell.base, spell.perML, S.skills.magic.level, S.char.level);
        heal(amount);
        emit('combat:spell', { spell, amount, kind: 'heal' });
        return;
      }
    }
  }

  const attackId = S.settings.attackSpell;
  if (!attackId || !SPELLS[attackId]) return;
  const spell = SPELLS[attackId];
  if (c.spellTimer < spell.cooldown || S.char.mana < spell.mana) return;
  c.spellTimer = 0;

  const profile = weaponProfile();
  let damage = spellHit(spell.base, spell.perML, S.skills.magic.level, S.char.level);
  if (spell.weaponScale) damage += Math.floor(profile.attack * skillLevel(profile.skill) * 0.02 * spell.weaponScale);
  if (!spendMana(spell.mana)) return;

  const monster = getMonster(c.monsterId);
  damage = Math.max(1, applyArmour(damage, Math.floor(monster.arm * 0.5)));
  c.hp -= damage;
  c.lastPlayerHit = { amount: damage, spell: spell.name };
  emit('combat:spell', { spell, amount: damage, kind: 'attack' });
}

function grantLoot(monster) {
  const gold = randInt(monster.gold[0], monster.gold[1]);
  if (gold > 0) addGold(gold);

  const gained = [];
  for (const drop of monster.loot) {
    if (!roll(drop.chance)) continue;
    const qty = randInt(drop.lo, drop.hi);
    const item = getItem(drop.item);
    if (S.settings.autoSell && item.value < S.settings.lootFilterValue) {
      addGold(Math.floor(item.value * 0.6) * qty);
      continue;
    }
    const added = addItem(drop.item, qty);
    if (added > 0) gained.push(`${added}x ${item.name}`);
  }
  return { gold, gained };
}

function killMonster(monster) {
  gainExp(monster.exp);
  S.stats.kills[monster.id] = (S.stats.kills[monster.id] ?? 0) + 1;
  S.stats.deathStreak = 0;
  const { gold, gained } = grantLoot(monster);
  const parts = [];
  if (gold) parts.push(`${gold} gold`);
  parts.push(...gained);
  pushLog(
    `You killed a ${monster.name.toLowerCase()} (+${monster.exp} exp)${parts.length ? `. Loot: ${parts.join(', ')}` : '.'}`,
    'kill',
  );
  S.combat.hp = 0;
  S.combat.respawn = RESPAWN_MS;
  emit('combat:kill', monster);
}

export function tickCombat(dt) {
  const area = getArea(S.action.areaId);
  if (!area) {
    stopAction();
    return;
  }
  if (!S.combat) {
    spawn(area);
    return;
  }

  const c = S.combat;
  if (c.respawn > 0) {
    c.respawn -= dt;
    if (c.respawn <= 0) spawn(area);
    return;
  }

  const monster = getMonster(c.monsterId);

  autoPotion();
  autoEat();
  castSpells(dt);
  if (c.hp <= 0) {
    killMonster(monster);
    return;
  }

  c.playerTimer += dt;
  const interval = playerAttackInterval();
  while (c.playerTimer >= interval && c.hp > 0) {
    c.playerTimer -= interval;
    playerAttack(monster);
    if (!S.combat) return; // stopped mid-swing (out of ammo)
  }
  if (c.hp <= 0) {
    killMonster(monster);
    return;
  }

  c.monsterTimer += dt;
  while (c.monsterTimer >= monster.speed) {
    c.monsterTimer -= monster.speed;
    if (monsterAttack(monster)) return; // we died; `c` is stale now
  }
}

/** Combat-screen summary used by the UI. */
export function combatStats() {
  const profile = weaponProfile();
  const skill = skillLevel(profile.skill);
  return {
    profile,
    skill,
    maxHit: maxHit(profile.attack, skill, S.char.level, S.settings.attackMode),
    armour: totalArmour(),
    defence: Math.round(defenceValue(skillLevel('shielding'), shieldDefence(), S.settings.attackMode)),
    attackSpeed: playerAttackInterval(),
    hp: S.char.hp, maxHp: maxHp(), mana: S.char.mana, maxMana: maxMp(),
  };
}

export { regenTick, count };
