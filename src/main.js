import { hasSave, load, save, wipe, exportSave, SAVE_KEY, S } from './core/state.js';
import { simulateOffline, startEngine } from './core/engine.js';
import { maxHealth, maxMana } from './core/formulas.js';
import { mountShell, offlineModal, rerender } from './ui/app.js';
import { vocationModal } from './ui/views/vocation.js';
import { canChooseVocation } from './data/vocations.js';
import { creationView } from './ui/views/creation.js';
import { clear, el, button } from './ui/dom.js';
import { setSound } from './ui/sound.js';

const root = document.getElementById('app');

function boot() {
  // The saved preference has to reach the audio module before anything can emit
  // a sound; nothing is constructed until the first one actually plays.
  setSound(S.settings.sound, S.settings.volume);
  const summary = simulateOffline();
  mountShell(root);
  startEngine();
  // A character who hit level 8 while away still owes us a decision.
  const promptVocation = () => {
    if (canChooseVocation(S.char)) vocationModal(() => rerender());
  };
  if (summary) offlineModal(summary, promptVocation);
  else promptVocation();
}

/**
 * Last resort. A save that this build cannot run should say so and offer a way
 * out — a blank page tells the player nothing and loses their character with no
 * chance to copy it out first.
 */
function showRecovery(error) {
  console.error('could not start the game', error);
  let backup = '';
  try {
    backup = localStorage.getItem(SAVE_KEY) ?? '';
  } catch { /* storage unavailable; nothing to rescue */ }

  const box = el('textarea', { class: 'input mono', rows: '4', hidden: true });
  clear(root).append(el('div', { class: 'creation' }, [
    el('h1', { class: 'logo', text: 'Tibia Idle' }),
    el('p', { class: 'tagline', text: 'Your save could not be loaded on this version of the game.' }),
    el('p', { class: 'muted small', text: String(error?.message ?? error) }),
    el('div', { class: 'row wrap' }, [
      button('Start a new character', () => {
        wipe();
        location.reload();
      }, { class: 'btn-primary btn-lg' }),
      backup ? button('Show my old save', () => { box.value = backup; box.hidden = false; }) : null,
    ]),
    box,
  ]));
}

try {
  if (hasSave() && load()) boot();
  else {
    clear(root).append(creationView(() => {
      save();
      boot();
    }));
  }
} catch (error) {
  showRecovery(error);
}

// Handy for poking at the game from the console while developing.
window.game = { get state() { return S; }, save, exportSave, maxHealth, maxMana };
