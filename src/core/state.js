import { SKILLS } from '../data/skills.js';
import { VOCATIONS } from '../data/vocations.js';
import { maxHealth, maxMana } from './formulas.js';
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
      soul: 100,
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
    timers: { hpRegen: 0, manaRegen: 0, food: 0 },
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
    },
    stats: { kills: {}, deaths: 0, deathStreak: 0, goldEarned: 0, expEarned: 0, playtimeMs: 0, actionsDone: 0, itemsGathered: 0 },
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

export function save() {
  if (!S) return;
  S.lastTick = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (err) {
    console.warn('could not save', err);
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = migrate(JSON.parse(raw));
    setState(parsed);
    return S;
  } catch (err) {
    console.error('save is corrupt, ignoring', err);
    return null;
  }
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
    inventory: Array.isArray(raw.inventory) ? raw.inventory : base.inventory,
    log: Array.isArray(raw.log) ? raw.log.slice(-MAX_LOG) : [],
    version: SAVE_VERSION,
  };
  for (const [id, def] of Object.entries(SKILLS)) {
    if (!merged.skills[id]) merged.skills[id] = { level: def.start, points: 0, totalTries: 0 };
  }
  return merged;
}

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
  emit('log', S.log[0]);
}
