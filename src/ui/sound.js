// Sound, made out of nothing.
//
// The whole game is a directory of files a browser can open — no build step, no
// assets — so the audio has to be synthesised. These are short OscillatorNode
// blips through a gain envelope: a dull thud for a blow that lands, a tick for
// one that misses, a small rising figure for a level. It is not Tibia's audio,
// but silence was not either.
//
// Nothing is created until the first sound plays, because browsers refuse to
// start an AudioContext before the page has been clicked and a suspended one
// left running is a warning in the console on every load.

let ctx = null;
let master = null;

/** Off by default: a game you leave open in a tab should not make noise uninvited. */
let enabled = false;
let volume = 0.25;

function audio() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  return ctx;
}

export function setSound(on, level = volume) {
  enabled = !!on;
  volume = Math.max(0, Math.min(1, level));
  if (master) master.gain.value = volume;
  // Tabs suspend the context when they lose focus; resume on the way back in.
  if (enabled && ctx?.state === 'suspended') ctx.resume().catch(() => {});
}

export const soundEnabled = () => enabled;

/**
 * One note. `type` picks the waveform, `from`/`to` sweep the pitch, and the
 * gain envelope is what stops it sounding like a test tone.
 */
function tone({ from, to = from, ms = 90, type = 'square', gain = 0.5, delay = 0 }) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + ms / 1000);
  // A hard start clicks; a hard stop clicks louder. Ramp both ends.
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.connect(env).connect(master);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

/**
 * Blows land every couple of seconds and a big hunt is loud. Rate-limit the
 * combat blips so an offline catch-up or a fast weapon cannot machine-gun them.
 */
let lastHit = 0;
const throttled = (ms) => {
  const now = Date.now();
  if (now - lastHit < ms) return false;
  lastHit = now;
  return true;
};

export const SOUNDS = {
  hit: () => throttled(120) && tone({ from: 180, to: 90, ms: 70, type: 'square', gain: 0.35 }),
  hurt: () => throttled(120) && tone({ from: 220, to: 70, ms: 130, type: 'sawtooth', gain: 0.45 }),
  miss: () => throttled(120) && tone({ from: 900, to: 700, ms: 40, type: 'triangle', gain: 0.12 }),
  kill: () => tone({ from: 320, to: 160, ms: 140, type: 'square', gain: 0.4 }),
  spell: () => tone({ from: 620, to: 1180, ms: 120, type: 'triangle', gain: 0.3 }),
  potion: () => tone({ from: 500, to: 820, ms: 90, type: 'sine', gain: 0.3 }),
  loot: () => { tone({ from: 1046, ms: 60, type: 'triangle', gain: 0.3 }); tone({ from: 1568, ms: 90, type: 'triangle', gain: 0.28, delay: 0.06 }); },
  level: () => [523, 659, 784, 1046].forEach((f, i) => tone({ from: f, ms: 130, type: 'square', gain: 0.34, delay: i * 0.075 })),
  skill: () => { tone({ from: 784, ms: 70, type: 'square', gain: 0.26 }); tone({ from: 1046, ms: 90, type: 'square', gain: 0.24, delay: 0.07 }); },
  death: () => [392, 330, 262, 196].forEach((f, i) => tone({ from: f, ms: 220, type: 'sawtooth', gain: 0.4, delay: i * 0.16 })),
  quest: () => [659, 784, 988, 1319].forEach((f, i) => tone({ from: f, ms: 150, type: 'triangle', gain: 0.32, delay: i * 0.1 })),
};

/** Fire a named sound, or do nothing at all when sound is off. */
export function play(name) {
  if (!enabled) return;
  try {
    SOUNDS[name]?.();
  } catch {
    // A browser that will not make noise is not a reason to stop the game.
  }
}
