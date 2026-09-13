import { el, bar, card, button } from '../dom.js';
import { on } from '../../core/bus.js';
import { S, pushLog } from '../../core/state.js';
import { AREAS } from '../../data/areas.js';
import { getMonster } from '../../data/monsters.js';
import { SPELLS, canCast, spellsFor } from '../../data/spells.js';
import { ATTACK_MODES } from '../../core/formulas.js';
import { formatNumber, ratio } from '../../core/util.js';
import { combatStats, startHunt, stopAction, travelProblem } from '../../systems/combat.js';
import { areaEstimate } from '../../systems/guide.js';
import { maxHp, maxMp } from '../../systems/player.js';
import { play } from '../sound.js';

export function combatView({ rerender }) {
  const updates = [];
  // Every subscription this view makes, so navigating away takes them with it.
  const offCombat = [];

  // ----------------------------------------------------------- arena panel
  const monsterIcon = el('div', { class: 'monster-icon' });
  const monsterName = el('div', { class: 'monster-name' });
  const monsterHp = bar(1, { className: 'hp' });
  const monsterMeta = el('div', { class: 'muted small' });
  // One element per blow, animated and then removed, rather than one node whose
  // text is overwritten on every tick — which is why a fight used to look like
  // a single number flickering rather than damage happening.
  const playerFloaters = el('div', { class: 'floaters' });
  const monsterFloaters = el('div', { class: 'floaters' });
  const MAX_FLOATERS = 6;

  function floatText(host, text, kind) {
    // A backgrounded tab replays hours in one step; without this cap it would
    // try to animate every blow of it at once.
    while (host.childElementCount >= MAX_FLOATERS) host.firstElementChild.remove();
    const node = el('div', { class: `floater ${kind}`, text });
    // Nudge each one sideways so simultaneous hits do not stack exactly.
    node.style.left = `${42 + Math.random() * 16}%`;
    node.addEventListener('animationend', () => node.remove());
    host.append(node);
  }
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
        playerHp, playerMp, swingBar, playerFloaters,
      ]),
      el('div', { class: 'versus', text: '⚔️' }),
      el('div', { class: 'fighter' }, [
        monsterName, monsterIcon, monsterHp, monsterMeta, monsterFloaters,
      ]),
    ]),
    statusLine,
    el('div', { class: 'row' }, [stopBtn]),
  ]);

  // Live combat events, straight off the bus. These were being emitted into
  // nothing: combat:hit, combat:spell, combat:kill and combat:spawn all had
  // publishers and no subscribers, so the fight only ever showed up as text.
  const CRIT_SHARE = 0.35; // a blow taking this much of a bar reads as a big one
  offCombat.push(on('combat:hit', ({ source, damage, miss, blocked }) => {
    if (source === 'player') {
      if (miss) { floatText(monsterFloaters, 'miss', 'monster miss'); play('miss'); return; }
      const big = S.combat && damage >= S.combat.maxHp * CRIT_SHARE;
      floatText(monsterFloaters, `-${damage}`, `monster${big ? ' crit' : ''}`);
      play('hit');
    } else {
      if (blocked) { floatText(playerFloaters, 'blocked', 'player blocked'); return; }
      floatText(playerFloaters, `-${damage}`, `player${damage >= maxHp() * CRIT_SHARE ? ' crit' : ''}`);
      play('hurt');
    }
  }));
  offCombat.push(on('combat:spell', ({ amount, kind, spell }) => {
    if (kind === 'heal') floatText(playerFloaters, `+${amount}`, 'player heal');
    else floatText(monsterFloaters, `-${amount} ${spell.name}`, 'monster spell');
    play('spell');
  }));
  offCombat.push(on('combat:kill', () => play('kill')));

  updates.push(() => {
    const c = combatStats();
    const hpShare = ratio(S.char.hp, maxHp());
    playerHp.setFill(hpShare, `${Math.ceil(S.char.hp)} / ${maxHp()} hp`);
    playerHp.setCritical(hpShare < 0.3);
    playerMp.setFill(ratio(S.char.mana, maxMp()), `${Math.floor(S.char.mana)} / ${maxMp()} mana`);

    if (!S.combat) {
      monsterName.textContent = 'No target';
      monsterIcon.textContent = '—';
      monsterHp.setFill(0, '');
      monsterMeta.textContent = 'Pick a hunting ground below to start grinding.';
      swingBar.setFill(0, '');
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
      : el('div', { class: 'muted small', text: S.char.vocation === 'none'
        ? 'Citizens cannot cast. Choose a vocation at level 8 to learn spells.'
        : 'No spells available yet. Level up and raise your magic level.' }),
  ]);

  // ------------------------------------------------------------------ areas
  const areaGrid = el('div', { class: 'area-grid' }, AREAS.map((area) => {
    const underLevelled = S.char.level < area.req;
    const blocked = travelProblem(area);
    const active = S.action?.type === 'combat' && S.action.areaId === area.id;
    const spawnNames = area.spawns.map(([id]) => getMonster(id).icon).join(' ');
    return el('button', {
      class: `area-card${active ? ' active' : ''}${underLevelled && !blocked ? ' risky' : ''}${blocked ? ' locked' : ''}`,
      onClick: () => {
        if (!blocked && underLevelled) pushLog(`${area.name} is meant for level ${area.req}+. Good luck.`, 'bad');
        startHunt(area.id);
        rerender();
      },
    }, [
      el('div', { class: 'row space' }, [
        el('span', { class: 'area-name', text: `${area.icon} ${area.name}` }),
        el('span', { class: 'tag', text: area.rookgaard ? `Rookgaard · lvl ${area.req}+` : `lvl ${area.req}+` }),
      ]),
      el('p', { class: 'muted small', text: area.blurb }),
      el('div', { class: 'spawn-row', text: spawnNames }),
      blocked ? null : (() => {
        const e = areaEstimate(area);
        return el('div', { class: 'row space guide-line' }, [
          el('span', { class: 'small', text: `${formatNumber(e.expPerHour)} exp/h · ${formatNumber(e.goldPerHour)} gp/h` }),
          el('span', { class: `verdict ${e.verdict.id}`, text: e.verdict.label }),
        ]);
      })(),
      blocked ? el('div', { class: 'warn small', text: `🔒 ${blocked}` }) : null,
      active ? el('div', { class: 'badge', text: 'hunting' }) : null,
    ]);
  }));

  // ------------------------------------------------------------- the guide
  const guideBody = el('div', { class: 'stack tight' });
  const guide = card('📖 Hunting Guide', guideBody);

  /**
   * Everything the guide's numbers are computed from.
   *
   * The panel is thirty-odd elements and none of it changes between two blows
   * of the same fight, but it was rebuilt on every 100ms tick — nearly four
   * hundred elements a second for a table that moves when you level up or
   * change your gear. Rebuild it when one of those actually happens.
   */
  const guideSignature = (area) => [
    area?.id,
    S.char.level,
    S.settings.attackMode,
    S.settings.attackSpell,
    Object.values(S.equipment).join(','),
    Object.values(S.skills).map((s) => s.level).join(','),
  ].join('|');

  let lastGuideSig = null;
  updates.push(() => {
    const area = S.action?.type === 'combat' ? AREAS.find((a) => a.id === S.action.areaId) : null;
    if (!area) {
      guide.style.display = 'none';
      lastGuideSig = null;
      return;
    }
    guide.style.display = '';
    const sig = guideSignature(area);
    if (sig === lastGuideSig) return;
    lastGuideSig = sig;
    const e = areaEstimate(area);
    const rows = e.parts
      .slice()
      .sort((a, b) => b.expPerHour - a.expPerHour)
      .map((p) => el('div', { class: 'guide-row' }, [
        el('span', { class: 'guide-cell name', text: `${p.monster.icon} ${p.monster.name}` }),
        el('span', { class: 'guide-cell', text: `${formatNumber(p.monster.hp)} hp` }),
        el('span', { class: 'guide-cell', text: `${p.ttk < 1 ? p.ttk.toFixed(1) : Math.round(p.ttk)}s to kill` }),
        el('span', { class: 'guide-cell', text: `${formatNumber(p.expPerHour)} exp/h` }),
        el('span', { class: 'guide-cell', text: `-${Math.round(p.damagePerKill)} hp` }),
      ]));

    // replaceChildren() stringifies null, so filter before handing it over.
    guideBody.replaceChildren(...[
      el('div', { class: 'row space' }, [
        el('span', { class: 'area-name', text: `${area.icon} ${area.name}` }),
        el('span', { class: `verdict ${e.verdict.id}`, text: e.verdict.label }),
      ]),
      el('div', { class: 'derived' }, [
        ['Experience', `${formatNumber(e.expPerHour)} / hour`],
        ['Gold + loot', `${formatNumber(e.goldPerHour)} / hour`],
        ['Taking', `${e.incoming.toFixed(1)} damage / second`],
        ['Supplies', e.potionsPerHour < 1
          ? 'Food and resting cover it'
          : `${Math.ceil(e.potionsPerHour)} × ${e.potion.name} / hour (${formatNumber(e.potionGoldPerHour)} gp)`],
        ['Net gold', `${formatNumber(e.netGoldPerHour)} / hour after supplies`],
      ].map(([k, v]) => el('div', { class: 'kv' }, [
        el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v }),
      ]))),
      el('div', { class: 'muted small', text: e.verdict.note }),
      el('div', { class: 'guide-table' }, rows),
      e.notableDrops.length
        ? el('div', { class: 'stack tight' }, [
          el('div', { class: 'muted small', text: 'Worth walking here for:' }),
          el('div', { class: 'row wrap costs' }, e.notableDrops.map((d) => el('span', {
            class: 'cost', title: `${d.from} · ${(d.chance * 100).toFixed(d.chance < 0.01 ? 2 : 1)}%`,
            text: `${d.item.icon} ${d.item.name} ${(d.chance * 100).toFixed(d.chance < 0.01 ? 2 : 1)}%`,
          }))),
        ])
        : null,
    ].filter(Boolean));
  });

  const node = el('div', { class: 'stack' }, [arena, guide, tactics, card('🗺️ Hunting Grounds', areaGrid)]);
  const update = () => updates.forEach((fn) => fn());
  update();
  return { node, update, dispose: () => offCombat.forEach((off) => off()) };
}
