import { el, bar, card, button, kvList } from '../dom.js';
import { S } from '../../core/state.js';
import { PERKS, perkCost, SOULS_PER_CHAMPION } from '../../data/perks.js';
import { formatNumber } from '../../core/util.js';
import {
  activePerks, buyPerk, canBuy, nextCost, rank, souls, soulsSpent,
} from '../../systems/perks.js';

export function perksView() {
  const updates = [];

  const summary = kvList();
  updates.push(() => {
    summary.set([
      ['Soul points', formatNumber(souls())],
      ['Earned all told', formatNumber(S.stats.soulsEarned ?? 0)],
      ['Spent on the board', formatNumber(soulsSpent())],
    ]);
  });

  const board = el('div', { class: 'perk-grid' });

  const renderBoard = () => {
    board.replaceChildren(...PERKS.map((perk) => {
      const at = rank(perk.id);
      const cost = nextCost(perk.id);
      const maxed = cost === null;
      const affordable = canBuy(perk.id);

      const pips = el('div', { class: 'perk-pips' }, Array.from({ length: perk.max }, (_, i) => el('span', {
        class: `perk-pip${i < at ? ' filled' : ''}`,
      })));

      const buy = button(
        maxed ? 'Complete' : `${formatNumber(cost)} souls`,
        () => { if (buyPerk(perk.id)) renderAll(); },
        { class: maxed ? '' : (affordable ? 'btn-primary' : ''), disabled: maxed || !affordable },
      );

      return el('div', { class: `perk-card${at ? ' owned' : ''}${maxed ? ' maxed' : ''}` }, [
        el('div', { class: 'row space' }, [
          el('span', { class: 'perk-name', text: `${perk.icon} ${perk.name}` }),
          el('span', { class: 'tag', text: `${at} / ${perk.max}` }),
        ]),
        pips,
        el('p', { class: 'muted small', text: perk.blurb }),
        el('div', { class: 'perk-effect small', text: at ? perk.effect(at) : `Rank 1: ${perk.effect(1)}` }),
        !maxed && at
          ? el('div', { class: 'muted small', text: `Next: ${perk.effect(at + 1)}` })
          : null,
        buy,
      ]);
    }));
  };

  const activeList = el('div', { class: 'stack tight' });
  const renderActive = () => {
    const active = activePerks();
    activeList.replaceChildren(...(active.length
      ? active.map(({ perk, rank: r, text }) => el('div', { class: 'kv' }, [
        el('span', { class: 'k', text: `${perk.icon} ${perk.name} ${r}` }),
        el('span', { class: 'v', text }),
      ]))
      : [el('div', { class: 'muted small', text: 'Nothing bought yet. Go and kill something.' })]));
  };

  // Souls come in while you read this page; the next rank becoming affordable
  // is the only thing that needs to redraw.
  const cheapest = () => Math.min(...PERKS.map((p) => nextCost(p.id) ?? Infinity));
  let lastAffordable = null;

  function renderAll() {
    renderBoard();
    renderActive();
    updates.forEach((fn) => fn());
    lastAffordable = PERKS.filter((p) => canBuy(p.id)).map((p) => p.id).join(',');
  }

  const node = el('div', { class: 'grid-2' }, [
    el('div', {}, [
      card('✨ Soul Board', [
        summary,
        el('p', { class: 'muted small', text: `Every kill is a soul point; a champion is ${SOULS_PER_CHAMPION}. The board is the only progress that survives a death — losing a level costs you experience, never a rank.` }),
        board,
      ]),
    ]),
    el('div', {}, [
      card('★ In effect', activeList),
      card('📐 What it costs', [
        el('p', { class: 'muted small', text: 'Rank one of anything is an evening. Rank five costs about as much as the four below it together.' }),
        (() => {
          const k = kvList();
          k.set(PERKS.slice(0, 3).map((p) => [
            p.name,
            Array.from({ length: p.max }, (_, i) => formatNumber(perkCost(p, i))).join(' · '),
          ]));
          return k;
        })(),
      ]),
    ]),
  ]);

  renderAll();

  const update = () => {
    updates.forEach((fn) => fn());
    const affordable = PERKS.filter((p) => canBuy(p.id)).map((p) => p.id).join(',');
    if (affordable !== lastAffordable) renderAll();
  };
  update();
  return { node, update, cheapest };
}
