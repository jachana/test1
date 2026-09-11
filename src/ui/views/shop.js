import { el, card, button, itemGlyph } from '../dom.js';
import { S, pushLog } from '../../core/state.js';
import { getItem } from '../../data/items.js';
import { SHOPS, buyPrice, sellPrice } from '../../data/shops.js';
import { formatNumber, formatWeight } from '../../core/util.js';
import { addGold, addItem, count, freeCapacity, removeItem } from '../../systems/inventory.js';
import { isDone } from '../../systems/quests.js';
import { compareEquip, VERDICT_LABEL } from '../../systems/compare.js';

export function shopView() {
  const updates = [];
  const openShops = () => SHOPS.filter((shop) => !shop.quest || isDone(shop.quest));
  let shopId = openShops()[0].id;

  const goldEl = el('div', { class: 'gold big' });
  updates.push(() => { goldEl.textContent = `🪙 ${formatNumber(S.gold)} gold`; });

  const tabs = el('div', { class: 'row wrap' });
  const stockList = el('div', { class: 'shop-list' });

  const buy = (itemId, qty) => {
    const price = buyPrice(itemId);
    const item = getItem(itemId);
    const affordable = Math.min(qty, Math.floor(S.gold / price));
    if (affordable <= 0) {
      pushLog('You do not have enough gold.', 'bad');
      return;
    }
    const fits = item.wt > 0 ? Math.floor((freeCapacity() * 10) / item.wt) : affordable;
    const final = Math.min(affordable, Math.max(0, fits));
    if (final <= 0) {
      pushLog('You cannot carry any more of that.', 'bad');
      return;
    }
    addGold(-price * final);
    addItem(itemId, final, { force: true });
    pushLog(`You buy ${final}x ${item.name} for ${formatNumber(price * final)} gold.`, 'info');
    render();
  };

  const sellAll = (itemId) => {
    const qty = count(itemId);
    if (qty <= 0) return;
    if (removeItem(itemId, qty)) {
      addGold(sellPrice(itemId) * qty);
      pushLog(`You sell ${qty}x ${getItem(itemId).name}.`, 'info');
      render();
    }
  };

  const render = () => {
    const shops = openShops();
    tabs.replaceChildren(...shops.map((shop) => button(`${shop.icon} ${shop.npc}`, () => { shopId = shop.id; render(); }, {
      class: shopId === shop.id ? 'active' : '',
    })));

    const shop = shops.find((s) => s.id === shopId) ?? shops[0];
    shopId = shop.id;
    stockList.replaceChildren(
      el('div', { class: 'muted small', text: shop.title }),
      ...shop.stock.map((itemId) => {
        const item = getItem(itemId);
        const price = buyPrice(itemId);
        const have = count(itemId);
        const locked = item.reqLevel && S.char.level < item.reqLevel;
        return el('div', { class: 'shop-row' }, [
          itemGlyph(item, { class: 'shop-icon' }),
          el('div', { class: 'shop-main' }, [
            el('div', { class: 'row space' }, [
              el('span', { text: item.name }),
              el('div', { class: 'row' }, [
                (() => {
                  const c = compareEquip(itemId);
                  return c && !c.equipped && c.verdict !== 'same'
                    ? el('span', { class: `verdict ${c.verdict}`, text: VERDICT_LABEL[c.verdict] })
                    : null;
                })(),
                el('span', { class: 'tag', text: `${formatNumber(price)} gp` }),
              ]),
            ]),
            el('div', { class: 'muted small', text: `${formatWeight(item.wt)} · sells back for ${formatNumber(sellPrice(itemId))} gp${have ? ` · you own ${formatNumber(have)}` : ''}${locked ? ` · needs level ${item.reqLevel}` : ''}` }),
          ]),
          el('div', { class: 'row' }, [
            button('1', () => buy(itemId, 1), { disabled: locked }),
            button('10', () => buy(itemId, 10), { disabled: locked }),
            button('100', () => buy(itemId, 100), { disabled: locked }),
            have ? button('Sell all', () => sellAll(itemId), { class: 'btn-danger' }) : null,
          ].filter(Boolean)),
        ]);
      }),
    );
    updates.forEach((fn) => fn());
  };

  const junkButton = button('Sell all junk (misc loot)', () => {
    let earned = 0;
    for (const entry of [...S.inventory]) {
      if (getItem(entry.id).type !== 'misc') continue;
      const value = sellPrice(entry.id) * entry.qty;
      if (removeItem(entry.id, entry.qty)) earned += value;
    }
    if (earned) {
      addGold(earned);
      pushLog(`You sell your junk for ${formatNumber(earned)} gold.`, 'good');
    } else pushLog('No junk to sell.', 'info');
    render();
  }, { class: 'btn-primary' });

  const node = el('div', { class: 'stack' }, [
    card('🏪 Traders', [goldEl, tabs, el('div', { class: 'row' }, [junkButton])]),
    card(null, stockList),
  ]);

  render();
  return { node, update: () => updates.forEach((fn) => fn()) };
}
