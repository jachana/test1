import { el, button } from '../dom.js';
import { VOCATION_LEVEL } from '../../data/vocations.js';
import { newGame } from '../../core/state.js';
import { vocationPreview } from './vocation.js';

const SAMPLE_NAMES = ['Bubble', 'Eternal Oblivion', 'Kharsek', 'Arieswar', 'Mateusz', 'Gnomad', 'Violet'];

export function creationView(onDone) {
  const name = el('input', {
    class: 'input', maxlength: '24', placeholder: 'Character name', id: 'char-name',
    value: SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)],
  });

  const start = button('Wash up on Rookgaard', () => {
    newGame(name.value.trim() || 'Nameless');
    onDone();
  }, { class: 'btn-primary btn-lg' });

  return el('div', { class: 'creation' }, [
    el('h1', { class: 'logo', text: 'Tibia Idle' }),
    el('p', { class: 'tagline', text: 'An idle grind through the world of Tibia. You begin the way everyone does: a vocationless citizen on Rookgaard, with a club and a wooden shield.' }),
    el('label', { class: 'field' }, ['Name', name]),
    start,
    el('div', { class: 'creation-note' }, [
      el('h3', { text: `What waits at level ${VOCATION_LEVEL}` }),
      el('p', { class: 'muted small', text: `Reach level ${VOCATION_LEVEL} and you may choose a vocation and board the ship to the mainland. Until then you train the slow, vocationless way — and the hunting grounds beyond Rookgaard stay closed. Vocation decides how fast every skill climbs, so the choice outlives the character.` }),
    ]),
    vocationPreview(),
  ]);
}
