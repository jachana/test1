import { el, bar, card, button } from '../dom.js';
import { S } from '../../core/state.js';
import { SKILLS } from '../../data/skills.js';
import { VOCATIONS } from '../../data/vocations.js';
import { EQUIP_SLOTS, getItem } from '../../data/items.js';
import { expProgress, triesToAdvance } from '../../core/formulas.js';
import { formatDuration, formatNumber } from '../../core/util.js';
import { capacity, totalWeight, unequip } from '../../systems/inventory.js';
import { maxHp, maxMp, skillLevel, FOOD_CAP_SECONDS } from '../../systems/player.js';
import { combatStats } from '../../systems/combat.js';
import { totalKills } from '../../core/engine.js';

export function characterView({ rerender }) {
  const updates = [];
  const { char } = S;

  // ----------------------------------------------------------- vitals card
  const expBar = bar(0, { className: 'exp' });
  const hpBar = bar(1, { className: 'hp' });
  const mpBar = bar(1, { className: 'mana' });
  const foodBar = bar(0, { className: 'food' });
  const levelLine = el('div', { class: 'big-level' });
  const expLine = el('div', { class: 'muted small' });

  updates.push(() => {
    const p = expProgress(S.char.exp);
    levelLine.textContent = `Level ${p.level}`;
    expBar.setFill(p.ratio, `${formatNumber(p.into)} / ${formatNumber(p.need)} exp`);
    expLine.textContent = `${formatNumber(p.next - S.char.exp)} experience to level ${p.level + 1} · ${formatNumber(S.char.exp)} total`;
    hpBar.setFill(S.char.hp / maxHp(), `${Math.ceil(S.char.hp)} / ${maxHp()} hp`);
    mpBar.setFill(S.char.mana / maxMp(), `${Math.floor(S.char.mana)} / ${maxMp()} mana`);
    foodBar.setFill(S.char.food / FOOD_CAP_SECONDS, `Food ${formatDuration(S.char.food * 1000)}`);
  });

  const vitals = card(`${VOCATIONS[char.vocation].icon} ${char.name}`, [
    el('div', { class: 'row space' }, [
      levelLine,
      el('span', { class: 'tag', text: `${S.char.vocation === 'none' ? 'Citizen' : S.char.vocation[0].toUpperCase() + S.char.vocation.slice(1)}` }),
    ]),
    expBar, expLine, hpBar, mpBar, foodBar,
  ]);

  // -------------------------------------------------------- equipment card
  const slotGrid = el('div', { class: 'slot-grid' });
  const derived = el('div', { class: 'derived' });
  const renderSlots = () => {
    slotGrid.replaceChildren(...EQUIP_SLOTS.map((slot) => {
      const id = S.equipment[slot.id];
      const item = id ? getItem(id) : null;
      return el('button', {
        class: `slot${item ? ' filled' : ''}`,
        title: item ? `${item.name} — click to take off` : slot.name,
        onClick: () => { if (item) { unequip(slot.id); rerender(); } },
      }, [
        el('span', { class: 'slot-icon', text: item ? item.icon : slot.icon }),
        el('span', { class: 'slot-name', text: item ? item.name : slot.name }),
      ]);
    }));
  };
  renderSlots();

  updates.push(() => {
    const c = combatStats();
    derived.replaceChildren(...[
      ['Weapon', `${c.profile.icon} ${c.profile.name}`],
      [`${SKILLS[c.profile.skill].name}`, `${c.skill}`],
      ['Max hit', `${c.maxHit}`],
      ['Attack every', `${(c.attackSpeed / 1000).toFixed(1)}s`],
      ['Armor', `${c.armour}`],
      ['Defence', `${c.defence}`],
      ['Capacity', `${Math.floor(capacity() - totalWeight())} / ${capacity()} oz`],
    ].map(([k, v]) => el('div', { class: 'kv' }, [el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v })])));
  });

  const equipment = card('⚔️ Equipment', [slotGrid, derived]);

  // ------------------------------------------------------------ skills card
  const skillRows = el('div', { class: 'skill-rows' });
  updates.push(() => {
    skillRows.replaceChildren(...Object.entries(SKILLS).map(([id, def]) => {
      const s = S.skills[id];
      const need = triesToAdvance(id, s.level, S.char.vocation);
      const bonus = skillLevel(id) - s.level;
      const row = el('div', { class: 'skill-row' }, [
        el('span', { class: 'skill-icon', text: def.icon }),
        el('span', { class: 'skill-name', text: def.name }),
        el('span', { class: 'skill-level', text: bonus ? `${s.level} (+${bonus})` : `${s.level}` }),
      ]);
      const b = bar(need === Infinity ? 1 : s.points / need, {
        className: def.cat,
        label: need === Infinity ? 'maxed' : `${formatNumber(s.points)} / ${formatNumber(need)} ${def.unit}`,
      });
      return el('div', { class: 'skill-block' }, [row, b]);
    }));
  });

  const stats = el('div', { class: 'derived' });
  updates.push(() => {
    stats.replaceChildren(...[
      ['Monsters killed', formatNumber(totalKills())],
      ['Deaths', String(S.stats.deaths)],
      ['Gold earned', formatNumber(S.stats.goldEarned)],
      ['Actions completed', formatNumber(S.stats.actionsDone)],
      ['Items gathered', formatNumber(S.stats.itemsGathered)],
      ['Time played', formatDuration(S.stats.playtimeMs)],
    ].map(([k, v]) => el('div', { class: 'kv' }, [el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v })])));
  });

  const node = el('div', { class: 'grid-2' }, [
    el('div', {}, [vitals, equipment]),
    el('div', {}, [card('📈 Skills', skillRows), card('🏆 Milestones', stats)]),
  ]);

  const update = () => updates.forEach((fn) => fn());
  update();
  return { node, update };
}

export { button };
