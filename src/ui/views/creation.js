import { el, button } from '../dom.js';
import { VOCATIONS } from '../../data/vocations.js';
import { SKILLS } from '../../data/skills.js';
import { newGame } from '../../core/state.js';

const SAMPLE_NAMES = ['Bubble', 'Eternal Oblivion', 'Kharsek', 'Arieswar', 'Mateusz', 'Gnomad', 'Violet'];

export function creationView(onDone) {
  let chosen = 'knight';
  const name = el('input', {
    class: 'input', maxlength: '24', placeholder: 'Character name',
    value: SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)],
  });

  const cards = el('div', { class: 'voc-grid' });
  const render = () => {
    cards.replaceChildren(...Object.values(VOCATIONS).map((voc) => {
      const rates = ['sword', 'distance', 'magic', 'shielding']
        .map((id) => `${SKILLS[id].name}: ×${(SKILLS[id].factor[voc.id] ?? 1.5).toFixed(1)}`)
        .join(' · ');
      return el('button', {
        class: `voc-card${chosen === voc.id ? ' selected' : ''}`,
        onClick: () => { chosen = voc.id; render(); },
      }, [
        el('div', { class: 'voc-icon', text: voc.icon }),
        el('div', { class: 'voc-name', text: voc.name }),
        el('p', { class: 'voc-blurb', text: voc.blurb }),
        el('div', { class: 'voc-stats', text: `+${voc.hpPerLevel} hp · +${voc.manaPerLevel} mana · +${voc.capPerLevel} cap per level` }),
        el('div', { class: 'voc-rates', text: `Skill cost ${rates}` }),
      ]);
    }));
  };
  render();

  const start = button('Enter Rookgaard', () => {
    newGame(name.value.trim() || 'Nameless', chosen);
    onDone();
  }, { class: 'btn-primary btn-lg' });

  return el('div', { class: 'creation' }, [
    el('h1', { class: 'logo', text: 'Tibia Idle' }),
    el('p', { class: 'tagline', text: 'An idle grind through the world of Tibia. Pick a vocation — it decides how fast your skills climb, just like the real thing.' }),
    el('label', { class: 'field' }, ['Name', name]),
    cards,
    start,
  ]);
}
