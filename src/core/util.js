export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function roll(chance) {
  return Math.random() < chance;
}

export function pickWeighted(entries) {
  const total = entries.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight ?? 1;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
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
