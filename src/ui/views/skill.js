import { el, bar, card, button } from '../dom.js';
import { S } from '../../core/state.js';
import { SKILLS } from '../../data/skills.js';
import { ACTIONS } from '../../data/actions.js';
import { getItem } from '../../data/items.js';
import { triesToAdvance } from '../../core/formulas.js';
import { formatNumber } from '../../core/util.js';
import { actionDuration, requirementProblem, startIdle } from '../../systems/idle.js';
import { stopAction } from '../../systems/combat.js';
import { count } from '../../systems/inventory.js';
import { skillLevel } from '../../systems/player.js';

export function skillView(skillId, { rerender }) {
  const def = SKILLS[skillId];
  const updates = [];

  const header = el('div', { class: 'row space' });
  const progress = bar(0, { className: def.cat });
  updates.push(() => {
    const s = S.skills[skillId];
    const need = triesToAdvance(skillId, s.level, S.char.vocation);
    header.replaceChildren(
      el('div', { class: 'big-level', text: `${def.icon} ${def.name} ${s.level}` }),
      el('span', { class: 'muted small', text: `${formatNumber(s.totalTries)} total ${def.unit}` }),
    );
    progress.setFill(need === Infinity ? 1 : s.points / need, need === Infinity ? 'maxed' : `${formatNumber(s.points)} / ${formatNumber(need)} ${def.unit}`);
  });

  const rows = el('div', { class: 'action-list' });
  const renderRows = () => {
    rows.replaceChildren(...ACTIONS[skillId].map((action) => {
      const locked = skillLevel(skillId) < action.req;
      const active = S.action?.type === 'idle' && S.action.skill === skillId && S.action.actionId === action.id;
      const problem = requirementProblem(skillId, action);

      const yields = action.out.map((o) => {
        const item = getItem(o.item);
        const qty = o.lo === o.hi ? `${o.lo}` : `${o.lo}-${o.hi}`;
        const chance = o.chance < 1 ? ` ${Math.round(o.chance * 100)}%` : '';
        return `${item.icon} ${qty}x ${item.name}${chance}`;
      }).join(' · ');

      const inputs = (action.inputs ?? []).map((i) => {
        const item = getItem(i.item);
        const have = count(i.item);
        return el('span', { class: `cost${have >= i.qty ? '' : ' short'}` }, `${item.icon} ${i.qty}x ${item.name} (${formatNumber(have)})`);
      });

      const progressBar = bar(0, { className: 'action' });
      const startBtn = button(active ? 'Stop' : 'Start', () => {
        if (active) stopAction(`You stop ${action.name.toLowerCase()}.`);
        else startIdle(skillId, action.id);
        rerender();
      }, { class: active ? 'btn-danger' : 'btn-primary', disabled: locked || (!active && !!problem) });

      updates.push(() => {
        const running = S.action?.type === 'idle' && S.action.skill === skillId && S.action.actionId === action.id;
        if (!running) return;
        progressBar.setFill(S.action.progress / actionDuration(skillId, action), '');
      });

      return el('div', { class: `action-row${active ? ' active' : ''}${locked ? ' locked' : ''}` }, [
        el('div', { class: 'action-main' }, [
          el('div', { class: 'row space' }, [
            el('span', { class: 'action-name', text: `${action.icon} ${action.name}` }),
            el('span', { class: 'tag', text: `lvl ${action.req}` }),
          ]),
          el('div', { class: 'muted small', text: `${(actionDuration(skillId, action) / 1000).toFixed(1)}s · +${action.tries} ${def.unit}${action.mana ? ` · ${action.mana} mana` : ''}` }),
          el('div', { class: 'yields small', text: yields }),
          inputs.length ? el('div', { class: 'row wrap costs' }, inputs) : null,
          locked ? el('div', { class: 'muted small', text: `Locked until ${def.name} ${action.req}.` })
            : (problem && !active ? el('div', { class: 'warn small', text: problem }) : null),
          active ? progressBar : null,
        ]),
        el('div', { class: 'action-side' }, [startBtn]),
      ]);
    }));
  };
  renderRows();

  const node = el('div', { class: 'stack' }, [
    card(null, [header, progress]),
    card(`${def.cat === 'gathering' ? '⛏️ Gathering' : '🛠️ Production'}`, rows),
  ]);
  const update = () => updates.forEach((fn) => fn());
  update();
  return { node, update };
}
