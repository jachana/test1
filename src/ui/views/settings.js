import { el, card, button } from '../dom.js';
import { S, exportSave, importSave, save, wipe, pushLog } from '../../core/state.js';
import { MONSTERS } from '../../data/monsters.js';
import { formatNumber } from '../../core/util.js';
import { totalKills } from '../../core/engine.js';

function toggle(label, get, set, hint) {
  const input = el('input', { type: 'checkbox', checked: get() });
  input.addEventListener('change', () => set(input.checked));
  return el('label', { class: 'toggle' }, [
    input,
    el('div', {}, [el('div', { text: label }), hint ? el('div', { class: 'muted small', text: hint }) : null]),
  ]);
}

export function settingsView({ rerender }) {
  const automation = card('⚙️ Automation', [
    toggle('Auto-eat', () => S.settings.autoEat, (v) => { S.settings.autoEat = v; },
      'Eats the cheapest food in your backpack when your regeneration runs low.'),
    toggle('Auto-drink potions', () => S.settings.autoPotion, (v) => { S.settings.autoPotion = v; },
      'Drinks the weakest useful potion when health drops below the threshold.'),
    (() => {
      const slider = el('input', { type: 'range', min: '10', max: '90', step: '5', value: String(S.settings.potionThreshold * 100) });
      const out = el('span', { class: 'tag', text: `${Math.round(S.settings.potionThreshold * 100)}%` });
      slider.addEventListener('input', () => {
        S.settings.potionThreshold = Number(slider.value) / 100;
        out.textContent = `${slider.value}%`;
      });
      return el('label', { class: 'field' }, ['Potion threshold', el('div', { class: 'row' }, [slider, out])]);
    })(),
    toggle('Auto-heal with spells', () => S.settings.autoHeal, (v) => { S.settings.autoHeal = v; },
      'Casts the healing spell selected on the Hunt page when you drop below 70% health.'),
    toggle('Walk back after dying', () => S.settings.autoReturn, (v) => { S.settings.autoReturn = v; },
      'Returns to the same hunting ground after a death, so offline runs keep going. Three deaths without a kill stops it anyway.'),
    toggle('Auto-sell cheap loot', () => S.settings.autoSell, (v) => { S.settings.autoSell = v; },
      'Converts low-value drops straight into gold instead of filling your backpack.'),
    (() => {
      const input = el('input', { class: 'input', type: 'number', min: '0', step: '10', value: String(S.settings.lootFilterValue) });
      input.addEventListener('change', () => { S.settings.lootFilterValue = Math.max(0, Number(input.value) || 0); });
      return el('label', { class: 'field' }, ['Auto-sell anything worth less than (gold)', input]);
    })(),
  ]);

  const saveCard = card('💾 Save Data', [
    el('p', { class: 'muted small', text: 'Progress is stored in this browser and saves every 15 seconds. Offline progress is credited for up to 12 hours away.' }),
    el('div', { class: 'row wrap' }, [
      button('Save now', () => { save(); pushLog('Game saved.', 'good'); }, { class: 'btn-primary' }),
      button('Copy save to clipboard', async () => {
        const text = exportSave();
        try {
          await navigator.clipboard.writeText(text);
          pushLog('Save copied to clipboard.', 'good');
        } catch {
          pushLog('Clipboard blocked — use the text box below.', 'bad');
        }
      }),
    ]),
    (() => {
      const box = el('textarea', { class: 'input mono', rows: '4', placeholder: 'Paste a save string here to import…' });
      const out = el('div', { class: 'muted small' });
      return el('div', { class: 'stack tight' }, [
        el('details', {}, [
          el('summary', { text: 'Export / import save string' }),
          el('div', { class: 'stack tight' }, [
            button('Show my save string', () => { box.value = exportSave(); }),
            box,
            button('Import', () => {
              try {
                importSave(box.value);
                pushLog('Save imported.', 'good');
                rerender();
              } catch (err) {
                out.textContent = `Import failed: ${err.message}`;
              }
            }, { class: 'btn-primary' }),
            out,
          ]),
        ]),
      ]);
    })(),
    button('Delete character', () => {
      if (confirm('Delete this character and all progress? This cannot be undone.')) {
        wipe();
        location.reload();
      }
    }, { class: 'btn-danger' }),
  ]);

  const killed = Object.entries(S.stats.kills).sort((a, b) => b[1] - a[1]);
  const bestiary = card('📖 Bestiary', [
    el('div', { class: 'muted small', text: `${killed.length} of ${Object.keys(MONSTERS).length} creatures slain · ${formatNumber(totalKills())} kills total` }),
    el('div', { class: 'bestiary' }, killed.length
      ? killed.map(([id, kills]) => {
        const m = MONSTERS[id];
        return el('div', { class: 'bestiary-row' }, [
          el('span', { text: m?.icon ?? '❓' }),
          el('span', { class: 'grow', text: m?.name ?? id }),
          el('span', { class: 'tag', text: formatNumber(kills) }),
        ]);
      })
      : [el('div', { class: 'muted', text: 'Nothing slain yet.' })]),
  ]);

  const node = el('div', { class: 'grid-2' }, [el('div', {}, [automation, saveCard]), el('div', {}, [bestiary])]);
  return { node, update: () => {} };
}
