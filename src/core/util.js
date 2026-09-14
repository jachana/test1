/**
 * The game's source of randomness, in one place so a test can pin it.
 *
 * Everything that rolls dice goes through `random()`. It is Math.random until
 * somebody calls `setSeed`, which swaps in a small deterministic generator —
 * which is what lets the offline-parity test compare two runs that saw the
 * exact same spawns instead of two independent samples. With champions in the
 * mix, sampling noise alone was enough to fail a 5% band about one run in six.
 *
 * mulberry32: 32-bit state, good enough for spawn tables and loot rolls, and
 * short enough to read.
 */
let random = Math.random;

export function setSeed(seed) {
  if (seed == null) { random = Math.random; return; }
  let state = seed >>> 0;
  random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = () => random();

export function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function roll(chance) {
  return random() < chance;
}

export function pickWeighted(entries) {
  const total = entries.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  let r = random() * total;
  for (const e of entries) {
    r -= e.weight ?? 1;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

/** Division that survives a zero maximum (a level 1 rookie has 0 mana). */
export function ratio(value, max) {
  return max > 0 ? value / max : 0;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatNumber(n) {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString('en-US');
}

// Tibia shows weight in ounces with one decimal.
export function formatWeight(oz) {
  return `${(oz / 10).toFixed(1)} oz`;
}

export function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const parts = [];
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) parts.push(`${h}h`);
  if (h || m) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}
