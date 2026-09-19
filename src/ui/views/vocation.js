import { el, button } from '../dom.js';
import { S } from '../../core/state.js';
import { SKILLS } from '../../data/skills.js';
import { VOCATIONS, CHOOSABLE, VOCATION_LEVEL } from '../../data/vocations.js';
import { maxHealth, maxMana, skillFactor } from '../../core/formulas.js';
import { chooseVocation } from '../../systems/player.js';

const PREVIEW_LEVEL = 50;
const SHOWN_SKILLS = ['sword', 'distance', 'magic', 'shielding'];

/** One vocation card. In preview mode it is informational, not clickable. */
function vocationCard(voc, { selected, onPick }) {
  const rates = SHOWN_SKILLS
    .map((id) => `${SKILLS[id].name.replace(' Fighting', '')} ×${skillFactor(id, voc.id).toFixed(1)}`)
    .join(' · ');
  const children = [
    el('div', { class: 'voc-icon', text: voc.icon }),
    el('div', { class: 'voc-name', text: voc.name }),
    el('p', { class: 'voc-blurb', text: voc.blurb }),
    voc.weapon ? el('p', { class: 'voc-blurb', text: voc.weapon }) : null,
    el('div', { class: 'voc-stats', text: `+${voc.hpPerLevel} hp · +${voc.manaPerLevel} mana · +${voc.capPerLevel} oz per level` }),
    el('div', { class: 'voc-stats muted', text: `At level ${PREVIEW_LEVEL}: ${maxHealth(PREVIEW_LEVEL, voc.id)} hp, ${maxMana(PREVIEW_LEVEL, voc.id)} mana` }),
    el('div', { class: 'voc-rates', text: `Skill cost ${rates} (lower is faster)` }),
  ];
  if (!onPick) return el('div', { class: 'voc-card' }, children);
  return el('button', {
    class: `voc-card${selected ? ' selected' : ''}`,
    onClick: () => onPick(voc.id),
  }, children);
}

/** Read-only table shown during character creation. */
export function vocationPreview() {
  return el('div', { class: 'voc-grid' }, CHOOSABLE.map((id) => vocationCard(VOCATIONS[id], {})));
}

/**
 * The level 8 decision. `onDone` runs after a vocation is picked.
 */
export function vocationChooser(onDone) {
  let picked = null;
  const grid = el('div', { class: 'voc-grid' });
  const confirm = button('Choose vocation', () => {
    if (picked && chooseVocation(picked)) onDone?.();
  }, { class: 'btn-primary btn-lg', disabled: true });

  const render = () => {
    grid.replaceChildren(...CHOOSABLE.map((id) => vocationCard(VOCATIONS[id], {
      selected: picked === id,
      onPick: (choice) => { picked = choice; render(); },
    })));
    confirm.disabled = !picked;
    confirm.textContent = picked ? `Become a ${VOCATIONS[picked].name}` : 'Choose vocation';
  };
  render();

  return el('div', { class: 'stack' }, [
    el('p', { class: 'muted small', text: `You have reached level ${VOCATION_LEVEL}. The ship in Rookgaard harbour is ready — but only vocationed adventurers may board. This choice is permanent, exactly as it is in Tibia.` }),
    grid,
    confirm,
  ]);
}

/** Modal shown the moment you hit level 8. */
export function vocationModal(onDone) {
  const backdrop = el('div', { class: 'modal-backdrop' });
  const close = () => backdrop.remove();
  const modal = el('div', { class: 'modal modal-wide' }, [
    el('h2', { text: 'Time to choose a vocation' }),
    vocationChooser(() => { close(); onDone?.(); }),
    button('Stay a citizen for now', close, { class: 'btn' }),
  ]);
  backdrop.append(modal);
  document.body.append(backdrop);
  return backdrop;
}

export function vocationName(id) {
  return VOCATIONS[id]?.name ?? 'Citizen';
}

export { S };
