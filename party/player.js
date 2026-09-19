// The phone. One thing to do at a time, and everything tappable is thumb-sized.
//
// The player id is kept in localStorage, so a phone that locks its screen, runs
// out of battery, or gets handed to somebody else to hold comes back into the
// same seat with the same score rather than joining as a stranger.
const root = document.getElementById('player');
const KEY = 'tibia-party:id';

let state = null;
let me = null;
let notice = '';

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
};

const fmt = (n) => Number(n).toLocaleString('en-US');

const post = async (action, body) => {
  const res = await fetch(`/api/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

/** The real sprite where we have one, the emoji where we do not. See host.js
 *  for why sprites are scaled with `transform` rather than `background-size`. */
function glyph(item, size) {
  if (!item.sprite) return el('span', { class: `glyph glyph-${size}`, text: item.icon });
  return el('span', { class: `spr-box ${size}` }, [
    el('span', { class: `sprite spr-${item.id}`, title: item.name }),
  ]);
}

/** A short buzz on submit, where the phone allows it. */
const buzz = (ms = 15) => { try { navigator.vibrate?.(ms); } catch { /* not allowed */ } };

// --------------------------------------------------------------------- join

function joinScreen() {
  const input = el('input', {
    class: 'input', placeholder: 'your name', maxlength: '16',
    autocapitalize: 'off', autocomplete: 'off',
  });
  const go = async () => {
    const result = await post('join', { name: input.value });
    if (result.error) { notice = result.error; render(); return; }
    me = result.player;
    localStorage.setItem(KEY, me.id);
    notice = '';
    connect();
    render();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  return [
    el('h1', { style: 'font-size:26px;margin-bottom:4px', text: '⚔️ Tibia LAN Party' }),
    el('div', { class: 'muted', text: 'Pick a name. Use the one they know you by.' }),
    input,
    el('button', { class: 'btn btn-primary', style: 'width:100%', onClick: go, text: 'Join' }),
    el('div', { class: 'notice', text: notice }),
  ];
}

// ------------------------------------------------------------------ answers

function priceInput() {
  const input = el('input', {
    class: 'input', type: 'number', inputmode: 'numeric',
    placeholder: 'gold', min: '1',
  });
  const send = async () => {
    const result = await post('answer', { id: me.id, value: input.value });
    notice = result.error ?? '';
    buzz();
    render();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  return [
    el('div', { class: 'player-prompt', text: state.question.prompt }),
    el('div', { style: 'display:flex;justify-content:center' }, [glyph(state.question.item, 'mid')]),
    el('div', { style: 'text-align:center;font-family:var(--display);font-size:22px;color:var(--yellow)',
      text: state.question.item.name }),
    input,
    el('button', { class: 'btn btn-primary', style: 'width:100%', onClick: send, text: 'Lock it in' }),
  ];
}

/**
 * Four buttons, for both Whose Loot Is This and Name That Sprite.
 *
 * The sprite round deliberately shows no picture on the phone: the picture is
 * on the television, and the whole point is that the room is looking at it
 * together rather than at twelve separate screens.
 */
function choices() {
  const q = state.question;
  return [
    el('div', { class: 'player-prompt', text: q.prompt }),
    q.kind === 'sprite' ? el('div', { class: 'muted', text: 'It is on the big screen. Look up.' }) : null,
    el('div', { class: 'choices' }, q.options.map((o, i) => el('button', {
      class: 'choice',
      onClick: async () => {
        const result = await post('answer', { id: me.id, value: i });
        notice = result.error ?? '';
        buzz();
        render();
      },
    }, [
      q.kind === 'sprite' ? null : glyph(o, 'mid'),
      el('span', { class: 'label grow', text: o.name }),
    ].filter(Boolean)))),
  ];
}

function answered() {
  const mine = state.you?.answer;
  const q = state.question;
  let shown = null;
  if (q?.kind === 'price') shown = `${fmt(mine)} gold`;
  else shown = q?.options[mine]?.name;

  return [
    el('div', { class: 'player-state' }, [
      el('div', { class: 'big', text: 'Locked in' }),
      el('div', { style: 'font-size:22px;margin-top:8px', text: shown ?? '' }),
      el('div', { class: 'muted', style: 'margin-top:14px', text: 'Eyes up — watch the big screen.' }),
    ]),
  ];
}

// -------------------------------------------------------------------- other

function waitScreen(big, sub) {
  const gain = me && state.players.find((p) => p.id === me.id)?.lastGain;
  return [
    el('div', { class: 'player-state' }, [
      el('div', { class: 'big', text: big }),
      sub ? el('div', { class: 'muted', style: 'margin-top:10px', text: sub }) : null,
    ]),
    state.phase === 'reveal' && gain != null
      ? el('div', { class: `player-gain${gain ? '' : ' zero'}`, text: gain ? `+${fmt(gain)}` : 'nothing' })
      : null,
  ];
}

// ------------------------------------------------------------------- render

function render() {
  if (!me) { root.replaceChildren(...joinScreen()); return; }
  if (!state) { root.replaceChildren(el('div', { class: 'player-state' }, [el('div', { class: 'big', text: 'Connecting…' })])); return; }

  const mine = state.players.find((p) => p.id === me.id);
  const head = el('div', { class: 'player-head' }, [
    el('span', { class: 'player-name', text: mine?.name ?? me.name }),
    el('span', { class: 'player-score', text: `${fmt(mine?.score ?? 0)}` }),
  ]);

  let body;
  if (state.phase === 'lobby') {
    body = waitScreen('You are in', `${state.players.length} in the room. Watch the big screen.`);
  } else if (state.phase === 'asking') {
    body = state.you?.answered ? answered()
      : state.question.kind === 'price' ? priceInput()
        : choices();
  } else if (state.phase === 'reveal') {
    body = waitScreen('Results', 'Look up.');
  } else if (state.phase === 'standings') {
    body = waitScreen('Standings', `You are ${state.players.findIndex((p) => p.id === me.id) + 1} of ${state.players.length}.`);
  } else {
    const rank = state.players.findIndex((p) => p.id === me.id) + 1;
    body = waitScreen(rank === 1 ? '🏆 You won' : `Finished ${rank}`, 'Good game.');
  }

  root.replaceChildren(head, ...body.filter(Boolean), el('div', { class: 'notice', text: notice }));
}

// ------------------------------------------------------------------- stream

let events = null;
function connect() {
  events?.close();
  events = new EventSource(`/events?id=${encodeURIComponent(me.id)}`);
  events.onmessage = (event) => {
    state = JSON.parse(event.data);
    render();
  };
}

// Come back into the same seat after a locked screen or a dropped connection.
const saved = localStorage.getItem(KEY);
if (saved) {
  post('join', { id: saved }).then((result) => {
    if (result.player) {
      me = result.player;
      connect();
    } else {
      localStorage.removeItem(KEY);
    }
    render();
  });
} else {
  render();
}
