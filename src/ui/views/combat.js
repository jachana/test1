import { el, bar, card, button } from '../dom.js';
import { S, pushLog } from '../../core/state.js';
import { AREAS } from '../../data/areas.js';
import { getMonster } from '../../data/monsters.js';
import { SPELLS, canCast, spellsFor } from '../../data/spells.js';
import { ATTACK_MODES } from '../../core/formulas.js';
import { formatNumber } from '../../core/util.js';
import { combatStats, startHunt, stopAction } from '../../systems/combat.js';
import { maxHp, maxMp } from '../../systems/player.js';

export function combatView({ rerender }) {
  const updates = [];

  // ----------------------------------------------------------- arena panel
  const monsterIcon = el('div', { class: 'monster-icon' });
  const monsterName = el('div', { class: 'monster-name' });
  const monsterHp = bar(1, { className: 'hp' });
  const monsterMeta = el('div', { class: 'muted small' });
  const hitPlayer = el('div', { class: 'floater player' });
  const hitMonster = el('div', { class: 'floater monster' });
  const playerHp = bar(1, { className: 'hp' });
  const playerMp = bar(1, { className: 'mana' });
  const swingBar = bar(0, { className: 'swing' });
  const statusLine = el('div', { class: 'status-line' });

  const stopBtn = button('Leave area', () => { stopAction('You return to the temple.'); rerender(); }, { class: 'btn-danger' });

  const arena = card('🗡️ Battle', [
    el('div', { class: 'arena' }, [
      el('div', { class: 'fighter' }, [
        el('div', { class: 'fighter-title', text: 'You' }),
        el('div', { class: 'monster-icon', text: '🧝' }),
        playerHp, playerMp, swingBar, hitPlayer,
      ]),
      el('div', { class: 'versus', text: '⚔️' }),
      el('div', { class: 'fighter' }, [
        monsterName, monsterIcon, monsterHp, monsterMeta, hitMonster,
      ]),
    ]),
    statusLine,
    el('div', { class: 'row' }, [stopBtn]),
  ]);

  updates.push(() => {
    const c = combatStats();
    playerHp.setFill(S.char.hp / maxHp(), `${Math.ceil(S.char.hp)} / ${maxHp()} hp`);
    playerMp.setFill(S.char.mana / maxMp(), `${Math.floor(S.char.mana)} / ${maxMp()} mana`);

    if (!S.combat) {
      monsterName.textContent = 'No target';
      monsterIcon.textContent = '—';
      monsterHp.setFill(0, '');
      monsterMeta.textContent = 'Pick a hunting ground below to start grinding.';
      swingBar.setFill(0, '');
      hitPlayer.textContent = '';
      hitMonster.textContent = '';
      statusLine.textContent = '';
      stopBtn.style.display = 'none';
      return;
    }
    stopBtn.style.display = '';
    const m = getMonster(S.combat.monsterId);
    monsterName.textContent = m.name;
    monsterIcon.textContent = m.icon;
    if (S.combat.respawn > 0) {
      monsterHp.setFill(0, 'dead');
      monsterMeta.textContent = `Next ${m.name.toLowerCase()} in ${(S.combat.respawn / 1000).toFixed(1)}s`;
    } else {
      monsterHp.setFill(S.combat.hp / S.combat.maxHp, `${Math.max(0, Math.ceil(S.combat.hp))} / ${S.combat.maxHp} hp`);
      monsterMeta.textContent = `${formatNumber(m.exp)} exp · hits ${m.min}-${m.max} · armor ${m.arm}`;
    }
    swingBar.setFill(S.combat.playerTimer / c.attackSpeed, 'attack');

    const ph = S.combat.lastPlayerHit;
    hitMonster.textContent = ph ? (ph.miss ? 'miss' : `-${ph.amount}${ph.spell ? ` ${ph.spell}` : ''}`) : '';
    const mh = S.combat.lastMonsterHit;
    hitPlayer.textContent = mh ? (mh.blocked ? 'blocked' : `-${mh.amount}`) : '';
    statusLine.textContent = `Max hit ${c.maxHit} · armor ${c.armour} · defence ${c.defence} · total kills ${formatNumber(Object.values(S.stats.kills).reduce((a, b) => a + b, 0))}`;
  });

  // ------------------------------------------------------------ stance/spells
  const stance = el('div', { class: 'row wrap' }, Object.values(ATTACK_MODES).map((mode) => {
    const b = button(mode.name, () => {
      S.settings.attackMode = mode.id;
      [...stance.children].forEach((c) => c.classList.toggle('active', c.dataset.mode === S.settings.attackMode));
    }, { class: S.settings.attackMode === mode.id ? 'active' : '', dataset: { mode: mode.id } });
    return b;
  }));

  const castable = spellsFor(S.char.vocation)
    .filter((s) => canCast(s, S.char.level, S.skills.magic.level, S.char.vocation));
  const spellSelect = (kind, setting) => {
    const options = castable.filter((s) => s.kind === kind);
    const select = el('select', { class: 'input' }, [
      el('option', { value: '', text: '— none —' }),
      ...options.map((s) => el('option', {
        value: s.id, text: `${s.name} ("${s.words}", ${s.mana} mana)`,
        selected: S.settings[setting] === s.id,
      })),
    ]);
    select.addEventListener('change', () => {
      S.settings[setting] = select.value || null;
      pushLog(select.value ? `Auto-cast set to ${SPELLS[select.value].name}.` : 'Auto-cast cleared.', 'info');
    });
    return el('label', { class: 'field' }, [kind === 'heal' ? 'Auto-heal spell' : 'Auto-attack spell', select]);
  };

  const tactics = card('🎯 Tactics', [
    el('div', { class: 'muted small', text: 'Full Attack hits harder but you block far less — classic Tibia trade-off.' }),
    stance,
    castable.length
      ? el('div', { class: 'grid-2 tight' }, [spellSelect('heal', 'healSpell'), spellSelect('attack', 'attackSpell')])
      : el('div', { class: 'muted small', text: 'No spells available yet. Level up and raise your magic level.' }),
  ]);

  // ------------------------------------------------------------------ areas
  const areaGrid = el('div', { class: 'area-grid' }, AREAS.map((area) => {
    const locked = S.char.level < area.req;
    const active = S.action?.type === 'combat' && S.action.areaId === area.id;
    const spawnNames = area.spawns.map(([id]) => getMonster(id).icon).join(' ');
    return el('button', {
      class: `area-card${active ? ' active' : ''}${locked ? ' risky' : ''}`,
      onClick: () => {
        if (locked) pushLog(`${area.name} is meant for level ${area.req}+. Good luck.`, 'bad');
        startHunt(area.id);
        rerender();
      },
    }, [
      el('div', { class: 'row space' }, [
        el('span', { class: 'area-name', text: `${area.icon} ${area.name}` }),
        el('span', { class: 'tag', text: `lvl ${area.req}+` }),
      ]),
      el('p', { class: 'muted small', text: area.blurb }),
      el('div', { class: 'spawn-row', text: spawnNames }),
      active ? el('div', { class: 'badge', text: 'hunting' }) : null,
    ]);
  }));

  const node = el('div', { class: 'stack' }, [arena, tactics, card('🗺️ Hunting Grounds', areaGrid)]);
  const update = () => updates.forEach((fn) => fn());
  update();
  return { node, update };
}
