import { el, bar, button, clear } from './dom.js';
import { on } from '../core/bus.js';
import { S, save } from '../core/state.js';
import { SKILLS } from '../data/skills.js';
import { ACTIONS, getAction } from '../data/actions.js';
import { AREAS } from '../data/areas.js';
import { getMonster } from '../data/monsters.js';
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
import { getQuest } from '../data/quests.js';
import { vocationModal } from './views/vocation.js';
import { canChooseVocation, VOCATIONS } from '../data/vocations.js';

const NAV = [
  { route: 'character', label: 'Character', icon: '🧝' },
  { route: 'combat', label: 'Hunt', icon: '⚔️' },
  { route: 'quests', label: 'Quests', icon: '📜' },
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
const shellUpdates = [];

function buildView(ctx) {
  if (route.startsWith('skill:')) return skillView(route.slice(6), ctx);
  switch (route) {
    case 'character': return characterView(ctx);
    case 'inventory': return inventoryView_(ctx);
    case 'shop': return shopView(ctx);
    case 'settings': return settingsView(ctx);
    case 'quests': return questsView(ctx);
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
  const cap = el('div', { class: 'muted small' });

  shellUpdates.push(() => {
    const p = expProgress(S.char.exp);
    name.textContent = S.char.name;
    level.textContent = `Level ${p.level} ${VOCATIONS[S.char.vocation].name}`;
    expBar.setFill(p.ratio, `${Math.floor(p.ratio * 100)}% to ${p.level + 1}`);
    hpBar.setFill(ratio(S.char.hp, maxHp()), `${Math.ceil(S.char.hp)} hp`);
    mpBar.setFill(ratio(S.char.mana, maxMp()), `${Math.floor(S.char.mana)} mana`);
    foodBar.setFill(ratio(S.char.food, FOOD_CAP_SECONDS), S.char.food > 0 ? `${Math.ceil(S.char.food / 60)}m food` : 'hungry');
    const act = currentActivity();
    activity.textContent = `${act.icon} ${act.text}`;
    gold.textContent = `🪙 ${formatNumber(S.gold)}`;
    cap.textContent = `${Math.floor(capacity() - totalWeight())} oz free`;
  });

  return el('header', { class: 'hdr' }, [
    el('div', { class: 'hdr-left' }, [
      el('div', { class: 'row space' }, [name, level]),
      el('div', { class: 'hdr-bars' }, [hpBar, mpBar, expBar, foodBar]),
    ]),
    el('div', { class: 'hdr-right' }, [activity, gold, cap]),
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

function buildLog() {
  const list = el('div', { class: 'log-list' });
  let lastCount = -1;
  const render = () => {
    list.replaceChildren(...S.log.slice(0, 40).map((entry) => el('div', { class: `log-entry ${entry.kind}` }, [
      el('span', { class: 'log-text', text: entry.text }),
      entry.count > 1 ? el('span', { class: 'log-count', text: `×${entry.count}` }) : null,
    ])));
  };
  shellUpdates.push(() => {
    const sig = S.log.length * 1000 + (S.log[0]?.count ?? 0);
    if (sig !== lastCount) {
      lastCount = sig;
      render();
    }
  });
  render();
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
    el('p', { class: 'muted small', text: summary.stopped ? 'Your character stopped early — check the log.' : 'Your character kept grinding while you were away.' }),
    el('div', { class: 'derived' }, lines.map(([k, v]) => el('div', { class: 'kv' }, [
      el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v }),
    ]))),
    summary.skillLevels.length
      ? el('div', { class: 'stack tight' }, summary.skillLevels.map((s) => el('div', { class: 'muted small', text: `${SKILLS[s.id].icon} ${SKILLS[s.id].name} ${s.from} → ${s.to}` })))
      : null,
    button('Continue', () => { backdrop.remove(); onClose?.(); }, { class: 'btn-primary btn-lg' }),
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
  on('levelup', ({ level }) => toast(`Level ${level}!`, 'level'));
  on('vocation:available', () => vocationModal(() => rerender()));
  on('vocation:chosen', () => { renderNav(); rerender(); });
  on('skillup', ({ skillId, level }) => toast(`${SKILLS[skillId].name} ${level}`, 'skill'));
  on('death', () => { toast('You are dead!', 'bad'); rerender(); });
  on('action:changed', () => { renderNav(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  rerender();
  return shell;
}
