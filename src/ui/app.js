import { el, bar, button, clear } from './dom.js';
import { on } from '../core/bus.js';
import { S, save, pushLog } from '../core/state.js';
import { SKILLS } from '../data/skills.js';
import { ACTIONS, getAction } from '../data/actions.js';
import { AREAS } from '../data/areas.js';
import { getMonster } from '../data/monsters.js';
import { getItem } from '../data/items.js';
import { expProgress } from '../core/formulas.js';
import { formatDuration, formatNumber, ratio } from '../core/util.js';
import { capacity, totalWeight } from '../systems/inventory.js';
import { maxHp, maxMp, FOOD_CAP_SECONDS } from '../systems/player.js';
import { characterView } from './views/character.js';
import { combatView } from './views/combat.js';
import { skillView } from './views/skill.js';
import { inventoryView_ } from './views/inventory.js';
import { shopView } from './views/shop.js';
import { settingsView } from './views/settings.js';
import { questsView } from './views/quests.js';
import { bestiaryView } from './views/bestiary.js';
import { perksView } from './views/perks.js';
import { getQuest } from '../data/quests.js';
import { vocationModal } from './views/vocation.js';
import { canChooseVocation, VOCATIONS } from '../data/vocations.js';
import { play, setSound, soundEnabled } from './sound.js';

const NAV = [
  { route: 'character', label: 'Character', icon: '🧝' },
  { route: 'combat', label: 'Hunt', icon: '⚔️' },
  { route: 'quests', label: 'Quests', icon: '📜' },
  { route: 'bestiary', label: 'Bestiary', icon: '📖' },
  { route: 'perks', label: 'Soul Board', icon: '✨' },
  { route: 'inventory', label: 'Backpack', icon: '🎒' },
  { route: 'shop', label: 'Traders', icon: '🏪' },
  { group: 'Skills' },
  ...Object.keys(ACTIONS).map((id) => ({ route: `skill:${id}`, label: SKILLS[id].name, icon: SKILLS[id].icon })),
  { group: '' },
  { route: 'settings', label: 'Settings', icon: '⚙️' },
];

let route = 'combat';
let active = null;
let shell = null;
let headerBars = null;
const shellUpdates = [];

function buildView(ctx) {
  if (route.startsWith('skill:')) return skillView(route.slice(6), ctx);
  switch (route) {
    case 'character': return characterView(ctx);
    case 'inventory': return inventoryView_(ctx);
    case 'shop': return shopView(ctx);
    case 'settings': return settingsView(ctx);
    case 'quests': return questsView(ctx);
    case 'bestiary': return bestiaryView(ctx);
    case 'perks': return perksView(ctx);
    case 'combat':
    default: return combatView(ctx);
  }
}

export function navigate(next) {
  route = next;
  rerender();
}

export function rerender() {
  if (!shell) return;
  const ctx = { rerender, navigate };
  // Views subscribe to the bus now, so the outgoing one has to be told to let
  // go — otherwise every navigation leaves another set of live handlers behind.
  active?.dispose?.();
  active = buildView(ctx);
  clear(shell.main).append(active.node);
  shell.renderNav();
  shell.update();
  window.scrollTo({ top: 0 });
}

/** Short description of what the character is busy with, for the header. */
export function currentActivity() {
  if (!S.action) return { text: 'Idle', icon: '💤' };
  if (S.action.type === 'combat') {
    const area = AREAS.find((a) => a.id === S.action.areaId);
    const target = S.combat ? getMonster(S.combat.monsterId).name : '…';
    return { text: `Hunting ${target} — ${area?.name ?? ''}`, icon: area?.icon ?? '⚔️' };
  }
  if (S.action.type === 'quest') {
    const quest = getQuest(S.action.questId);
    return { text: `On a quest — ${quest?.name ?? '…'}`, icon: quest?.icon ?? '📜' };
  }
  const action = getAction(S.action.skill, S.action.actionId);
  return { text: `${action?.name ?? 'Working'} — ${SKILLS[S.action.skill].name}`, icon: action?.icon ?? '🎣' };
}

function buildHeader() {
  const name = el('div', { class: 'hdr-name' });
  const level = el('span', { class: 'tag' });
  const expBar = bar(0, { className: 'exp' });
  const hpBar = bar(1, { className: 'hp' });
  const mpBar = bar(1, { className: 'mana' });
  const foodBar = bar(0, { className: 'food' });
  const activity = el('div', { class: 'hdr-activity' });
  const gold = el('div', { class: 'gold' });
  const soulCount = el('div', { class: 'souls' });
  const cap = el('div', { class: 'muted small' });

  shellUpdates.push(() => {
    const p = expProgress(S.char.exp);
    name.textContent = S.char.name;
    level.textContent = `Level ${p.level} ${VOCATIONS[S.char.vocation].name}`;
    expBar.setFill(p.ratio, `${Math.floor(p.ratio * 100)}% to ${p.level + 1}`);
    const hpShare = ratio(S.char.hp, maxHp());
    hpBar.setFill(hpShare, `${Math.ceil(S.char.hp)} hp`);
    hpBar.setCritical(hpShare < 0.3);
    mpBar.setFill(ratio(S.char.mana, maxMp()), `${Math.floor(S.char.mana)} mana`);
    foodBar.setFill(ratio(S.char.food, FOOD_CAP_SECONDS), S.char.food > 0 ? `${Math.ceil(S.char.food / 60)}m food` : 'hungry');
    const act = currentActivity();
    activity.textContent = `${act.icon} ${act.text}`;
    gold.textContent = `🪙 ${formatNumber(S.gold)}`;
    soulCount.textContent = `✨ ${formatNumber(S.char.soul ?? 0)}`;
    cap.textContent = `${Math.floor(capacity() - totalWeight())} oz free`;
  });

  // Handed to the level-up listener so the bar can flash when it wraps.
  headerBars = { expBar, hpBar };

  return el('header', { class: 'hdr' }, [
    el('div', { class: 'hdr-left' }, [
      el('div', { class: 'row space' }, [name, level]),
      el('div', { class: 'hdr-bars' }, [hpBar, mpBar, expBar, foodBar]),
    ]),
    el('div', { class: 'hdr-right' }, [activity, el('div', { class: 'row' }, [gold, soulCount]), cap]),
  ]);
}

function buildNav() {
  const nav = el('nav', { class: 'nav' });
  const renderNav = () => {
    nav.replaceChildren(...NAV.map((item) => {
      if (item.group !== undefined) {
        return item.group ? el('div', { class: 'nav-group', text: item.group }) : el('div', { class: 'nav-sep' });
      }
      const busy = S.action
        && ((item.route === 'combat' && S.action.type === 'combat')
          || (item.route === 'quests' && S.action.type === 'quest')
          || (item.route === `skill:${S.action.skill}` && S.action.type === 'idle'));
      return el('button', {
        class: `nav-item${route === item.route ? ' active' : ''}${busy ? ' busy' : ''}`,
        onClick: () => navigate(item.route),
      }, [
        el('span', { class: 'nav-icon', text: item.icon }),
        el('span', { class: 'nav-label', text: item.label }),
        busy ? el('span', { class: 'pulse' }) : null,
      ]);
    }));
  };
  return { nav, renderNav };
}

const LOG_SHOWN = 40;

function logEntry(entry) {
  return el('div', { class: `log-entry ${entry.kind}` }, [
    el('span', { class: 'log-text', text: entry.text }),
    entry.count > 1 ? el('span', { class: 'log-count', text: `×${entry.count}` }) : null,
  ]);
}

function buildLog() {
  const list = el('div', { class: 'log-list' });
  let lastSeq = -1;
  let lastTop = null; // the entry object at S.log[0] as of the last render

  const rebuild = () => {
    list.replaceChildren(...S.log.slice(0, LOG_SHOWN).map(logEntry));
    lastTop = S.log[0] ?? null;
  };

  /**
   * A hunt writes a line every couple of seconds and the log is rebuilt on
   * every write. Rebuilding forty nodes to add one is most of what the shell
   * did between ticks, so add only what is actually new.
   *
   * pushLog either unshifts a new entry or bumps `count` on the existing top
   * one, so the entry object at index 0 tells us which happened.
   */
  const render = () => {
    const top = S.log[0] ?? null;
    if (!top) { rebuild(); return; }

    if (top === lastTop) {
      // Same entry, repeated: refresh its ×N in place.
      const first = list.firstElementChild;
      if (!first) { rebuild(); return; }
      const badge = first.querySelector('.log-count');
      if (top.count > 1 && badge) badge.textContent = `×${top.count}`;
      else if (top.count > 1) first.append(el('span', { class: 'log-count', text: `×${top.count}` }));
      return;
    }

    const added = lastTop ? S.log.indexOf(lastTop) : -1;
    // -1 means the previous top has scrolled off (or this is the first render);
    // anything past the visible window is the same as a full repaint.
    if (added < 0 || added > LOG_SHOWN) { rebuild(); return; }
    list.prepend(...S.log.slice(0, added).map(logEntry));
    while (list.childElementCount > LOG_SHOWN) list.lastElementChild.remove();
    lastTop = top;
  };

  shellUpdates.push(() => {
    // pushLog bumps logSeq on every write. Deriving the key from length instead
    // froze the log at MAX_LOG, where length stops changing.
    if (S.logSeq !== lastSeq) {
      lastSeq = S.logSeq;
      render();
    }
  });
  rebuild();
  return el('aside', { class: 'log' }, [el('h3', { class: 'card-title', text: '📜 Adventure Log' }), list]);
}

function toast(text, kind = 'good') {
  const node = el('div', { class: `toast ${kind}`, text });
  document.querySelector('.toasts')?.append(node);
  setTimeout(() => node.classList.add('out'), 2600);
  setTimeout(() => node.remove(), 3200);
}

export function offlineModal(summary, onClose) {
  if (!summary) return;
  const lines = [
    ['Away for', formatDuration(summary.elapsed)],
    summary.exp ? ['Experience', `+${formatNumber(summary.exp)}`] : null,
    summary.levels ? ['Levels gained', `+${summary.levels} (now ${summary.level})`] : null,
    summary.gold ? ['Gold', `+${formatNumber(summary.gold)}`] : null,
    summary.kills ? ['Kills', formatNumber(summary.kills)] : null,
    summary.actions ? ['Actions completed', formatNumber(summary.actions)] : null,
    summary.items ? ['Items gathered', formatNumber(summary.items)] : null,
    summary.deaths ? ['Deaths', String(summary.deaths)] : null,
  ].filter(Boolean);

  const backdrop = el('div', { class: 'modal-backdrop' });
  const modal = el('div', { class: 'modal' }, [
    el('h2', { text: 'Welcome back' }),
    // "Check the log" is not an answer when the replay's log was suppressed.
    // Say what actually stopped them, and hand over the button that fixes it.
    el('p', { class: summary.stopped ? 'warn small' : 'muted small' }, [
      summary.stopped
        ? (summary.stoppedBecause ?? 'Your character stopped early.')
        : 'Your character kept grinding while you were away.',
    ]),
    el('div', { class: 'derived' }, lines.map(([k, v]) => el('div', { class: 'kv' }, [
      el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v }),
    ]))),
    summary.skillLevels.length
      ? el('div', { class: 'stack tight' }, summary.skillLevels.map((s) => el('div', { class: 'muted small', text: `${SKILLS[s.id].icon} ${SKILLS[s.id].name} ${s.from} → ${s.to}` })))
      : null,
    summary.rare?.length
      ? el('div', { class: 'rare-line', text: `✨ Rare find: ${summary.rare.join(', ')}` })
      : null,
    summary.loot?.length
      ? el('div', { class: 'stack tight' }, [
        el('div', { class: 'muted small', text: summary.lootKinds > summary.loot.length
          ? `Best of ${summary.lootKinds} kinds of loot:`
          : 'Loot:' }),
        el('div', { class: 'row wrap costs' }, summary.loot.map(({ id, qty }) => el('span', {
          class: 'cost', text: `${getItem(id).icon} ${getItem(id).name}${qty > 1 ? ` ×${formatNumber(qty)}` : ''}`,
        }))),
      ])
      : null,
    el('div', { class: 'row wrap' }, [
      button('Continue', () => { backdrop.remove(); onClose?.(); }, { class: 'btn-primary btn-lg' }),
      // The point of telling you it stopped is that you can do something now.
      summary.stopped
        ? button('Go to the Hunt page', () => { backdrop.remove(); onClose?.(); navigate('combat'); }, { class: 'btn-lg' })
        : null,
      summary.stopped
        ? button('Restock', () => { backdrop.remove(); onClose?.(); navigate('shop'); }, { class: 'btn-lg' })
        : null,
    ]),
  ]);
  backdrop.append(modal);
  document.body.append(backdrop);
}

export function mountShell(root) {
  shellUpdates.length = 0;
  const header = buildHeader();
  const { nav, renderNav } = buildNav();
  const main = el('main', { class: 'main' });
  const log = buildLog();

  const layout = el('div', { class: 'layout' }, [
    header,
    el('div', { class: 'body' }, [nav, main, log]),
    el('div', { class: 'toasts' }),
  ]);
  clear(root).append(layout);

  shell = {
    main,
    renderNav,
    update: () => {
      shellUpdates.forEach((fn) => fn());
      active?.update?.();
    },
  };

  on('tick', () => shell.update());
  on('levelup', ({ level }) => {
    toast(`Level ${level}!`, 'level');
    headerBars?.expBar.flash('levelled');
    play('level');
  });
  on('vocation:available', () => vocationModal(() => rerender()));
  on('vocation:chosen', () => { renderNav(); rerender(); });
  on('skillup', ({ skillId, level }) => { toast(`${SKILLS[skillId].name} ${level}`, 'skill'); play('skill'); });
  on('death', () => { toast('You are dead!', 'bad'); play('death'); rerender(); });
  on('action:changed', () => { renderNav(); });

  // These four had publishers and no subscribers at all, which is why finishing
  // a quest, landing a rare drop or completing an hour of runes was invisible
  // unless you happened to be reading the log at that second.
  on('loot:rare', ({ item, chance }) => {
    toast(`${item.icon} ${item.name}!`, 'loot');
    play('loot');
    pushLog(`You found ${item.name} — a ${(chance * 100).toFixed(chance < 0.01 ? 2 : 1)}% drop.`, 'level');
  });
  on('quest:done', ({ quest }) => { toast(`${quest.icon} ${quest.name} complete!`, 'quest'); play('quest'); rerender(); });
  on('idle:complete', ({ rare }) => { if (rare) play('loot'); });
  on('potion', () => play('potion'));
  on('perk:bought', ({ perk, rank }) => { toast(`${perk.icon} ${perk.name} ${rank}`, 'level'); play('level'); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      save();
      return;
    }
    // The engine stops emitting 'tick' while hidden, so everything on screen is
    // as stale as the time away. Catch it all up in one go.
    setSound(soundEnabled()); // also resumes the AudioContext the tab suspended
    shell.update();
  });

  rerender();
  return shell;
}
