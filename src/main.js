import { hasSave, load, save, S } from './core/state.js';
import { simulateOffline, startEngine } from './core/engine.js';
import { maxHealth, maxMana } from './core/formulas.js';
import { mountShell, offlineModal, rerender } from './ui/app.js';
import { vocationModal } from './ui/views/vocation.js';
import { canChooseVocation } from './data/vocations.js';
import { creationView } from './ui/views/creation.js';
import { clear } from './ui/dom.js';

const root = document.getElementById('app');

function boot() {
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

if (hasSave() && load()) {
  boot();
} else {
  clear(root).append(creationView(() => {
    save();
    boot();
  }));
}

// Handy for poking at the game from the console while developing.
window.game = { get state() { return S; }, save, maxHealth, maxMana };
