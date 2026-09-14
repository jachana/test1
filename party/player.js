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
    el('div', { style: 'text-align:center;font-size:64px;line-height:1', text: state.question.item.icon }),
    el('div', { style: 'text-align:center;font-family:var(--display);font-size:22px;color:var(--yellow)',
      text: state.question.item.name }),
    input,
    el('button', { class: 'btn btn-primary', style: 'width:100%', onClick: send, text: 'Lock it in' }),
  ];
}

function lootChoices() {
  return [
    el('div', { class: 'player-prompt', text: state.question.prompt }),
    el('div', { class: 'choices' }, state.question.options.map((o, i) => el('button', {
      class: 'choice',
      onClick: async () => {
        const result = await post('answer', { id: me.id, value: i });
        notice = result.error ?? '';
        buzz();
        render();
      },
    }, [
      el('span', { class: 'glyph', text: o.icon }),
      el('span', { class: 'label grow', text: o.name }),
    ]))),
  ];
}

function memoryChoices() {
  return [
    el('div', { class: 'player-prompt', text: state.question.prompt }),
    el('div', { class: 'muted', text: 'No right answer. Pick somebody and be ready to defend it.' }),
    el('div', { class: 'choices' }, state.players.map((p) => el('button', {
      class: 'choice',
      onClick: async () => {
        const result = await post('answer', { id: me.id, value: p.id });
        notice = result.error ?? '';
        buzz();
        render();
      },
    }, [
      el('span', { class: 'label grow', text: p.name }),
      p.id === me.id ? el('span', { class: 'muted', text: 'you' }) : null,
    ]))),
  ];
}

function answered() {
  const mine = state.you?.answer;
  const q = state.question;
  let shown = null;
  if (q?.kind === 'price') shown = `${fmt(mine)} gold`;
  else if (q?.kind === 'loot') shown = q.options[mine]?.name;
  else shown = state.players.find((p) => p.id === mine)?.name;

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
        : state.question.kind === 'loot' ? lootChoices()
          : memoryChoices();
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
