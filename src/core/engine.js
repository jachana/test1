import { S, save, pushLog, OFFLINE_CAP_MS } from './state.js';
import { emit, on } from './bus.js';
import { tickCombat } from '../systems/combat.js';
import { tickIdle } from '../systems/idle.js';
import { tickQuest } from '../systems/quests.js';
import { autoEat, regenTick } from '../systems/player.js';
import { sellPrice } from '../data/shops.js';

export const TICK_MS = 100;
const SAVE_EVERY_MS = 15000;
const MAX_STEP_MS = 1000;

let handle = null;
let lastFrame = 0;
let sinceSave = 0;

export function tick(dt) {
  if (!S) return;
  S.stats.playtimeMs += dt;
  regenTick(dt);

  if (S.action?.type === 'combat') tickCombat(dt);
  else if (S.action?.type === 'idle') tickIdle(dt);
  else if (S.action?.type === 'quest') tickQuest(dt);
  else autoEat();
}

function frame() {
  const now = Date.now();
  let dt = now - lastFrame;
  lastFrame = now;
  if (dt <= 0) return;
  // A backgrounded tab can hand us a huge gap; walk it in bounded steps.
  while (dt > 0) {
    const step = Math.min(dt, MAX_STEP_MS);
    tick(step);
    dt -= step;
  }
  sinceSave += TICK_MS;
  if (sinceSave >= SAVE_EVERY_MS) {
    sinceSave = 0;
    save();
  }
  // The simulation always runs; the repaint does not. Nobody is looking at a
  // hidden tab, and 'tick' is what drives every bar, label and progress meter
  // in the shell. The visibilitychange handler in the UI redraws on the way
  // back in, so nothing is left stale.
  if (!document.hidden) emit('tick');
}

export function startEngine() {
  stopEngine();
  lastFrame = Date.now();
  handle = setInterval(frame, TICK_MS);
  window.addEventListener('beforeunload', save);
}

export function stopEngine() {
  if (handle) clearInterval(handle);
  handle = null;
}

/**
 * Replays time spent away. Returns a summary for the welcome-back screen, or
 * null when there is nothing worth reporting.
 */
export function simulateOffline() {
  if (!S) return null;
  const elapsed = Math.min(Date.now() - (S.lastTick ?? Date.now()), OFFLINE_CAP_MS);
  if (elapsed < 60_000 || !S.action) {
    S.lastTick = Date.now();
    return null;
  }

  const before = {
    exp: S.char.exp,
    level: S.char.level,
    gold: S.gold,
    kills: totalKills(),
    actions: S.stats.actionsDone,
    items: S.stats.itemsGathered,
    deaths: S.stats.deaths,
    skills: Object.fromEntries(Object.entries(S.skills).map(([id, s]) => [id, s.level])),
    inventory: Object.fromEntries(S.inventory.map((e) => [e.id, e.qty])),
  };
  const action = { ...S.action };

  // What actually landed in the backpack while you were away. The summary used
  // to report a bare count of "items gathered", which told you nothing about
  // whether the night had produced a demon shield or four hundred bolts.
  const loot = [];
  const rare = [];
  const offRare = on('loot:rare', ({ item }) => rare.push(item.name));

  // Keep the offline replay out of the adventure log; we summarise instead.
  const realLog = S.log;
  S.log = [];
  let remaining = elapsed;
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_STEP_MS);
    tick(step);
    remaining -= step;
  }
  // The replay's own log is what says why it stopped; keep it before the real
  // scrollback goes back in, or the summary has nothing to explain itself with.
  const replayLog = S.log;
  S.log = realLog;
  S.lastTick = Date.now();
  offRare();

  for (const entry of S.inventory) {
    const gained = entry.qty - (before.inventory[entry.id] ?? 0);
    if (gained > 0) loot.push({ id: entry.id, qty: gained });
  }
  loot.sort((a, b) => sellPrice(b.id) * b.qty - sellPrice(a.id) * a.qty);

  const levelled = Object.entries(S.skills)
    .filter(([id, s]) => s.level > before.skills[id])
    .map(([id, s]) => ({ id, from: before.skills[id], to: s.level }));

  const summary = {
    elapsed,
    action,
    exp: S.char.exp - before.exp,
    levels: S.char.level - before.level,
    level: S.char.level,
    gold: S.gold - before.gold,
    kills: totalKills() - before.kills,
    actions: S.stats.actionsDone - before.actions,
    items: S.stats.itemsGathered - before.items,
    deaths: S.stats.deaths - before.deaths,
    skillLevels: levelled,
    loot: loot.slice(0, 8),
    lootKinds: loot.length,
    rare: [...new Set(rare)],
    stopped: !S.action,
    stoppedBecause: S.action ? null : lastStopReason(replayLog),
  };
  pushLog(`Welcome back! You were away for ${Math.round(elapsed / 60000)} minutes.`, 'good');
  save();
  return summary;
}

/**
 * The last thing that went wrong, for the welcome-back screen.
 *
 * "Your character stopped early — check the log" is not an answer when the log
 * was suppressed for the replay, so pull the reason back out of it.
 */
function lastStopReason(log) {
  const entry = log.find((e) => e.kind === 'bad' || e.kind === 'death');
  return entry?.text ?? null;
}

export function totalKills() {
  return Object.values(S.stats.kills).reduce((a, b) => a + b, 0);
}
