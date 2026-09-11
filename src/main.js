import { hasSave, load, save, S } from './core/state.js';
import { simulateOffline, startEngine } from './core/engine.js';
import { mountShell, offlineModal } from './ui/app.js';
import { creationView } from './ui/views/creation.js';
import { clear } from './ui/dom.js';

const root = document.getElementById('app');

function boot() {
  const summary = simulateOffline();
  mountShell(root);
  startEngine();
  offlineModal(summary);
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
window.game = { get state() { return S; }, save };
