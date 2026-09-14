// The big screen. Read-only except for one key: space moves the evening along.
//
// Everything here is driven by the state frames the server pushes, so the host
// screen has no game logic in it at all — which means you can refresh it
// mid-round, or plug in a different laptop, without losing the game.
const root = document.getElementById('host');

let state = null;
let joinUrl = `${location.origin}`;

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
};

const fmt = (n) => Number(n).toLocaleString('en-US');

/**
 * The real 32x32 sprite where we have one, the emoji where we do not.
 *
 * Sprites are scaled with `transform` inside a fixed box rather than by
 * resizing the atlas, because the atlas is addressed by whole-pixel offsets:
 * shrink the image and every offset in sprites.css points at the wrong tile.
 */
function glyph(item, size) {
  if (!item.sprite) return el('div', { class: `glyph glyph-${size}`, text: item.icon });
  return el('div', { class: `spr-box ${size}` }, [
    el('div', { class: `sprite spr-${item.id}`, title: item.name }),
  ]);
}

// --------------------------------------------------------------- the screens

function lobby() {
  return [
    el('div', { class: 'host-main' }, [
      el('div', { class: 'big-prompt', text: 'Everybody in' }),
      el('div', { class: 'host-sub', style: 'text-align:center;font-size:22px' },
        `Open ${joinUrl} on your phone`),
      el('div', { class: 'lobby-players' }, state.players.length
        ? state.players.map((p) => el('div', { class: 'lobby-player', text: p.name }))
        : [el('div', { class: 'muted', style: 'font-size:22px', text: 'waiting…' })]),
      el('div', { class: 'host-sub', style: 'text-align:center' },
        state.players.length
          ? `${state.players.length} in the room — press SPACE to start`
          : ''),
    ]),
  ];
}

function timerBar() {
  if (!state.endsAt) return null;
  const total = (state.round?.seconds ?? 20) * 1000;
  const left = Math.max(0, state.endsAt - Date.now());
  const share = left / total;
  const fill = el('div', { class: `timer-fill${share < 0.25 ? ' low' : ''}` });
  fill.style.width = `${share * 100}%`;
  return el('div', { class: 'timer' }, [fill]);
}

function waitingChips() {
  return el('div', { class: 'waiting' }, state.players
    .filter((p) => p.connected)
    .map((p) => el('div', {
      class: `waiting-chip${state.answered.includes(p.id) ? ' in' : ''}`,
      text: p.name,
    })));
}

function asking() {
  const q = state.question;
  const body = [el('div', { class: 'big-prompt', text: q.prompt })];

  if (q.kind === 'price') {
    body.push(el('div', { class: 'hero-item' }, [
      glyph(q.item, 'big'),
      el('div', { class: 'hero-name', text: q.item.name }),
    ]));
  } else if (q.kind === 'loot') {
    body.push(el('div', { class: 'options' }, q.options.map((o, i) => el('div', { class: 'option' }, [
      el('div', { class: 'key', text: String(i + 1) }),
      glyph(o, 'mid'),
      el('div', { class: 'label', text: o.name }),
    ]))));
  } else if (q.kind === 'sprite') {
    // The name is the answer, so the picture is all the room gets.
    body.push(el('div', { class: 'hero-item' }, [glyph(q.item, 'big')]));
    body.push(el('div', { class: 'options names' }, q.options.map((o, i) => el('div', { class: 'option' }, [
      el('div', { class: 'key', text: String(i + 1) }),
      el('div', { class: 'label', text: o.name }),
    ]))));
  }

  return [
    el('div', { class: 'host-main' }, [...body, waitingChips()]),
    timerBar(),
  ];
}

function revealPrice() {
  const r = state.result;
  const byId = Object.fromEntries(state.players.map((p) => [p.id, p]));
  return [
    el('div', { class: 'host-main' }, [
      el('div', { class: 'hero-item' }, [
        glyph(state.question.item, 'big'),
        el('div', { class: 'hero-name', text: state.question.item.name }),
      ]),
      el('div', { class: 'answer-big', text: `${fmt(r.answer)} gold` }),
      el('div', { class: 'guesses' }, r.guesses.map((g, i) => el('div', {
        class: `guess-row${i === 0 ? ' best' : ''}`,
      }, [
        el('span', { class: 'who', text: byId[g.id]?.name ?? '—' }),
        el('span', { class: 'val', text: fmt(g.guess) }),
        el('span', { class: 'gain', text: `+${fmt(byId[g.id]?.lastGain ?? 0)}` }),
      ]))),
    ]),
  ];
}

/** Loot and Name That Sprite reveal the same way: four options, one right. */
function revealChoices() {
  const q = state.question;
  const isSprite = q.kind === 'sprite';
  const pickedBy = (index) => state.players
    .filter((p) => state.result.picks[p.id] === index)
    .map((p) => p.name)
    .join(', ');

  return [
    el('div', { class: 'host-main' }, [
      isSprite
        ? el('div', { class: 'hero-item' }, [glyph(q.item, 'big')])
        : el('div', { class: 'big-prompt', text: `${q.monster.icon} ${q.monster.name} never drops…` }),
      el('div', { class: `options${isSprite ? ' names' : ''}` }, q.options.map((o, i) => el('div', {
        class: `option ${i === state.result.answer ? 'right' : 'wrong'}`,
      }, [
        isSprite ? null : glyph(o, 'mid'),
        el('div', { class: 'label', text: o.name }),
        el('div', { class: 'key', text: pickedBy(i) || '—' }),
      ].filter(Boolean)))),
      el('div', { class: 'guesses' }, state.players
        .filter((p) => p.lastGain > 0)
        .map((p) => el('div', { class: 'guess-row' }, [
          el('span', { class: 'who', text: p.name }),
          el('span', { class: 'val', text: 'correct' }),
          el('span', { class: 'gain', text: `+${fmt(p.lastGain)}` }),
        ]))),
    ]),
  ];
}

function board(title) {
  return [
    el('div', { class: 'host-main' }, [
      el('div', { class: 'big-prompt', text: title }),
      el('div', { class: 'board' }, state.players.map((p, i) => el('div', {
        class: `board-row${i === 0 ? ' lead' : ''}${p.connected ? '' : ' out'}`,
      }, [
        el('span', { class: 'rank', text: `${i + 1}.` }),
        el('span', { class: 'name', text: p.name }),
        el('span', { class: 'gain', text: p.lastGain ? `+${fmt(p.lastGain)}` : '' }),
        el('span', { class: 'score', text: fmt(p.score) }),
      ]))),
    ]),
  ];
}

// ------------------------------------------------------------------- render

function render() {
  if (!state) return;
  const round = state.round;
  const progress = state.phase === 'lobby' || state.phase === 'finished'
    ? ''
    : `${round?.icon ?? ''} ${round?.name ?? ''} · question ${state.questionIndex + 1} of ${state.perRound}`;

  let main;
  if (state.phase === 'lobby') main = lobby();
  else if (state.phase === 'asking') main = asking();
  else if (state.phase === 'reveal') {
    main = state.result?.kind === 'price' ? revealPrice() : revealChoices();
  } else if (state.phase === 'standings') main = board('Standings');
  else {
    main = board('🏆 Final');
    main.push(el('div', { class: 'host-sub', style: 'text-align:center;font-size:20px',
      text: 'Press R to play again.' }));
  }

  root.replaceChildren(
    el('div', { class: 'host-top' }, [
      el('div', {}, [
        el('div', { class: 'host-title', text: '⚔️ Tibia LAN Party' }),
        el('div', { class: 'round-badge', text: progress }),
      ]),
      el('div', { style: 'text-align:right' }, [
        el('div', { class: 'host-sub', text: 'join on your phone' }),
        el('div', { class: 'host-join', text: joinUrl.replace(/^https?:\/\//, '') }),
      ]),
    ]),
    ...main.filter(Boolean),
    el('div', { class: 'host-foot' }, [
      el('div', { class: 'keys' }, [
        el('kbd', { text: 'space' }), ' next   ',
        el('kbd', { text: 'S' }), ' standings   ',
        el('kbd', { text: 'R' }), ' reset',
      ]),
      el('div', { text: `${state.players.length} playing` }),
    ]),
  );
}

// The timer bar has to move between server frames, which only arrive on change.
setInterval(() => {
  if (state?.phase === 'asking') {
    const bar = root.querySelector('.timer-fill');
    if (!bar) return;
    const total = (state.round?.seconds ?? 20) * 1000;
    const share = Math.max(0, (state.endsAt - Date.now()) / total);
    bar.style.width = `${share * 100}%`;
    bar.classList.toggle('low', share < 0.25);
  }
}, 200);

// --------------------------------------------------------------- the one key

const post = (action, body = {}) => fetch(`/api/${action}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

document.addEventListener('keydown', (event) => {
  if (event.target.tagName === 'INPUT') return;
  const key = event.key.toLowerCase();
  if (event.code === 'Space' || key === 'enter') {
    event.preventDefault();
    post(state?.phase === 'lobby' ? 'start' : 'next');
  } else if (key === 's') {
    post('standings');
  } else if (key === 'r') {
    if (window.confirm('Reset the whole game? Scores are lost.')) post('reset');
  }
});

// ------------------------------------------------------------------- stream

const events = new EventSource('/events');
events.onmessage = (event) => {
  state = JSON.parse(event.data);
  render();
};
events.onerror = () => {
  const badge = root.querySelector('.host-title');
  if (badge) badge.textContent = '⚔️ Tibia LAN Party — reconnecting…';
};
