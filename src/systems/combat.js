import { S, pushLog } from '../core/state.js';
import { getArea } from '../data/areas.js';
import { getMonster } from '../data/monsters.js';
import { SPELLS } from '../data/spells.js';
import { getItem, slotOf } from '../data/items.js';
import { maxHit, defenceValue, spellHit } from '../core/formulas.js';
import { clamp, pickWeighted, randInt, roll } from '../core/util.js';
import { emit } from '../core/bus.js';
import { addGold, addItem, count, removeItem, totalArmour, shieldDefence } from './inventory.js';
import {
  autoEat, autoPotion, death, gainExp, gainSkill, heal, maxHp, maxMp,
  playerAttackInterval, regenTick, skillLevel, spendMana, weaponProfile,
} from './player.js';
import { VOCATION_LEVEL } from '../data/vocations.js';
import { questGateFor } from '../data/quests.js';
import { isUpgrade } from './compare.js';
import { isDone } from './quests.js';

const RESPAWN_MS = 1500;
/** Dying this many times without a kill in between means the area is too hard. */
const DEATH_STREAK_LIMIT = 3;

/** Why you cannot travel here yet, or null when the road is open. */
export function travelProblem(area) {
  if (!area.rookgaard && S.char.vocation === 'none') {
    return `The ship to the mainland only takes adventurers with a vocation. Reach level ${VOCATION_LEVEL} and choose one.`;
  }
  const gate = questGateFor(area.id);
  if (gate && !isDone(gate.id)) {
    return `You cannot get in until you finish ${gate.name}.`;
  }
  return null;
}

export function startHunt(areaId) {
  const area = getArea(areaId);
  if (!area) return false;
  const blocked = travelProblem(area);
  if (blocked) {
    pushLog(blocked, 'bad');
    return false;
  }
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
        const amount = spellHit(spell.base, spell.perML, skillLevel('magic'), S.char.level);
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
  let damage = spellHit(spell.base, spell.perML, skillLevel('magic'), S.char.level);
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
    // Check before it lands: once it is in the backpack it compares against itself.
    const upgrade = slotOf(item) ? isUpgrade(drop.item) : false;
    const added = addItem(drop.item, qty);
    if (added > 0) {
      gained.push(`${added}x ${item.name}`);
      if (upgrade) pushLog(`${item.name} is better than what you are wearing.`, 'level');
    }
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

/**
 * How long until the next thing happens: a swing, a blow, or a respawn ending.
 * Slicing on these boundaries is what makes a 1-second offline step pay out
 * exactly what ten 100ms live ticks would.
 */
function nextEventIn() {
  const c = S.combat;
  if (c.respawn > 0) return c.respawn;
  const monster = getMonster(c.monsterId);
  return Math.max(1, Math.min(
    playerAttackInterval() - c.playerTimer,
    monster.speed - c.monsterTimer,
  ));
}

/** One slice of combat, never longer than the time to the next event. */
function stepCombat(area, dt) {
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
  if (c.playerTimer >= playerAttackInterval()) {
    c.playerTimer -= playerAttackInterval();
    playerAttack(monster);
    if (!S.combat) return; // stopped mid-swing (out of ammunition)
  }
  if (c.hp <= 0) {
    killMonster(monster);
    return;
  }

  c.monsterTimer += dt;
  if (c.monsterTimer >= monster.speed) {
    c.monsterTimer -= monster.speed;
    monsterAttack(monster); // may have killed us; the loop below re-checks state
  }
}

export function tickCombat(dt) {
  let remaining = dt;
  let guard = 0;
  while (remaining > 0.5 && guard++ < 10_000) {
    if (S.action?.type !== 'combat') return; // died, or stopped
    const area = getArea(S.action.areaId);
    if (!area) {
      stopAction();
      return;
    }
    if (!S.combat) spawn(area);
    const slice = Math.min(remaining, nextEventIn());
    stepCombat(area, slice);
    remaining -= slice;
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

export { regenTick, count, playerAttackInterval };
