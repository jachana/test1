import { S, pushLog } from '../core/state.js';
import { getAction } from '../data/actions.js';
import { SKILLS } from '../data/skills.js';
import { getItem } from '../data/items.js';
import { randInt, roll } from '../core/util.js';
import { emit } from '../core/bus.js';
import { addItem, consumeInputs, freeCapacity, hasInputs } from './inventory.js';
import { gainSkill, skillLevel, spendMana } from './player.js';

/** Higher skill makes an action faster, up to 30%. */
export function actionDuration(skillId, action) {
  const over = Math.max(0, skillLevel(skillId) - action.req);
  return Math.max(400, Math.round(action.ms * (1 - Math.min(0.3, over * 0.004))));
}

export function requirementProblem(skillId, action) {
  if (skillLevel(skillId) < action.req) {
    return `Requires ${SKILLS[skillId].name} level ${action.req}.`;
  }
  if (action.mana && S.char.vocation === 'none') {
    return 'Rune making requires a vocation — reach level 8 and choose one.';
  }
  if (action.reqMagic && S.skills.magic.level < action.reqMagic) {
    return `Requires magic level ${action.reqMagic}.`;
  }
  if (action.inputs && !hasInputs(action.inputs)) {
    const missing = action.inputs
      .filter((i) => !hasInputs([i]))
      .map((i) => `${i.qty}x ${getItem(i.item).name}`);
    return `Missing ${missing.join(', ')}.`;
  }
  if (freeCapacity() * 10 < outputWeight(action)) {
    return 'Your backpack is full — sell or drop something.';
  }
  return null;
}

/** Weight of the guaranteed part of an action's yield, net of its inputs. */
function outputWeight(action) {
  const out = action.out
    .filter((o) => o.chance >= 1)
    .reduce((sum, o) => sum + getItem(o.item).wt * o.lo, 0);
  const freed = (action.inputs ?? []).reduce((sum, i) => sum + getItem(i.item).wt * i.qty, 0);
  return Math.max(0, out - freed);
}

export function startIdle(skillId, actionId) {
  const action = getAction(skillId, actionId);
  if (!action) return false;
  const problem = requirementProblem(skillId, action);
  if (problem) {
    pushLog(problem, 'bad');
    return false;
  }
  S.action = { type: 'idle', skill: skillId, actionId, progress: 0 };
  S.combat = null;
  pushLog(`You start ${action.name.toLowerCase()}.`, 'info');
  emit('action:changed');
  return true;
}

function complete(skillId, action) {
  if (action.inputs && !consumeInputs(action.inputs)) return false;
  if (action.mana && !spendMana(action.mana)) return false;

  let produced = 0;
  for (const o of action.out) {
    if (!roll(o.chance)) continue;
    const qty = randInt(o.lo, o.hi);
    const added = addItem(o.item, qty);
    if (added < qty) {
      pushLog('Your backpack is too heavy — some of the haul was left behind.', 'bad');
    }
    produced += added;
  }
  S.stats.actionsDone += 1;
  S.stats.itemsGathered += produced;
  gainSkill(skillId, action.tries);
  emit('idle:complete', { skillId, action, produced });
  return true;
}

export function tickIdle(dt) {
  const { skill: skillId, actionId } = S.action;
  const action = getAction(skillId, actionId);
  if (!action) {
    S.action = null;
    return;
  }

  S.action.progress += dt;
  const duration = actionDuration(skillId, action);
  let guard = 0;
  while (S.action && S.action.progress >= duration && guard++ < 10000) {
    S.action.progress -= duration;
    const problem = requirementProblem(skillId, action);
    if (problem) {
      pushLog(`${problem} You stop ${action.name.toLowerCase()}.`, 'bad');
      S.action = null;
      emit('action:changed');
      return;
    }
    if (!complete(skillId, action)) {
      S.action = null;
      emit('action:changed');
      return;
    }
  }
}
