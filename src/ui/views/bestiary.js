import { el, bar, card, button, itemGlyph, kvList } from '../dom.js';
import { S } from '../../core/state.js';
import { getItem } from '../../data/items.js';
import { formatNumber } from '../../core/util.js';
import { bestiaryEntries, bestiarySummary, knows, TIERS } from '../../systems/bestiary.js';
import { startHunt } from '../../systems/combat.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'met', label: 'Met' },
  { id: 'working', label: 'In progress' },
  { id: 'mastered', label: 'Mastered' },
  { id: 'unmet', label: 'Never seen' },
];

const matches = (entry, filter) => {
  if (filter === 'met') return entry.kills > 0;
  if (filter === 'unmet') return entry.kills === 0;
  if (filter === 'mastered') return entry.kills >= 500;
  if (filter === 'working') return entry.kills > 0 && entry.kills < 500;
  return true;
};

/** The chance of a drop, written the way a player reads it. */
const pct = (chance) => (chance >= 0.01 ? `${(chance * 100).toFixed(1)}%` : `1 in ${Math.round(1 / chance)}`);

export function bestiaryView({ rerender }) {
  const updates = [];
  let filter = 'met';
  let selected = null;

  // ------------------------------------------------------------------ header
  const summary = kvList();
  updates.push(() => {
    const s = bestiarySummary();
    summary.set([
      ['Creatures met', `${s.met} / ${s.total}`],
      ['Mastered', String(s.mastered)],
      ['Total kills', formatNumber(s.kills)],
    ]);
  });

  const filterRow = el('div', { class: 'row wrap' }, FILTERS.map((f) => button(f.label, () => {
    filter = f.id;
    renderAll();
  }, { class: filter === f.id ? 'active' : '', dataset: { filter: f.id } })));

  // -------------------------------------------------------------------- list
  const list = el('div', { class: 'bestiary' });

  const renderList = () => {
    const entries = bestiaryEntries().filter((e) => matches(e, filter));
    if (!entries.length) {
      list.replaceChildren(el('div', { class: 'muted', text: 'Nothing here yet. Go and meet something.' }));
      return;
    }
    if (!entries.some((e) => e.monster.id === selected)) selected = entries[0].monster.id;

    list.replaceChildren(...entries.map((e) => {
      const progress = bar(e.progress, { className: 'action' });
      return el('button', {
        class: `bestiary-row tier-${e.tier.name.toLowerCase()}${selected === e.monster.id ? ' selected' : ''}`,
        onClick: () => { selected = e.monster.id; renderAll(); },
      }, [
        el('span', { class: 'bestiary-icon', text: e.kills ? e.monster.icon : '❓' }),
        el('span', { class: 'grow stack tight' }, [
          el('span', { class: 'bestiary-name', text: e.kills ? e.monster.name : '???' }),
          progress,
        ]),
        el('span', { class: 'stack tight right' }, [
          el('span', { class: 'tag', text: e.tier.name }),
          el('span', { class: 'muted small', text: formatNumber(e.kills) }),
        ]),
      ]);
    }));
  };

  // ------------------------------------------------------------------ detail
  const detail = el('div', { class: 'detail' });

  const renderDetail = () => {
    const entry = bestiaryEntries().find((e) => e.monster.id === selected);
    if (!entry) {
      detail.replaceChildren(el('div', { class: 'muted', text: 'Select a creature.' }));
      return;
    }
    const { monster, kills, tier, next } = entry;
    const seen = kills > 0;

    const stats = [];
    if (knows(monster.id, 'basics')) {
      stats.push(['Health', formatNumber(monster.hp)], ['Experience', formatNumber(monster.exp)]);
    }
    if (knows(monster.id, 'combat')) {
      stats.push(
        ['Hits for', `${monster.min}-${monster.max}`],
        ['Attacks every', `${(monster.speed / 1000).toFixed(1)}s`],
        ['Armor', String(monster.arm)],
        ['Defence', String(monster.def)],
        ['Carries', `${monster.gold[0]}-${monster.gold[1]} gold`],
      );
    }

    const bonusLines = [];
    if (tier.expBonus) bonusLines.push(`+${Math.round(tier.expBonus * 100)}% experience from ${monster.name.toLowerCase()}s`);
    if (tier.lootBonus) bonusLines.push(`+${Math.round(tier.lootBonus * 100)}% drop chance from ${monster.name.toLowerCase()}s`);

    detail.replaceChildren(...[
      el('div', { class: 'detail-head' }, [
        el('span', { class: 'detail-icon', text: seen ? monster.icon : '❓' }),
        el('div', {}, [
          el('div', { class: 'detail-name', text: seen ? monster.name : 'Not yet met' }),
          el('div', { class: 'muted small', text: `${formatNumber(kills)} killed · ${tier.name}` }),
        ]),
      ]),
      next
        ? el('div', { class: 'muted small', text: `${formatNumber(next.remaining)} more to reach ${next.tier.name} — reveals ${next.tier.shows}${next.tier.expBonus ? `, +${Math.round(next.tier.expBonus * 100)}% experience` : ''}.` })
        : el('div', { class: 'rare-line', text: '✨ Nemesis. There is nothing left to learn about this thing.' }),
      bonusLines.length
        ? el('div', { class: 'stack tight' }, bonusLines.map((t) => el('div', { class: 'warn small', text: `★ ${t}` })))
        : null,
      stats.length
        ? (() => { const k = kvList(); k.set(stats); return k; })()
        : el('div', { class: 'muted small', text: 'Kill one to learn anything about it.' }),

      knows(monster.id, 'loot')
        ? el('div', { class: 'stack tight' }, [
          el('div', { class: 'muted small', text: 'Drops:' }),
          monster.loot.length
            ? el('div', { class: 'row wrap costs' }, monster.loot
              .slice()
              .sort((a, b) => a.chance - b.chance)
              .map((d) => el('span', { class: `cost${d.chance <= 0.02 ? ' rare' : ''}` }, [
                itemGlyph(getItem(d.item), { class: 'inline-sprite' }),
                `${getItem(d.item).name} ${pct(d.chance)}`,
              ])))
            : el('div', { class: 'muted small', text: 'Carries nothing but coin.' }),
        ])
        : el('div', { class: 'muted small', text: `Kill ${formatNumber(Math.max(0, 100 - kills))} more to learn what it drops.` }),

      entry.homes.length
        ? el('div', { class: 'stack tight' }, [
          el('div', { class: 'muted small', text: 'Found in:' }),
          el('div', { class: 'row wrap' }, entry.homes.map((area) => button(`${area.icon} ${area.name}`, () => {
            if (startHunt(area.id)) rerender();
          }))),
        ])
        : null,
    ].filter(Boolean));
  };

  function renderAll() {
    [...filterRow.children].forEach((b) => b.classList.toggle('active', b.dataset.filter === filter));
    renderList();
    renderDetail();
    updates.forEach((fn) => fn());
  }

  const tierLegend = el('div', { class: 'row wrap costs' }, TIERS.slice(1).map((t) => el('span', {
    class: 'cost', title: `Reveals ${t.shows}`,
    text: `${t.name} ${formatNumber(t.at)}${t.expBonus ? ` · +${Math.round(t.expBonus * 100)}% exp` : ''}`,
  })));

  const node = el('div', { class: 'grid-2' }, [
    card('📖 Bestiary', [
      summary,
      el('p', { class: 'muted small', text: 'What you know about a creature is what you have killed of it. Reaching a tier reveals more of its entry, and the last three pay you for it.' }),
      tierLegend,
      filterRow,
      list,
    ]),
    card('🔍 Creature', detail),
  ]);

  renderAll();

  // Kill counts move while you read this page.
  let lastKills = -1;
  const update = () => {
    const kills = bestiarySummary().kills;
    if (kills !== lastKills) {
      lastKills = kills;
      renderAll();
    }
  };
  update();
  return { node, update };
}
