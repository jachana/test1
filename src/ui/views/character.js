import { el, bar, card, button, itemGlyph, kvList } from '../dom.js';
import { S } from '../../core/state.js';
import { SKILLS } from '../../data/skills.js';
import { VOCATIONS, VOCATION_LEVEL, canChooseVocation } from '../../data/vocations.js';
import { EQUIP_SLOTS, getItem } from '../../data/items.js';
import { expProgress, triesToAdvance } from '../../core/formulas.js';
import { formatDuration, formatNumber, ratio } from '../../core/util.js';
import { capacity, totalWeight, unequip } from '../../systems/inventory.js';
import { maxHp, maxMp, skillLevel, FOOD_CAP_SECONDS } from '../../systems/player.js';
import { combatStats } from '../../systems/combat.js';
import { totalKills } from '../../core/engine.js';
import { vocationChooser } from './vocation.js';

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
    hpBar.setFill(ratio(S.char.hp, maxHp()), `${Math.ceil(S.char.hp)} / ${maxHp()} hp`);
    mpBar.setFill(ratio(S.char.mana, maxMp()), `${Math.floor(S.char.mana)} / ${maxMp()} mana`);
    foodBar.setFill(ratio(S.char.food, FOOD_CAP_SECONDS), `Food ${formatDuration(S.char.food * 1000)}`);
  });

  const vitals = card(`${VOCATIONS[char.vocation].icon} ${char.name}`, [
    el('div', { class: 'row space' }, [
      levelLine,
      el('span', { class: 'tag', text: VOCATIONS[S.char.vocation].name }),
    ]),
    expBar, expLine, hpBar, mpBar, foodBar,
  ]);

  // -------------------------------------------------------- equipment card
  const slotGrid = el('div', { class: 'slot-grid' });
  const derived = kvList();
  const renderSlots = () => {
    slotGrid.replaceChildren(...EQUIP_SLOTS.map((slot) => {
      const id = S.equipment[slot.id];
      const item = id ? getItem(id) : null;
      return el('button', {
        class: `slot${item ? ' filled' : ''}`,
        dataset: { slot: slot.id },
        title: item ? `${item.name} — click to take off` : slot.name,
        onClick: () => { if (item) { unequip(slot.id); rerender(); } },
      }, [
        item ? itemGlyph(item, { class: 'slot-icon' }) : el('span', { class: 'slot-icon', text: slot.icon }),
        el('span', { class: 'slot-name', text: item ? item.name : slot.name }),
      ]);
    }));
  };
  renderSlots();

  updates.push(() => {
    const c = combatStats();
    derived.set([
      ['Weapon', `${c.profile.icon} ${c.profile.name}`],
      [SKILLS[c.profile.skill].name, `${c.skill}`],
      ['Max hit', `${c.maxHit}`],
      ['Attack every', `${(c.attackSpeed / 1000).toFixed(1)}s`],
      ['Armor', `${c.armour}`],
      ['Defence', `${c.defence}`],
      ['Capacity', `${Math.floor(capacity() - totalWeight())} / ${capacity()} oz`],
    ]);
  });

  const equipment = card('⚔️ Equipment', [slotGrid, derived]);

  // ------------------------------------------------------------ skills card
  // The set of skills never changes, so build the blocks once and write the
  // level and the bar into them. Rebuilding twelve icon/name/level/bar groups
  // ten times a second was the other half of this page's element churn.
  const skillRows = el('div', { class: 'skill-rows' });
  const skillWidgets = Object.entries(SKILLS).map(([id, def]) => {
    const level = el('span', { class: 'skill-level' });
    const progress = bar(0, { className: def.cat });
    const block = el('div', { class: 'skill-block' }, [
      el('div', { class: 'skill-row' }, [
        el('span', { class: 'skill-icon', text: def.icon }),
        el('span', { class: 'skill-name', text: def.name }),
        level,
      ]),
      progress,
    ]);
    return { id, level, progress, block };
  });
  skillRows.replaceChildren(...skillWidgets.map((w) => w.block));

  updates.push(() => {
    for (const w of skillWidgets) {
      const s = S.skills[w.id];
      const need = triesToAdvance(w.id, s.level, S.char.vocation);
      const bonus = skillLevel(w.id) - s.level;
      const text = bonus ? `${s.level} (+${bonus})` : `${s.level}`;
      if (w.level.textContent !== text) w.level.textContent = text;
      w.progress.setFill(
        need === Infinity ? 1 : s.points / need,
        need === Infinity ? 'maxed' : `${formatNumber(s.points)} / ${formatNumber(need)} ${SKILLS[w.id].unit}`,
      );
    }
  });

  const stats = kvList();
  updates.push(() => {
    stats.set([
      ['Monsters killed', formatNumber(totalKills())],
      ['Deaths', String(S.stats.deaths)],
      ['Rare drops', formatNumber(S.stats.rareDrops ?? 0)],
      ['Gold earned', formatNumber(S.stats.goldEarned)],
      ['Actions completed', formatNumber(S.stats.actionsDone)],
      ['Items gathered', formatNumber(S.stats.itemsGathered)],
      ['Time played', formatDuration(S.stats.playtimeMs)],
    ]);
  });

  const vocationCardNode = canChooseVocation(char)
    ? card('⛵ Choose your vocation', vocationChooser(rerender), { class: 'highlight' })
    : (char.vocation === 'none'
      ? card('⛵ Still a citizen', [
        el('p', { class: 'muted small', text: `You are ${VOCATION_LEVEL - char.level} level${VOCATION_LEVEL - char.level === 1 ? '' : 's'} away from choosing a vocation. Until then only Rookgaard is open to you, spells stay out of reach, and every skill trains at the slow vocationless rate.` }),
      ])
      : null);

  const node = el('div', { class: 'grid-2' }, [
    el('div', {}, [vitals, vocationCardNode, equipment].filter(Boolean)),
    el('div', {}, [card('📈 Skills', skillRows), card('🏆 Milestones', stats)]),
  ]);

  const update = () => updates.forEach((fn) => fn());
  update();
  return { node, update };
}

export { button };
