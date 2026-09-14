// The party game's state machine.
//
// Deliberately free of any I/O: it is a plain object and a handful of functions
// that mutate it, so the whole thing can be played out in a test without a
// socket, a browser or a room full of people. server.mjs owns the network and
// the clock; this owns the rules.
//
// Phases: lobby -> asking -> reveal -> (asking | standings) -> ... -> finished
import {
  ROUNDS, DEFAULT_ORDER, priceScore, lootScore, memoryScores,
} from './rounds.mjs';
import { PROMPTS, isValidPrompt } from './prompts.mjs';

export const PHASES = ['lobby', 'asking', 'reveal', 'standings', 'finished'];

/** Enough for a living room; past this the reveal screen stops being readable. */
export const MAX_PLAYERS = 12;
const MIN_PLAYERS = { price: 1, loot: 1, memory: 3 };

let nextId = 1;
const makeId = () => `p${nextId++}`;

export function createGame({ order = DEFAULT_ORDER, perRound = 5, prompts = PROMPTS } = {}) {
  return {
    phase: 'lobby',
    players: [],
    order,
    perRound,
    prompts: [...prompts],
    usedPrompts: [],
    roundIndex: -1,
    questionIndex: -1,
    question: null,
    answers: {},      // playerId -> answer (a number, an option index, or a playerId)
    lastResult: null, // what the reveal screen is showing
    endsAt: null,
    seq: 0,           // bumped on every change, so clients can tell frames apart
  };
}

const touch = (game) => { game.seq += 1; return game; };

export const currentRound = (game) => ROUNDS[game.order[game.roundIndex]] ?? null;

// ------------------------------------------------------------------ players

export function addPlayer(game, name) {
  const clean = String(name ?? '').trim().slice(0, 16);
  if (!clean) return { error: 'Pick a name.' };
  if (game.players.length >= MAX_PLAYERS) return { error: 'The room is full.' };
  if (game.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    return { error: 'Somebody already took that name.' };
  }
  const player = { id: makeId(), name: clean, score: 0, connected: true };
  game.players.push(player);
  touch(game);
  return { player };
}

export function removePlayer(game, id) {
  const player = game.players.find((p) => p.id === id);
  // Kept in the list rather than spliced out: a phone that locks its screen
  // mid-round should not wipe somebody's score off the board.
  if (player) { player.connected = false; touch(game); }
}

export function rejoin(game, id) {
  const player = game.players.find((p) => p.id === id);
  if (!player) return null;
  player.connected = true;
  touch(game);
  return player;
}

// -------------------------------------------------------------------- flow

/** True when this round can be played with the people currently in the room. */
export function roundIsPlayable(game, roundId) {
  return game.players.length >= (MIN_PLAYERS[roundId] ?? 1);
}

export function startGame(game) {
  if (!game.players.length) return { error: 'Nobody has joined yet.' };
  game.roundIndex = -1;
  game.questionIndex = -1;
  for (const p of game.players) p.score = 0;
  return nextRound(game);
}

function nextRound(game) {
  let index = game.roundIndex + 1;
  // Skip a round the room is too small for — Who Among Us with two people is
  // just an accusation.
  while (index < game.order.length && !roundIsPlayable(game, game.order[index])) index += 1;
  if (index >= game.order.length) {
    game.phase = 'finished';
    game.question = null;
    touch(game);
    return { ok: true };
  }
  game.roundIndex = index;
  game.questionIndex = -1;
  return askNext(game);
}

export function askNext(game) {
  const round = currentRound(game);
  if (!round) return { error: 'No round in progress.' };
  if (game.questionIndex + 1 >= game.perRound) return nextRound(game);

  game.questionIndex += 1;
  game.question = round.id === 'memory'
    ? round.make(game.prompts, game.usedPrompts)
    : round.make();
  if (round.id === 'memory') game.usedPrompts.push(game.question.prompt);

  game.answers = {};
  game.lastResult = null;
  game.phase = 'asking';
  game.endsAt = Date.now() + round.seconds * 1000;
  touch(game);
  return { ok: true };
}

export function submitAnswer(game, playerId, value) {
  if (game.phase !== 'asking') return { error: 'Not taking answers right now.' };
  if (!game.players.some((p) => p.id === playerId)) return { error: 'You are not in this game.' };
  if (playerId in game.answers) return { error: 'You already answered.' };

  const round = currentRound(game);
  if (round.id === 'price') {
    // Phones produce "1,000" and "2k" and "1000 gold"; all of those are a
    // number somebody meant. A minus sign is not — stripping it silently
    // turned -5 into a perfectly good guess of 5.
    const raw = String(value).trim().toLowerCase();
    if (raw.includes('-')) return { error: 'Gold does not go negative.' };
    const thousands = /^[\d.,]+\s*k$/.test(raw);
    const digits = raw.replace(/[^\d.]/g, '');
    const guess = Number(digits) * (thousands ? 1000 : 1);
    if (!Number.isFinite(guess) || guess <= 0) return { error: 'Type a number.' };
    game.answers[playerId] = Math.round(guess);
  } else if (round.id === 'loot') {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= game.question.options.length) {
      return { error: 'Pick one of the four.' };
    }
    game.answers[playerId] = index;
  } else {
    if (!game.players.some((p) => p.id === value)) return { error: 'Pick somebody in the room.' };
    game.answers[playerId] = value;
  }

  touch(game);
  // Everybody in: no reason to make the room watch a timer run down.
  if (allAnswered(game)) return reveal(game);
  return { ok: true };
}

export const activePlayers = (game) => game.players.filter((p) => p.connected);

export function allAnswered(game) {
  const active = activePlayers(game);
  return active.length > 0 && active.every((p) => p.id in game.answers);
}

export const timeLeft = (game) => Math.max(0, (game.endsAt ?? 0) - Date.now());

// ------------------------------------------------------------------ scoring

export function reveal(game) {
  if (game.phase !== 'asking') return { error: 'Nothing to reveal.' };
  const round = currentRound(game);
  const msTotal = round.seconds * 1000;
  const msLeft = timeLeft(game);
  const awarded = {};

  if (round.id === 'price') {
    for (const [id, guess] of Object.entries(game.answers)) {
      awarded[id] = priceScore(guess, game.question.answer);
    }
    const guesses = Object.entries(game.answers)
      .map(([id, guess]) => ({ id, guess, off: Math.abs(guess - game.question.answer) }))
      .sort((a, b) => a.off - b.off);
    // A flat bonus for nearest, so there is always somebody to point at.
    if (guesses.length > 1) awarded[guesses[0].id] = (awarded[guesses[0].id] ?? 0) + 300;
    game.lastResult = { kind: 'price', answer: game.question.answer, guesses };
  } else if (round.id === 'loot') {
    for (const [id, choice] of Object.entries(game.answers)) {
      awarded[id] = lootScore(choice === game.question.answer, msLeft, msTotal);
    }
    game.lastResult = {
      kind: 'loot',
      answer: game.question.answer,
      picks: Object.fromEntries(Object.entries(game.answers)),
    };
  } else {
    const result = memoryScores(game.answers, game.players);
    Object.assign(awarded, result.awarded);
    game.lastResult = { kind: 'memory', ...result };
  }

  for (const player of game.players) {
    const gained = awarded[player.id] ?? 0;
    player.score += gained;
    player.lastGain = gained;
  }

  game.phase = 'reveal';
  game.endsAt = null;
  touch(game);
  return { ok: true };
}

export function showStandings(game) {
  game.phase = 'standings';
  game.question = null;
  touch(game);
  return { ok: true };
}

/** Sorted for the board: highest first, ties broken by name so it is stable. */
export function standings(game) {
  return [...game.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

// ------------------------------------------------------------------ prompts

export function addPrompt(game, text) {
  if (!isValidPrompt(text)) return { error: 'That is a bit short.' };
  const clean = text.trim().slice(0, 120);
  if (game.prompts.includes(clean)) return { error: 'Already in the pile.' };
  game.prompts.push(clean);
  touch(game);
  return { ok: true, count: game.prompts.length };
}

// ------------------------------------------------------------------- views

/**
 * What goes over the wire. The answer is stripped while a question is open —
 * the whole game is one HTTP server on somebody's laptop, and somebody in that
 * room will absolutely open dev tools.
 */
export function publicState(game, forPlayerId = null) {
  const round = currentRound(game);
  const open = game.phase === 'asking';
  const question = game.question && {
    ...game.question,
    answer: open ? undefined : game.question.answer,
  };

  return {
    seq: game.seq,
    phase: game.phase,
    round: round && {
      id: round.id, name: round.name, icon: round.icon, blurb: round.blurb, seconds: round.seconds,
    },
    roundIndex: game.roundIndex,
    roundCount: game.order.length,
    questionIndex: game.questionIndex,
    perRound: game.perRound,
    question,
    endsAt: game.endsAt,
    answered: Object.keys(game.answers),
    players: standings(game).map((p) => ({
      id: p.id, name: p.name, score: p.score, connected: p.connected, lastGain: p.lastGain ?? 0,
    })),
    result: game.lastResult,
    you: forPlayerId
      ? {
        id: forPlayerId,
        answered: forPlayerId in game.answers,
        answer: game.answers[forPlayerId] ?? null,
      }
      : null,
    promptCount: game.prompts.length,
  };
}
