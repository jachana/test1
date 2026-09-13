import { S, pushLog } from '../core/state.js';
import { getArea, expMult, goldMult } from '../data/areas.js';
import { getMonster } from '../data/monsters.js';
import { SPELLS } from '../data/spells.js';
import { getItem, slotOf } from '../data/items.js';
import {
  applyArmour, blockChance, defenceValue, hitChance, maxHit, RESPAWN_MS,
} from '../core/formulas.js';
import { clamp, pickWeighted, randInt, roll } from '../core/util.js';
import { emit } from '../core/bus.js';
import { addGold, addItem, count, removeItem, totalArmour, shieldDefence } from './inventory.js';
import {
  autoEat, autoPotion, death, gainExp, gainSkill, heal, maxHp, maxMp,
  playerAttackInterval, regenTick, skillLevel, spendMana, weaponProfile, castValue, DEATH_WINDOW_MS,
} from './player.js';
import { VOCATION_LEVEL } from '../data/vocations.js';
import { questGateFor } from '../data/quests.js';
import { isUpgrade } from './compare.js';
import { isDone } from './quests.js';

/** A drop this unlikely is worth interrupting the player for. */
const RARE_DROP = 0.02;

/** Dying this many times inside one DEATH_WINDOW_MS means the area is too hard. */
const DEATH_STREAK_LIMIT = 3;

/** Below this share of health, an empty potion pouch is a reason to leave. */
const RETREAT_HP = 0.45;

/**
 * True when the character is hurt, relies on potions, and has none left.
 *
 * Only counts potions this character is allowed to drink: a level 90 knight
 * carrying nothing but the level 20 stack is out of supplies for the purposes
 * of anywhere that can actually hurt them.
 */
function outOfSupplies() {
  if (!S.settings.autoPotion) return false;
  if (S.char.hp > maxHp() * RETREAT_HP) return false;
  return !S.inventory.some((e) => {
    const item = getItem(e.id);
    return item.type === 'potion' && item.heal && S.char.level >= (item.reqLevel ?? 1);
  });
}

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
  if (!roll(hitChance(skill, monster.def))) {
    S.combat.lastPlayerHit = { amount: 0, miss: true };
    emit('combat:hit', { source: 'player', damage: 0, miss: true });
    return;
  }

  const max = maxHit(profile.attack, skill, S.char.level, S.settings.attackMode);
  let damage = randInt(Math.max(1, Math.floor(max * 0.4)), max);
  damage += profile.elemDmg ? randInt(1, profile.elemDmg) : 0;
  damage = applyArmour(damage, monster.arm, 1);

  S.combat.hp -= damage;
  S.combat.lastPlayerHit = { amount: damage, miss: false };
  gainSkill(profile.skill, 1);
  emit('combat:hit', { source: 'player', damage, miss: false });
}

/** Returns true when the blow killed us (the caller must stop immediately). */
function monsterAttack(monster) {
  const raw = randInt(monster.min, monster.max);
  const defence = defenceValue(skillLevel('shielding'), shieldDefence(), S.settings.attackMode);

  gainSkill('shielding', 1); // you train shielding by being attacked
  if (roll(blockChance(defence, raw))) {
    S.combat.lastMonsterHit = { amount: 0, blocked: true };
    emit('combat:hit', { source: 'monster', damage: 0, blocked: true });
    return false;
  }

  const damage = Math.max(0, applyArmour(raw, totalArmour()));
  S.char.hp -= damage;
  S.combat.lastMonsterHit = { amount: damage, blocked: false };
  emit('combat:hit', { source: 'monster', damage, blocked: false });

  if (S.char.hp > 0) return false;

  const areaId = S.action?.areaId;
  death(); // clears the current action and sends you to the temple
  S.stats.deathStreak = (S.stats.deathStreak ?? 0) + 1;
  S.timers.deathWindow = DEATH_WINDOW_MS; // regenTick clears the streak when it runs out
  if (S.settings.autoReturn && areaId && S.stats.deathStreak < DEATH_STREAK_LIMIT) {
    startHunt(areaId);
  } else if (areaId) {
    pushLog(`You have died ${S.stats.deathStreak} times in ten minutes. You stay in the temple rather than walk back into that.`, 'bad');
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
        const amount = castValue(spell);
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
  let damage = castValue(spell);
  if (spell.weaponScale) damage += Math.floor(profile.attack * skillLevel(profile.skill) * 0.02 * spell.weaponScale);
  if (!spendMana(spell.mana)) return;

  const monster = getMonster(c.monsterId);
  damage = applyArmour(damage, Math.floor(monster.arm * 0.5), 1);
  c.hp -= damage;
  c.lastPlayerHit = { amount: damage, spell: spell.name };
  emit('combat:spell', { spell, amount: damage, kind: 'attack' });
}

function grantLoot(monster, area) {
  const gold = Math.round(randInt(monster.gold[0], monster.gold[1]) * goldMult(area));
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
      // One in fifty or rarer: the whole reason anybody hunts a place twice.
      if (drop.chance <= RARE_DROP) emit('loot:rare', { item, chance: drop.chance, qty: added });
      S.stats.rareDrops = (S.stats.rareDrops ?? 0) + (drop.chance <= RARE_DROP ? 1 : 0);
    }
  }
  return { gold, gained };
}

function killMonster(monster, area) {
  const exp = Math.round(monster.exp * expMult(area));
  gainExp(exp);
  S.stats.kills[monster.id] = (S.stats.kills[monster.id] ?? 0) + 1;
  const { gold, gained } = grantLoot(monster, area);
  const parts = [];
  if (gold) parts.push(`${gold} gold`);
  parts.push(...gained);
  pushLog(
    `You killed a ${monster.name.toLowerCase()} (+${exp} exp)${parts.length ? `. Loot: ${parts.join(', ')}` : '.'}`,
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
  // Walking home broke is better than dying three times because the backpack
  // quietly ran dry — which is exactly how a level 150 knight lost a night in
  // Hellgate: autoPotion failed silently every 100ms until the next blow landed.
  if (outOfSupplies()) {
    stopAction('You are out of potions. You head back to town before something kills you.');
    return;
  }
  autoPotion();
  autoEat();
  castSpells(dt);
  if (c.hp <= 0) {
    killMonster(monster, area);
    return;
  }

  c.playerTimer += dt;
  if (c.playerTimer >= playerAttackInterval()) {
    c.playerTimer -= playerAttackInterval();
    playerAttack(monster);
    if (!S.combat) return; // stopped mid-swing (out of ammunition)
  }
  if (c.hp <= 0) {
    killMonster(monster, area);
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
