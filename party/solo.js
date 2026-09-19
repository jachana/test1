// Practice mode: the party game's three rounds, alone, on one screen.
//
// The real game is a room — a television, everybody's phones, and the arguing.
// None of that fits in a static page, so this is the other thing the rounds are
// good for: finding out whether the questions land before you inflict them on
// six people, and having something to send round the group chat beforehand.
//
// It shares rounds.mjs with the real game rather than reimplementing anything,
// so a question you see here is a question that can come up on the night.
import { ROUNDS, DEFAULT_ORDER, priceScore, lootScore } from './rounds.mjs';

const root = document.getElementById('solo');
const PER_ROUND = 5;
const ORDER = DEFAULT_ORDER;

const state = {
  phase: 'intro', // intro | asking | reveal | finished
  roundIndex: 0,
  questionIndex: -1,
  question: null,
  given: null,
  score: 0,
  gain: 0,
  best: 0,
  endsAt: 0,
  timer: null,
};

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
const round = () => ROUNDS[ORDER[state.roundIndex]];

/** The real sprite where the atlas has one, the emoji where it does not. */
function glyph(item, size) {
  if (!item.sprite) return el('div', { class: `glyph glyph-${size}`, text: item.icon });
  return el('div', { class: `spr-box ${size}` }, [
    el('div', { class: `sprite spr-${item.id}`, title: item.name }),
  ]);
}

// --------------------------------------------------------------------- flow

function ask() {
  const current = round();
  if (state.questionIndex + 1 >= PER_ROUND) {
    state.roundIndex += 1;
    state.questionIndex = -1;
    if (state.roundIndex >= ORDER.length) return finish();
    return ask();
  }
  state.questionIndex += 1;
  state.question = current.make();
  state.given = null;
  state.phase = 'asking';
  state.endsAt = Date.now() + current.seconds * 1000;
  render();
  return undefined;
}

/** Out of time counts as an answer — a wrong one. That is the round. */
function answer(value) {
  if (state.phase !== 'asking') return;
  const current = round();
  const msLeft = Math.max(0, state.endsAt - Date.now());

  state.given = value;
  if (current.id === 'price') {
    state.gain = value == null ? 0 : priceScore(value, state.question.answer);
  } else {
    state.gain = lootScore(value === state.question.answer, msLeft, current.seconds * 1000);
  }
  state.score += state.gain;
  state.phase = 'reveal';
  render();
}

function finish() {
  state.phase = 'finished';
  state.best = Math.max(state.best, state.score);
  try { localStorage.setItem('tibia-party:best', String(state.best)); } catch { /* private window */ }
  render();
  return undefined;
}

function restart() {
  state.score = 0;
  state.roundIndex = 0;
  state.questionIndex = -1;
  ask();
}

/** Space and Enter advance; 1-4 answer the four-option rounds. */
function advance() {
  if (state.phase === 'intro') restart();
  else if (state.phase === 'reveal') ask();
  else if (state.phase === 'finished') restart();
}

// ------------------------------------------------------------------ screens

function intro() {
  return [
    el('div', { class: 'host-main' }, [
      el('div', { class: 'big-prompt', text: 'Tibia LAN Party' }),
      el('div', { class: 'solo-blurb' }, [
        el('p', { text: 'Three rounds, five questions each, played alone.' }),
        el('div', { class: 'solo-rounds' }, ORDER.map((id) => {
          const r = ROUNDS[id];
          return el('div', { class: 'solo-round' }, [
            el('div', { class: 'solo-round-icon', text: r.icon }),
            el('div', {}, [
              el('div', { class: 'solo-round-name', text: r.name }),
              el('div', { class: 'muted', text: r.blurb }),
            ]),
          ]);
        })),
        el('p', { class: 'muted', text: 'The real one runs on a laptop with everybody on their phones. This is the rehearsal.' }),
      ]),
      el('button', { class: 'btn btn-primary btn-lg', onClick: advance, text: 'Start' }),
      state.best ? el('div', { class: 'muted', text: `Best so far: ${fmt(state.best)}` }) : null,
    ]),
  ];
}

function priceAnswer() {
  const input = el('input', {
    class: 'input', type: 'text', inputmode: 'numeric',
    placeholder: 'gold', autocomplete: 'off', autocapitalize: 'off',
  });
  const notice = el('div', { class: 'notice' });
  const send = () => {
    // Same forgiveness the phones get: "2k", "1,000" and "1000 gold" are all a
    // number somebody meant. A minus sign is not.
    const raw = input.value.trim().toLowerCase();
    if (raw.includes('-')) { notice.textContent = 'Gold does not go negative.'; return; }
    const thousands = /^[\d.,]+\s*k$/.test(raw);
    const guess = Number(raw.replace(/[^\d.]/g, '')) * (thousands ? 1000 : 1);
    if (!Number.isFinite(guess) || guess <= 0) { notice.textContent = 'Type a number.'; return; }
    answer(Math.round(guess));
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
  queueMicrotask(() => input.focus());

  return el('div', { class: 'solo-answer' }, [
    input,
    el('button', { class: 'btn btn-primary', onClick: send, text: 'Lock it in' }),
    notice,
  ]);
}

function optionAnswer(options, withGlyph) {
  return el('div', { class: `options${withGlyph ? '' : ' names'}` }, options.map((o, i) => el('button', {
    class: 'option', onClick: () => answer(i),
  }, [
    el('div', { class: 'key', text: String(i + 1) }),
    withGlyph ? glyph(o, 'mid') : null,
    el('div', { class: 'label', text: o.name }),
  ].filter(Boolean))));
}

function asking() {
  const q = state.question;
  const body = [el('div', { class: 'big-prompt', text: q.prompt })];

  if (q.kind === 'price') {
    body.push(el('div', { class: 'hero-item' }, [glyph(q.item, 'big'), el('div', { class: 'hero-name', text: q.item.name })]));
    body.push(priceAnswer());
  } else if (q.kind === 'loot') {
    body.push(optionAnswer(q.options, true));
  } else {
    body.push(el('div', { class: 'hero-item' }, [glyph(q.item, 'big')]));
    body.push(optionAnswer(q.options, false));
  }

  const fill = el('div', { class: 'timer-fill' });
  return [el('div', { class: 'host-main' }, body), el('div', { class: 'timer' }, [fill])];
}

function reveal() {
  const q = state.question;
  const next = el('button', { class: 'btn btn-primary btn-lg', onClick: advance, text: 'Next' });
  queueMicrotask(() => next.focus());
  const gain = el('div', { class: `solo-gain${state.gain ? '' : ' zero'}`, text: state.gain ? `+${fmt(state.gain)}` : 'nothing' });

  if (q.kind === 'price') {
    const off = state.given == null ? null : Math.abs(state.given - q.answer);
    return [
      el('div', { class: 'host-main' }, [
        el('div', { class: 'hero-item' }, [glyph(q.item, 'big'), el('div', { class: 'hero-name', text: q.item.name })]),
        el('div', { class: 'answer-big', text: `${fmt(q.answer)} gold` }),
        el('div', { class: 'guesses' }, [
          el('div', { class: 'guess-row best' }, [
            el('span', { class: 'who', text: 'You said' }),
            el('span', { class: 'val', text: state.given == null ? 'nothing' : fmt(state.given) }),
            el('span', { class: 'gain', text: off == null ? '—' : `${fmt(off)} out` }),
          ]),
        ]),
        gain, next,
      ]),
    ];
  }

  const isSprite = q.kind === 'sprite';
  return [
    el('div', { class: 'host-main' }, [
      isSprite
        ? el('div', { class: 'hero-item' }, [glyph(q.item, 'big'), el('div', { class: 'hero-name', text: q.options[q.answer].name })])
        : el('div', { class: 'big-prompt', text: `${q.monster.icon} ${q.monster.name} never drops…` }),
      el('div', { class: `options${isSprite ? ' names' : ''}` }, q.options.map((o, i) => el('div', {
        class: `option ${i === q.answer ? 'right' : 'wrong'}${i === state.given && i !== q.answer ? ' picked-wrong' : ''}`,
      }, [
        isSprite ? null : glyph(o, 'mid'),
        el('div', { class: 'label', text: o.name }),
        el('div', { class: 'key', text: i === state.given ? 'you' : '' }),
      ].filter(Boolean)))),
      gain, next,
    ]),
  ];
}

function finished() {
  const again = el('button', { class: 'btn btn-primary btn-lg', onClick: advance, text: 'Play again' });
  queueMicrotask(() => again.focus());
  return [
    el('div', { class: 'host-main' }, [
      el('div', { class: 'big-prompt', text: '🏆 Final' }),
      el('div', { class: 'answer-big', text: fmt(state.score) }),
      el('div', { class: 'muted', text: state.score >= state.best ? 'Your best yet.' : `Best: ${fmt(state.best)}` }),
      again,
      el('p', { class: 'solo-footnote' }, [
        'This is the practice run. The real one is ',
        el('code', { text: 'npm run party' }),
        ' on a laptop plugged into the television, with everybody answering on their phones — and the arguing, which is the actual game.',
      ]),
    ]),
  ];
}

// ------------------------------------------------------------------- render

function render() {
  const r = round();
  const progress = state.phase === 'intro' || state.phase === 'finished'
    ? 'practice mode — play it alone'
    : `${r.icon} ${r.name} · question ${state.questionIndex + 1} of ${PER_ROUND}`;

  const main = state.phase === 'intro' ? intro()
    : state.phase === 'asking' ? asking()
      : state.phase === 'reveal' ? reveal()
        : finished();

  root.replaceChildren(
    el('div', { class: 'host-top' }, [
      el('div', {}, [
        el('div', { class: 'host-title', text: '⚔️ Tibia LAN Party' }),
        el('div', { class: 'round-badge', text: progress }),
      ]),
      el('div', { style: 'text-align:right' }, [
        el('div', { class: 'host-sub', text: 'score' }),
        el('div', { class: 'host-join', text: fmt(state.score) }),
      ]),
    ]),
    ...main.filter(Boolean),
  );
}

// The timer runs off the clock rather than off renders, so a reveal that sits
// on screen for a minute does not eat the next question's time.
state.timer = setInterval(() => {
  if (state.phase !== 'asking') return;
  const left = state.endsAt - Date.now();
  const bar = root.querySelector('.timer-fill');
  if (bar) {
    const share = Math.max(0, left / (round().seconds * 1000));
    bar.style.width = `${share * 100}%`;
    bar.classList.toggle('low', share < 0.25);
  }
  if (left <= 0) answer(null);
}, 100);

document.addEventListener('keydown', (event) => {
  if (event.target.tagName === 'INPUT') return;
  if (event.code === 'Space' || event.key === 'Enter') {
    event.preventDefault();
    advance();
  } else if (state.phase === 'asking' && state.question.kind !== 'price' && /^[1-4]$/.test(event.key)) {
    answer(Number(event.key) - 1);
  }
});

try { state.best = Number(localStorage.getItem('tibia-party:best')) || 0; } catch { /* private window */ }
render();
