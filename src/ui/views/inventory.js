import { el, bar, card, button, itemIcon } from '../dom.js';
import { S, pushLog } from '../../core/state.js';
import { getItem, slotOf } from '../../data/items.js';
import { sellPrice } from '../../data/shops.js';
import { formatNumber, formatWeight } from '../../core/util.js';
import {
  addGold, capacity, count, equip, inventoryView, removeItem, totalWeight,
} from '../../systems/inventory.js';
import { eat, heal, restoreMana, maxHp } from '../../systems/player.js';
import { SPELLS } from '../../data/spells.js';
import { compareEquip, isUpgrade, VERDICT_LABEL } from '../../systems/compare.js';
import { spellHit } from '../../core/formulas.js';

export function inventoryView_({ rerender }) {
  const updates = [];
  let selected = S.inventory[0]?.id ?? null;

  const capBar = bar(0, { className: 'cap' });
  updates.push(() => {
    const used = totalWeight();
    capBar.setFill(used / capacity(), `${formatWeight(used * 10)} / ${formatWeight(capacity() * 10)}`);
  });

  const grid = el('div', { class: 'item-grid' });
  const detail = el('div', { class: 'detail' });

  const useItem = (item) => {
    if (item.type === 'food') {
      if (eat(item.id)) pushLog(`You eat ${item.name.toLowerCase()}.`, 'good');
      else pushLog('You are full.', 'info');
    } else if (item.type === 'potion') {
      if (S.char.level < (item.reqLevel ?? 1)) {
        pushLog(`You need level ${item.reqLevel} to drink that.`, 'bad');
        return;
      }
      if (removeItem(item.id, 1)) {
        if (item.heal) pushLog(`You drink ${item.name.toLowerCase()} (+${heal(item.heal)} hp).`, 'good');
        if (item.mana) pushLog(`You drink ${item.name.toLowerCase()} (+${restoreMana(item.mana)} mana).`, 'good');
      }
    } else if (item.type === 'rune') {
      const spell = SPELLS[item.spell];
      if (!spell) return;
      if (spell.kind === 'heal') {
        if (S.char.hp >= maxHp()) { pushLog('You are already at full health.', 'info'); return; }
        if (removeItem(item.id, 1)) {
          const amount = spellHit(spell.base, spell.perML, S.skills.magic.level, S.char.level);
          pushLog(`You use ${item.name.toLowerCase()} (+${heal(amount)} hp).`, 'good');
        }
      } else if (S.combat && S.combat.respawn <= 0) {
        if (removeItem(item.id, 1)) {
          const amount = spellHit(spell.base, spell.perML, S.skills.magic.level, S.char.level);
          S.combat.hp -= amount;
          S.combat.lastPlayerHit = { amount, spell: spell.name };
          pushLog(`You use ${item.name.toLowerCase()} for ${amount} damage.`, 'info');
        }
      } else {
        pushLog('There is nothing to attack.', 'bad');
      }
    }
    renderAll();
  };

  const renderDetail = () => {
    const entry = S.inventory.find((e) => e.id === selected);
    if (!entry) {
      detail.replaceChildren(el('div', { class: 'muted', text: 'Select an item.' }));
      return;
    }
    const item = getItem(entry.id);
    const slot = slotOf(item);
    const lines = [];
    if (item.atk) lines.push(['Attack', item.atk]);
    if (item.def) lines.push(['Defence', item.def]);
    if (item.arm) lines.push(['Armor', item.arm]);
    if (item.food) lines.push(['Regeneration', `${item.food} min`]);
    if (item.heal) lines.push(['Heals', `${item.heal} hp`]);
    if (item.mana) lines.push(['Restores', `${item.mana} mana`]);
    if (item.twoHanded) lines.push(['Hands', 'two-handed']);
    if (item.ws) lines.push(['Trains', item.ws]);
    if (item.skillBonus) lines.push(['Skill bonus', Object.entries(item.skillBonus).map(([k, v]) => `+${v} ${k}`).join(', ')]);
    if (item.regenBonus) lines.push(['Regen bonus', `+${item.regenBonus}`]);
    lines.push(['Weight', formatWeight(item.wt)]);
    lines.push(['Sells for', `${formatNumber(sellPrice(item.id))} gold`]);

    // How this sits against whatever is in that slot right now.
    const comparison = compareEquip(item.id);
    const compareBlock = comparison && !comparison.equipped
      ? el('div', { class: `compare ${comparison.verdict}` }, [
        el('div', { class: 'row space' }, [
          el('span', { class: 'compare-title', text: comparison.current ? `vs ${comparison.current.name}` : `vs empty ${comparison.slot}` }),
          el('span', { class: `verdict ${comparison.verdict}`, text: VERDICT_LABEL[comparison.verdict] }),
        ]),
        ...comparison.deltas.map((d) => el('div', { class: 'kv' }, [
          el('span', { class: 'k', text: d.label }),
          el('span', { class: `v delta ${d.change > 0 ? 'up' : 'down'}` }, [
            d.from == null ? '' : `${d.from} → ${d.to}  `,
            `${d.change > 0 ? '+' : ''}${d.unit === 's' ? `${(d.change / 1000).toFixed(1)}s` : d.change}`,
          ]),
        ])),
        comparison.weaponNote ? el('div', { class: 'muted small', text: comparison.weaponNote }) : null,
        comparison.deltas.length ? null : el('div', { class: 'muted small', text: 'Identical where it counts.' }),
      ])
      : null;

    const actions = [];
    if (slot) actions.push(button('Equip', () => { equip(item.id); renderAll(); }, { class: 'btn-primary' }));
    if (['food', 'potion', 'rune'].includes(item.type)) actions.push(button('Use', () => useItem(item), { class: 'btn-primary' }));
    actions.push(button('Sell 1', () => {
      if (removeItem(item.id, 1)) { addGold(sellPrice(item.id)); renderAll(); }
    }));
    if (count(item.id) > 1) {
      actions.push(button(`Sell all (${formatNumber(count(item.id))})`, () => {
        const qty = count(item.id);
        if (removeItem(item.id, qty)) { addGold(sellPrice(item.id) * qty); renderAll(); }
      }));
    }

    detail.replaceChildren(
      el('div', { class: 'detail-head' }, [
        el('span', { class: 'detail-icon', text: item.icon }),
        el('div', {}, [
          el('div', { class: 'detail-name', text: item.name }),
          el('div', { class: 'muted small', text: `${formatNumber(count(item.id))} in backpack · ${item.type}` }),
        ]),
      ]),
      el('div', { class: 'derived' }, lines.map(([k, v]) => el('div', { class: 'kv' }, [
        el('span', { class: 'k', text: k }), el('span', { class: 'v', text: String(v) }),
      ]))),
      ...(compareBlock ? [compareBlock] : []),
      el('div', { class: 'row wrap' }, actions),
    );
  };

  const renderGrid = () => {
    const view = inventoryView();
    if (!view.length) {
      grid.replaceChildren(el('div', { class: 'muted', text: 'Your backpack is empty.' }));
    } else {
      grid.replaceChildren(...view.map((entry) => el('button', {
        class: `item-tile${selected === entry.id ? ' selected' : ''}`,
        title: entry.item.name,
        onClick: () => { selected = entry.id; renderDetail(); renderGrid(); },
      }, [
        itemIcon(entry.item, entry.qty),
        isUpgrade(entry.id) ? el('span', { class: 'upgrade-mark', title: 'Better than what you are wearing', text: '▲' }) : null,
      ])));
    }
  };

  function renderAll() {
    if (!S.inventory.some((e) => e.id === selected)) selected = S.inventory[0]?.id ?? null;
    renderGrid();
    renderDetail();
    updates.forEach((fn) => fn());
  }

  const goldEl = el('span', { class: 'gold' });
  const stacksEl = el('span', { class: 'muted small' });
  updates.push(() => {
    goldEl.textContent = `🪙 ${formatNumber(S.gold)} gold`;
    stacksEl.textContent = `${S.inventory.length} stacks`;
  });

  const node = el('div', { class: 'grid-2' }, [
    card('🎒 Backpack', [
      el('div', { class: 'row space' }, [goldEl, stacksEl]),
      capBar, grid,
    ]),
    card('🔍 Item', detail),
  ]);

  const signature = () => `${S.gold}|${S.inventory.map((e) => `${e.id}:${e.qty}`).join(',')}`;
  let lastSig = '';
  renderAll();
  lastSig = signature();

  // Loot arriving while you hunt should show up without leaving the page.
  const update = () => {
    const sig = signature();
    if (sig !== lastSig) {
      lastSig = sig;
      renderAll();
    } else {
      updates.forEach((fn) => fn());
    }
  };
  return { node, update };
}
