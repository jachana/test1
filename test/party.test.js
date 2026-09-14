// The party game runs once, in a room, with everybody watching. There is no
// patching it at 11pm, so the rules are tested the same way the idle game's
// maths is: play whole games out headlessly and assert on what happened.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, addPlayer, startGame, submitAnswer, reveal, askNext, showStandings,
  standings, publicState, addPrompt, removePlayer, rejoin, allAnswered, currentRound,
  MAX_PLAYERS,
} from '../party/game.mjs';
import {
  priceQuestion, lootQuestion, priceScore, lootScore, memoryScores, ROUNDS,
} from '../party/rounds.mjs';
import { PROMPTS } from '../party/prompts.mjs';
import { MONSTERS } from '../src/data/monsters.js';
import { ITEMS } from '../src/data/items.js';
import { sellPrice } from '../src/data/shops.js';

const room = (names, options) => {
  const game = createGame(options);
  const players = names.map((name) => addPlayer(game, name).player);
  return { game, players };
};

// ------------------------------------------------------------------ rounds

test('price questions name a real item and its real price', () => {
  for (let i = 0; i < 200; i++) {
    const q = priceQuestion();
    assert.ok(ITEMS[q.item.id], `${q.item.id} is not an item`);
    assert.equal(q.answer, sellPrice(q.item.id));
    assert.ok(q.answer >= 20, 'a 4 gold ham is not a memory worth guessing at');
    assert.ok(q.item.name && q.item.icon);
  }
});

test('price scoring rewards the right order of magnitude', () => {
  assert.equal(priceScore(1000, 1000), 1250, 'exact should take the close bonus');
  assert.ok(priceScore(900, 1000) > priceScore(500, 1000));
  assert.ok(priceScore(500, 1000) > priceScore(50, 1000));
  assert.equal(priceScore(0, 1000), 0);
  assert.equal(priceScore('nonsense', 1000), 0);
  // Symmetric: being 2x over is the same mistake as being 2x under.
  assert.equal(priceScore(2000, 1000), priceScore(500, 1000));
});

test('the loot round always has exactly one wrong answer, and it is plausible', () => {
  for (let i = 0; i < 300; i++) {
    const q = lootQuestion();
    if (q.kind !== 'loot') continue; // the fallback, which should be vanishingly rare
    const monster = MONSTERS[q.monster.id];
    const drops = new Set(monster.loot.map((d) => d.item));

    const impostors = q.options.filter((o) => !drops.has(o.id));
    assert.equal(impostors.length, 1, `${monster.name}: ${impostors.length} of the four are not drops`);
    assert.equal(q.options[q.answer].id, impostors[0].id, 'the marked answer is not the impostor');
    assert.equal(new Set(q.options.map((o) => o.id)).size, 4, 'the same item appears twice');

    // The impostor has to come from somewhere comparable, or it answers itself:
    // a leather helmet among three demon drops is not a question.
    const source = Object.values(MONSTERS).find((m) => m !== monster
      && m.loot.some((d) => d.item === impostors[0].id)
      && m.exp >= monster.exp / 4 && m.exp <= monster.exp * 4);
    assert.ok(source, `${impostors[0].name} does not drop from anything near ${monster.name}`);
  }
});

test('the loot round pays for speed', () => {
  assert.equal(lootScore(false, 9000, 10000), 0);
  assert.ok(lootScore(true, 9000, 10000) > lootScore(true, 1000, 10000));
  assert.equal(lootScore(true, 0, 10000), 600, 'a right answer on the buzzer is still worth something');
});

test('Who Among Us pays the accused and the people who called it', () => {
  const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  // b, c and d all point at a; a points at b.
  const { awarded, winners } = memoryScores({ b: 'a', c: 'a', d: 'a', a: 'b' }, players);
  assert.deepEqual(winners, ['a']);
  assert.equal(awarded.a, 1000, 'the accused takes the prompt');
  assert.equal(awarded.b, 300, 'voting with the room is worth something');
  assert.equal(awarded.c, 300);
  assert.equal(awarded.a >= 1000, true);
  assert.equal(awarded.d, 300);

  // A tie gives both of them the prompt rather than picking arbitrarily.
  const tied = memoryScores({ a: 'c', b: 'c', c: 'd', d: 'd' }, players);
  assert.deepEqual(tied.winners.sort(), ['c', 'd']);
});

// -------------------------------------------------------------------- flow

test('a whole game plays from lobby to final scores', () => {
  const { game, players } = room(['Ana', 'Beto', 'Cata', 'Dani'], { perRound: 2 });
  assert.equal(game.phase, 'lobby');

  startGame(game);
  let guard = 0;
  while (game.phase !== 'finished' && guard++ < 200) {
    if (game.phase === 'asking') {
      const round = currentRound(game);
      for (const p of players) {
        const answer = round.id === 'price' ? 500
          : round.id === 'loot' ? 0
            : players[0].id;
        submitAnswer(game, p.id, answer);
      }
      // Everybody answering should have revealed it without the host pressing anything.
      assert.equal(game.phase, 'reveal', 'a full room should not wait on the clock');
    } else {
      askNext(game);
    }
  }

  assert.equal(game.phase, 'finished');
  assert.ok(standings(game)[0].score > 0, 'nobody scored anything in a whole game');
  assert.equal(guard < 200, true, 'the game did not terminate');
});

test('the final scores cannot be wiped by somebody leaning on the space bar', () => {
  // The host screen's one key is 'next', and at the end of the evening it has
  // to stop doing anything: the room is still reading the board.
  const { game, players } = room(['Ana', 'Beto'], { order: ['price'], perRound: 1 });
  startGame(game);
  for (const p of players) submitAnswer(game, p.id, 500);
  askNext(game);
  assert.equal(game.phase, 'finished');

  const scores = standings(game).map((p) => p.score);
  askNext(game); // whatever the host presses now
  assert.equal(game.phase, 'finished', 'the game restarted itself');
  assert.deepEqual(standings(game).map((p) => p.score), scores, 'the final scores were reset');
});

test('a round the room is too small for is skipped, not played', () => {
  // Who Among Us needs three people; with two it is just an accusation.
  const { game } = room(['Ana', 'Beto'], { order: ['memory'], perRound: 2 });
  startGame(game);
  assert.equal(game.phase, 'finished', 'ran a memory round with two players');

  const three = room(['Ana', 'Beto', 'Cata'], { order: ['memory'], perRound: 1 });
  startGame(three.game);
  assert.equal(three.game.phase, 'asking');
});

test('answers are refused when they should be', () => {
  const { game, players } = room(['Ana', 'Beto'], { order: ['price'], perRound: 3 });
  const [ana] = players;

  assert.ok(submitAnswer(game, ana.id, 100).error, 'took an answer before the game started');
  startGame(game);

  assert.ok(submitAnswer(game, 'nobody', 100).error, 'took an answer from a stranger');
  assert.ok(submitAnswer(game, ana.id, 'banana').error, 'took a price that is not a number');
  assert.ok(submitAnswer(game, ana.id, -5).error, 'took a negative price');

  assert.ok(!submitAnswer(game, ana.id, 250).error);
  assert.ok(submitAnswer(game, ana.id, 300).error, 'let somebody answer twice');
  assert.equal(game.answers[ana.id], 250, 'the second answer overwrote the first');
});

test('the loot round only accepts one of the four', () => {
  const { game, players } = room(['Ana'], { order: ['loot'], perRound: 1 });
  startGame(game);
  assert.ok(submitAnswer(game, players[0].id, 9).error);
  assert.ok(submitAnswer(game, players[0].id, -1).error);
  assert.ok(!submitAnswer(game, players[0].id, 2).error);
});

test('Who Among Us only accepts somebody in the room', () => {
  const { game, players } = room(['Ana', 'Beto', 'Cata'], { order: ['memory'], perRound: 1 });
  startGame(game);
  assert.ok(submitAnswer(game, players[0].id, 'p999').error);
  assert.ok(!submitAnswer(game, players[0].id, players[1].id).error);
});

// ------------------------------------------------------------------ players

test('names are trimmed, capped, and cannot be duplicated', () => {
  const game = createGame();
  assert.ok(addPlayer(game, '   ').error, 'accepted a blank name');
  assert.equal(addPlayer(game, '  Ana  ').player.name, 'Ana');
  assert.ok(addPlayer(game, 'ana').error, 'let two people be Ana');
  assert.equal(addPlayer(game, 'x'.repeat(40)).player.name.length, 16);

  while (game.players.length < MAX_PLAYERS) addPlayer(game, `p${game.players.length}`);
  assert.ok(addPlayer(game, 'one-too-many').error, 'the room has no limit');
});

test('a phone that locks its screen keeps its seat and its score', () => {
  const { game, players } = room(['Ana', 'Beto'], { order: ['price'], perRound: 2 });
  startGame(game);
  submitAnswer(game, players[0].id, 500);
  submitAnswer(game, players[1].id, 500);
  const scoreBefore = standings(game).find((p) => p.id === players[0].id).score;

  removePlayer(game, players[0].id);
  assert.equal(game.players.find((p) => p.id === players[0].id).connected, false);
  assert.equal(
    standings(game).find((p) => p.id === players[0].id).score, scoreBefore,
    'a dropped phone wiped a score',
  );

  assert.ok(rejoin(game, players[0].id), 'could not come back');
  assert.equal(game.players.find((p) => p.id === players[0].id).connected, true);
});

test('a question does not wait on somebody who has gone', () => {
  const { game, players } = room(['Ana', 'Beto'], { order: ['price'], perRound: 1 });
  startGame(game);
  removePlayer(game, players[1].id);
  assert.equal(allAnswered(game), false);
  submitAnswer(game, players[0].id, 100);
  assert.equal(game.phase, 'reveal', 'waited on a phone that had left the room');
});

// ------------------------------------------------------------------- wire

test('the answer is not on the wire while the question is open', () => {
  const { game, players } = room(['Ana'], { order: ['price', 'loot'], perRound: 1 });
  startGame(game);

  const open = publicState(game, players[0].id);
  assert.equal(open.question.answer, undefined, 'the price was sitting in the state frame');
  assert.ok(open.question.item, 'but the item still has to be there to draw it');

  submitAnswer(game, players[0].id, 100);
  assert.equal(publicState(game).question.answer, game.question.answer, 'the reveal has to show it');
});

test('a player only ever sees their own answer', () => {
  const { game, players } = room(['Ana', 'Beto'], { order: ['price'], perRound: 1 });
  startGame(game);
  submitAnswer(game, players[0].id, 777);

  const asBeto = publicState(game, players[1].id);
  assert.equal(asBeto.you.answered, false);
  assert.equal(asBeto.you.answer, null);
  assert.ok(asBeto.answered.includes(players[0].id), 'the room should see that Ana is in');
  assert.equal(JSON.stringify(asBeto).includes('777'), false, "Ana's guess leaked to Beto");
});

test('prompts can be added mid-party and are not duplicated', () => {
  const game = createGame();
  const before = game.prompts.length;
  assert.ok(addPrompt(game, 'Who is most likely to fall asleep first').ok);
  assert.equal(game.prompts.length, before + 1);
  assert.ok(addPrompt(game, 'Who is most likely to fall asleep first').error);
  assert.ok(addPrompt(game, 'no').error, 'accepted a two-letter prompt');
});

test('every shipped prompt is a usable question', () => {
  assert.ok(PROMPTS.length >= 20, 'not enough prompts to fill an evening');
  for (const prompt of PROMPTS) {
    assert.equal(typeof prompt, 'string');
    assert.ok(prompt.trim().length >= 10, `too short to be a question: "${prompt}"`);
    assert.equal(prompt, prompt.trim());
  }
  assert.equal(new Set(PROMPTS).size, PROMPTS.length, 'the same prompt is in there twice');
});

test('every round is configured to actually be playable', () => {
  for (const round of Object.values(ROUNDS)) {
    assert.ok(round.seconds >= 10 && round.seconds <= 60, `${round.id}: silly timer`);
    assert.equal(typeof round.make, 'function');
    assert.ok(round.name && round.icon && round.blurb);
  }
});

test('the price box understands how people actually type numbers', () => {
  const cases = [['1000', 1000], ['1,000', 1000], ['1000 gold', 1000], ['2k', 2000], [' 45 ', 45]];
  for (const [typed, expected] of cases) {
    const { game, players } = room(['Ana'], { order: ['price'], perRound: 1 });
    startGame(game);
    assert.ok(!submitAnswer(game, players[0].id, typed).error, `rejected "${typed}"`);
    assert.equal(game.answers[players[0].id], expected, `"${typed}" became the wrong number`);
  }
});
