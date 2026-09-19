import { SKILLS } from '../data/skills.js';
import { VOCATIONS } from '../data/vocations.js';
import { ITEMS } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { AREAS } from '../data/areas.js';
import { QUESTS } from '../data/quests.js';
import { SPELLS } from '../data/spells.js';
import { PERKS } from '../data/perks.js';
import { getAction } from '../data/actions.js';
import { levelForExp, maxHealth, maxMana } from './formulas.js';
import { emit } from './bus.js';

export const SAVE_KEY = 'tibia-idle:save:v1';
export const SAVE_VERSION = 1;
export const MAX_LOG = 120;
export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1000; // Melvor-style 12h cap

/** Live game state. Replaced wholesale on load/new game (ES live binding). */
export let S = null;

function freshSkills() {
  const skills = {};
  for (const [id, def] of Object.entries(SKILLS)) {
    skills[id] = { level: def.start, points: 0, totalTries: 0 };
  }
  return skills;
}

export function createState(name, vocation = 'none') {
  // Everyone starts vocationless on Rookgaard; the choice happens at level 8.
  const voc = VOCATIONS[vocation] ? vocation : 'none';
  const state = {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    lastTick: Date.now(),
    char: {
      name: (name || 'Nameless').slice(0, 24),
      vocation: voc,
      level: 1,
      exp: 0,
      hp: 150,
      mana: 35,
      food: 0, // seconds of regeneration left
      soul: 0, // spent on the perk board; every kill is one
      vocationChosenAt: null, // timestamp of the level 8 decision
    },
    skills: freshSkills(),
    // Rookgaard starter kit: a club, leathers and something to eat.
    equipment: {
      helmet: null, amulet: null, weapon: 'club', shield: 'wooden_shield',
      armour: 'leather_armor', ring: null, legs: 'leather_legs', boots: 'leather_boots', ammo: null,
    },
    inventory: [
      { id: 'ham', qty: 10 },
      { id: 'health_potion', qty: 5 },
      { id: 'brown_mushroom', qty: 5 },
    ],
    gold: 100,
    action: null,
    combat: null,
    timers: { hpRegen: 0, manaRegen: 0, food: 0, potion: 0, deathWindow: 0 },
    settings: {
      attackMode: 'balanced',
      autoEat: true,
      autoPotion: true,
      potionThreshold: 0.5,
      autoHeal: true,
      healSpell: null,
      attackSpell: null,
      autoSell: false,
      lootFilterValue: 0,
      autoReturn: true,
      sound: false, // an idle game lives in a background tab; ask before making noise
      volume: 0.25,
    },
    perks: {}, // perk id -> rank
    quests: { done: [], choice: {} },
    logSeq: 0, // monotonic: the log's signature for the UI
    stats: {
      kills: {}, deaths: 0, deathStreak: 0, goldEarned: 0, expEarned: 0,
      playtimeMs: 0, actionsDone: 0, itemsGathered: 0, rareDrops: 0, soulsEarned: 0,
    },
    log: [],
  };
  state.char.hp = maxHealth(1, voc);
  state.char.mana = maxMana(1, voc);
  return state;
}

export function setState(next) {
  S = next;
  emit('state:replaced', S);
}

export function newGame(name) {
  setState(createState(name));
  pushLog(`Welcome to Tibia, ${S.char.name}. You wash up on Rookgaard with no vocation and a club.`, 'good');
  pushLog('Reach level 8 to choose a vocation and sail for the mainland.', 'info');
  save();
  return S;
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export const SAVED_LOG_ENTRIES = 25;

export function save() {
  if (!S) return;
  S.lastTick = Date.now();
  try {
    // The log is ~84% of the payload and is pure scrollback; keep a short tail.
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, log: S.log.slice(0, SAVED_LOG_ENTRIES) }));
  } catch (err) {
    console.warn('could not save', err);
  }
}

/**
 * Loads the save. Throws if one exists but cannot be migrated — the caller shows
 * the recovery screen. Returning null here instead would drop the player into
 * character creation, whose first save overwrites the very save they need back.
 */
export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null; // storage unavailable; start fresh rather than fail
  }
  if (!raw) return null;
  setState(migrate(JSON.parse(raw)));
  return S;
}

export function wipe() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* ignore */ }
  S = null;
}

/** Fill in anything a newer version added, so old saves keep working. */
function migrate(raw) {
  const base = createState(raw?.char?.name ?? 'Nameless', raw?.char?.vocation ?? 'none');
  const merged = {
    ...base,
    ...raw,
    char: { ...base.char, ...raw.char },
    skills: { ...base.skills, ...raw.skills },
    equipment: { ...base.equipment, ...raw.equipment },
    timers: { ...base.timers, ...raw.timers },
    settings: { ...base.settings, ...raw.settings },
    stats: { ...base.stats, ...raw.stats },
    perks: { ...raw.perks },
    quests: { done: [], choice: {}, ...raw.quests },
    inventory: Array.isArray(raw.inventory) ? raw.inventory : base.inventory,
    log: Array.isArray(raw.log) ? raw.log.slice(-MAX_LOG) : [],
    version: SAVE_VERSION,
  };
  for (const [id, def] of Object.entries(SKILLS)) {
    if (!merged.skills[id]) merged.skills[id] = { level: def.start, points: 0, totalTries: 0 };
  }
  return sanitise(merged);
}

/**
 * Drops anything the save refers to that this version of the game no longer has.
 *
 * Content moves: creatures get cut, items get renamed, skills get replaced. A
 * save written before one of those changes will name things that are gone, and
 * every lookup for them throws — which used to take the whole page down on load
 * rather than just losing the stale bit.
 */
function sanitise(state) {
  if (!VOCATIONS[state.char.vocation]) state.char.vocation = 'none';

  state.inventory = (state.inventory ?? []).filter((e) => e && ITEMS[e.id] && e.qty > 0);
  for (const [slot, id] of Object.entries(state.equipment)) {
    if (id && !ITEMS[id]) state.equipment[slot] = null;
  }

  for (const id of Object.keys(state.skills)) {
    if (!SKILLS[id]) delete state.skills[id];
  }

  if (state.combat && !MONSTERS[state.combat.monsterId]) state.combat = null;

  const action = state.action;
  const actionIsGone = action && (
    (action.type === 'combat' && !AREAS.some((a) => a.id === action.areaId))
    || (action.type === 'idle' && !getAction(action.skill, action.actionId))
    || (action.type === 'quest' && !QUESTS.some((q) => q.id === action.questId))
    || !['combat', 'idle', 'quest'].includes(action.type)
  );
  if (actionIsGone) {
    state.action = null;
    state.combat = null;
  }

  state.quests.done = (state.quests.done ?? []).filter((id) => QUESTS.some((q) => q.id === id));
  for (const [questId, itemId] of Object.entries(state.quests.choice ?? {})) {
    if (!ITEMS[itemId] || !QUESTS.some((q) => q.id === questId)) delete state.quests.choice[questId];
  }

  for (const key of ['healSpell', 'attackSpell']) {
    if (state.settings[key] && !SPELLS[state.settings[key]]) state.settings[key] = null;
  }

  for (const id of Object.keys(state.stats.kills ?? {})) {
    if (!MONSTERS[id]) delete state.stats.kills[id];
  }

  // A perk that has been cut, or a rank beyond what it now offers, would keep
  // paying out forever from a save nobody can see into.
  state.perks = state.perks ?? {};
  for (const [id, at] of Object.entries(state.perks)) {
    const perk = PERKS.find((p) => p.id === id);
    if (!perk) delete state.perks[id];
    else state.perks[id] = Math.max(0, Math.min(perk.max, Math.floor(at) || 0));
  }
  state.char.soul = Math.max(0, Math.floor(state.char.soul) || 0);

  // Experience is the source of truth; a level that disagrees with it would
  // otherwise stick forever, since gainExp only ever raises the level.
  state.char.exp = Math.max(0, state.char.exp || 0);
  state.char.level = levelForExp(state.char.exp);

  const maxHp = maxHealth(state.char.level, state.char.vocation);
  const maxMp = maxMana(state.char.level, state.char.vocation);
  state.char.hp = Math.min(Math.max(1, state.char.hp || maxHp), maxHp);
  state.char.mana = Math.min(Math.max(0, state.char.mana || 0), maxMp);
  return state;
}

/** Exposed for tests: migration is where save compatibility actually lives. */
export const migrateForTest = (raw) => migrate(raw);

export function exportSave() {
  return btoa(encodeURIComponent(JSON.stringify(S)));
}

export function importSave(text) {
  const parsed = JSON.parse(decodeURIComponent(atob(text.trim())));
  setState(migrate(parsed));
  save();
  return S;
}

/** Append a line to the adventure log (newest first). */
export function pushLog(text, kind = 'info') {
  if (!S) return;
  const last = S.log[0];
  if (last && last.text === text && last.kind === kind) {
    last.count = (last.count ?? 1) + 1;
    last.at = Date.now();
  } else {
    S.log.unshift({ text, kind, at: Date.now(), count: 1 });
    if (S.log.length > MAX_LOG) S.log.length = MAX_LOG;
  }
  S.logSeq = (S.logSeq ?? 0) + 1;
  emit('log', S.log[0]);
}
