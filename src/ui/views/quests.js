import { el, bar, card, button, itemGlyph } from '../dom.js';
import { S } from '../../core/state.js';
import { QUESTS, getQuest } from '../../data/quests.js';
import { getItem } from '../../data/items.js';
import { AREAS } from '../../data/areas.js';
import { formatDuration, formatNumber } from '../../core/util.js';
import { chooseReward, isDone, questProblem, questStatus, startQuest } from '../../systems/quests.js';
import { stopAction } from '../../systems/combat.js';

export function questsView({ rerender }) {
  const updates = [];

  const headerCount = el('div', { class: 'big-level' });
  const headerReady = el('span', { class: 'tag' });
  const header = el('div', { class: 'row space' }, [headerCount, headerReady]);
  updates.push(() => {
    const s = questStatus();
    const count = `📜 Quests ${s.done} / ${s.total}`;
    const ready = `${s.available} ready`;
    if (headerCount.textContent !== count) headerCount.textContent = count;
    if (headerReady.textContent !== ready) headerReady.textContent = ready;
  });

  const list = el('div', { class: 'action-list' });

  /**
   * The running quest's progress bar, looked up by quest id.
   *
   * This used to be one `updates.push` per quest inside renderList — sixteen
   * closures, and renderList runs again every time you pick a reward chest, so
   * the tick loop grew by sixteen more each click and never shrank. The map is
   * replaced wholesale on each render and one closure below reads from it.
   */
  const progressBars = new Map();
  updates.push(() => {
    if (S.action?.type !== 'quest') return;
    const quest = getQuest(S.action.questId);
    const progress = progressBars.get(S.action.questId);
    if (!quest || !progress) return;
    progress.setFill(S.action.progress / quest.ms, `${formatDuration(quest.ms - S.action.progress)} left`);
  });

  const renderList = () => {
    progressBars.clear();
    list.replaceChildren(...QUESTS.map((quest) => {
      const done = isDone(quest.id);
      const problem = questProblem(quest);
      const running = S.action?.type === 'quest' && S.action.questId === quest.id;
      const locked = !done && !!problem;

      const rewardChips = [
        ...(quest.rewards ?? []).map(([id, qty]) => {
          const item = getItem(id);
          return el('span', { class: 'cost' }, [
            itemGlyph(item, { class: 'inline-sprite' }),
            `${qty > 1 ? `${qty}x ` : ''}${item.name}`,
          ]);
        }),
        quest.gold ? el('span', { class: 'cost', text: `🪙 ${formatNumber(quest.gold)}` }) : null,
        el('span', { class: 'cost', text: `✨ ${formatNumber(quest.exp)} exp` }),
      ].filter(Boolean);

      // The Annihilator moment: pick one chest before you walk in.
      const chosen = S.quests.choice?.[quest.id];
      const choiceRow = quest.choice && !done
        ? el('div', { class: 'row wrap costs' }, [
          el('span', { class: 'muted small', text: 'Pick one:' }),
          ...quest.choice.map((id) => {
            const item = getItem(id);
            return button(item.name, () => {
              chooseReward(quest.id, id);
              renderList();
            }, { class: chosen === id ? 'active' : '' });
          }),
        ])
        : (chosen ? el('div', { class: 'muted small', text: `Chest chosen: ${getItem(chosen).name}` }) : null);

      const progressBar = bar(0, { className: 'action' });
      progressBars.set(quest.id, progressBar);

      const go = button(running ? 'Turn back' : (done ? 'Completed' : 'Set out'), () => {
        if (running) stopAction(`You turn back from ${quest.name}.`);
        else startQuest(quest.id);
        rerender();
      }, { class: running ? 'btn-danger' : 'btn-primary', disabled: done || (!running && locked) });

      const unlockName = quest.unlocks
        ? AREAS.find((a) => a.id === quest.unlocks)?.name ?? quest.unlocks
        : null;

      return el('div', { class: `action-row${running ? ' active' : ''}${done ? ' done' : ''}${locked && !done ? ' locked' : ''}` }, [
        el('div', { class: 'action-main' }, [
          el('div', { class: 'row space' }, [
            el('span', { class: 'action-name', text: `${quest.icon} ${quest.name}` }),
            el('span', { class: 'tag', text: `${quest.town} · lvl ${quest.req}` }),
          ]),
          el('p', { class: 'muted small', text: quest.blurb }),
          el('div', { class: 'muted small', text: `Trip takes ${formatDuration(quest.ms)} · you take about ${quest.dps} damage a second on the way in` }),
          el('div', { class: 'row wrap costs' }, rewardChips),
          unlockName ? el('div', { class: 'warn small', text: `🗺️ Opens ${unlockName}` }) : null,
          quest.unlocksShop ? el('div', { class: 'warn small', text: '🏪 Opens a new trader' }) : null,
          choiceRow,
          done ? el('div', { class: 'badge', text: 'done' }) : null,
          !done && problem ? el('div', { class: 'warn small', text: problem }) : null,
          running ? progressBar : null,
        ]),
        el('div', { class: 'action-side' }, [go]),
      ]);
    }));
  };
  renderList();

  const node = el('div', { class: 'stack' }, [
    card(null, [
      header,
      el('p', { class: 'muted small', text: 'Quests are one-time trips. You take damage the whole way in, so go with food and potions — and some doors stay shut until the quest before them is done.' }),
    ]),
    card('🗺️ Quest Log', list),
  ]);

  const update = () => updates.forEach((fn) => fn());
  update();
  return { node, update };
}

export { getQuest };
