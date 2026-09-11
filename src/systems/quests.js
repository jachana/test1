import { S, pushLog } from '../core/state.js';
import { getQuest, QUESTS } from '../data/quests.js';
import { getItem } from '../data/items.js';
import { emit } from '../core/bus.js';
import { addGold, addItem } from './inventory.js';
import { autoEat, autoPotion, death, gainExp } from './player.js';

export function isDone(questId) {
  return !!S.quests?.done?.includes(questId);
}

export function questProblem(quest) {
  if (isDone(quest.id)) return 'Already completed.';
  if (S.char.level < quest.req) return `Requires level ${quest.req}.`;
  const missing = (quest.needs ?? []).filter((id) => !isDone(id));
  if (missing.length) {
    return `First finish ${missing.map((id) => getQuest(id)?.name ?? id).join(', ')}.`;
  }
  if (quest.choice && !S.quests.choice?.[quest.id]) return 'Choose your reward first.';
  return null;
}

export function chooseReward(questId, itemId) {
  const quest = getQuest(questId);
  if (!quest?.choice?.includes(itemId)) return false;
  S.quests.choice = { ...S.quests.choice, [questId]: itemId };
  return true;
}

export function startQuest(questId) {
  const quest = getQuest(questId);
  if (!quest) return false;
  const problem = questProblem(quest);
  if (problem) {
    pushLog(problem, 'bad');
    return false;
  }
  S.action = { type: 'quest', questId, progress: 0 };
  S.combat = null;
  pushLog(`You set out on ${quest.name}.`, 'info');
  emit('action:changed');
  return true;
}

function complete(quest) {
  gainExp(quest.exp);
  if (quest.gold) addGold(quest.gold);

  const granted = [];
  const give = (itemId, qty) => {
    // Quest chests never bounce off your capacity; you carry it out somehow.
    addItem(itemId, qty, { force: true });
    granted.push(qty > 1 ? `${qty}x ${getItem(itemId).name}` : getItem(itemId).name);
  };
  for (const [itemId, qty] of quest.rewards ?? []) give(itemId, qty);
  const chosen = S.quests.choice?.[quest.id];
  if (chosen) give(chosen, 1);

  S.quests.done.push(quest.id);
  if (quest.unlocks) pushLog(`New hunting ground unlocked: ${quest.unlocks.replace(/_/g, ' ')}.`, 'level');
  if (quest.unlocksShop) pushLog('A new trader will deal with you now.', 'level');
  pushLog(`${quest.name} complete! Chest: ${granted.join(', ')} and ${quest.gold.toLocaleString('en-US')} gold.`, 'level');

  S.action = null;
  emit('quest:done', quest);
  emit('action:changed');
}

export function tickQuest(dt) {
  const quest = getQuest(S.action.questId);
  if (!quest) {
    S.action = null;
    return;
  }

  // The trip in costs health the whole way; supplies are what get you through.
  autoPotion();
  autoEat();
  S.char.hp -= quest.dps * (dt / 1000);
  if (S.char.hp <= 0) {
    const name = quest.name;
    death();
    pushLog(`You did not survive ${name}. The chest is still there.`, 'death');
    return;
  }

  S.action.progress += dt;
  if (S.action.progress >= quest.ms) complete(quest);
}

/** Progress summary for the UI. */
export function questStatus() {
  const done = S.quests?.done ?? [];
  return {
    done: done.length,
    total: QUESTS.length,
    available: QUESTS.filter((q) => !isDone(q.id) && !questProblem(q)).length,
  };
}
