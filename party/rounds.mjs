// Question generation for the party game, built on the same `src/data` the idle
// game runs on — the items, the creatures and the real OTServ drop tables.
//
// Three round types, in the order they should be played:
//
//   price   Everyone guesses what a thing is worth. No knowledge gate: the
//           friend who quit in 2006 still remembers a demon armor was "a lot",
//           and gets to be outraged when the number comes up.
//   loot    Four items, one of which this creature does not drop. Fast, and
//           the only round that rewards actually knowing things — so keep it
//           short and put it in the middle.
//   memory  Vote on each other. The game is a pretext; the stories are the
//           point, and this is the round the whole evening is actually for.
import { ITEMS } from '../src/data/items.js';
import { MONSTERS } from '../src/data/monsters.js';
import { sellPrice } from '../src/data/shops.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The public shape of an item — what a client needs to draw it, nothing else. */
const itemCard = (id) => {
  const item = ITEMS[id];
  return { id, name: item.name, icon: item.icon, type: item.type };
};

// ------------------------------------------------------------------- price

/**
 * Worth guessing about: recognisable gear and treasure, not 40 kinds of fish.
 *
 * The bottom end is excluded because "a ham is worth 4 gold" is not a memory,
 * and stackable ammunition is excluded because nobody prices a single arrow.
 */
const PRICEABLE = Object.keys(ITEMS).filter((id) => {
  const item = ITEMS[id];
  if (item.type === 'currency') return false;
  if (['arrow', 'bolt', 'power_bolt'].includes(id)) return false;
  return sellPrice(id) >= 20;
});

export function priceQuestion() {
  const id = pick(PRICEABLE);
  return {
    kind: 'price',
    prompt: 'What will a trader pay for this?',
    item: itemCard(id),
    answer: sellPrice(id),
  };
}

/**
 * Closeness on a log scale, because the answers run from 20 gold to 60,000 and
 * being 500 out on a demon armor is a good guess while being 500 out on a mace
 * is not. Squared so that "roughly right" still beats "wildly wrong" clearly.
 */
export function priceScore(guess, answer) {
  const g = Number(guess);
  if (!Number.isFinite(g) || g <= 0) return 0;
  const ratio = Math.min(g, answer) / Math.max(g, answer);
  const points = Math.round(1000 * ratio ** 2);
  // Within a tenth is a real memory, not a lucky bracket.
  return ratio >= 0.9 ? points + 250 : points;
}

// -------------------------------------------------------------------- loot

/** Creatures with enough of a loot table to make a question out of. */
const LOOTED = Object.values(MONSTERS).filter((m) => m.loot.length >= 3);

/**
 * Four items, exactly one of which this creature does not drop.
 *
 * The impostor comes from a creature of a similar tier, because a leather
 * helmet among three demon drops answers itself. Similar means within a factor
 * of four on experience, which keeps Rookgaard out of Hellgate and vice versa.
 */
export function lootQuestion() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const monster = pick(LOOTED);
    const real = shuffle(monster.loot.map((d) => d.item)).slice(0, 3);
    if (real.length < 3) continue;

    const drops = new Set(monster.loot.map((d) => d.item));
    const nearby = LOOTED.filter((m) => m !== monster
      && m.exp >= monster.exp / 4 && m.exp <= monster.exp * 4);
    const candidates = [...new Set(nearby.flatMap((m) => m.loot.map((d) => d.item)))]
      .filter((id) => !drops.has(id));
    if (!candidates.length) continue;

    const impostor = pick(candidates);
    const options = shuffle([...real, impostor]);
    return {
      kind: 'loot',
      prompt: `Which of these does a ${monster.name.toLowerCase()} NOT drop?`,
      monster: { id: monster.id, name: monster.name, icon: monster.icon },
      options: options.map(itemCard),
      answer: options.indexOf(impostor),
    };
  }
  // Every creature in the game would have to be unusable to get here.
  return priceQuestion();
}

/** Right answers are worth more the faster they land — it is a buzzer round. */
export function lootScore(correct, msLeft, msTotal) {
  if (!correct) return 0;
  return 600 + Math.round(400 * Math.max(0, Math.min(1, msLeft / msTotal)));
}

// ------------------------------------------------------------------ memory

/**
 * Vote on each other. There is no right answer, which is the point: the score
 * is a scaffold for the argument that follows.
 *
 * The most-voted player takes the prompt, and everyone who picked them gets
 * something too, so voting is a guess about the room rather than a free shot.
 */
export function memoryQuestion(prompts, used = []) {
  const fresh = prompts.filter((p) => !used.includes(p));
  return {
    kind: 'memory',
    prompt: pick(fresh.length ? fresh : prompts),
    answer: null, // decided by the room
  };
}

export function memoryScores(votes, players) {
  const tally = new Map();
  for (const target of Object.values(votes)) {
    tally.set(target, (tally.get(target) ?? 0) + 1);
  }
  const top = Math.max(0, ...tally.values());
  const winners = [...tally.entries()].filter(([, n]) => n === top).map(([id]) => id);

  const awarded = {};
  for (const player of players) awarded[player.id] = 0;
  for (const id of winners) if (id in awarded) awarded[id] += 1000;
  for (const [voter, target] of Object.entries(votes)) {
    if (winners.includes(target) && voter in awarded) awarded[voter] += 300;
  }
  return { awarded, winners, tally: Object.fromEntries(tally) };
}

// ------------------------------------------------------------------- rounds

export const ROUNDS = {
  price: {
    id: 'price',
    name: 'Price Check',
    icon: '🪙',
    blurb: 'What is it worth? Closest guess takes it.',
    seconds: 25,
    make: priceQuestion,
  },
  loot: {
    id: 'loot',
    name: 'Whose Loot Is This?',
    icon: '💀',
    blurb: 'One of these four is not a drop. Be quick.',
    seconds: 18,
    make: lootQuestion,
  },
  memory: {
    id: 'memory',
    name: 'Who Among Us',
    icon: '🍻',
    blurb: 'No right answer. Vote, then explain yourself.',
    seconds: 30,
    make: memoryQuestion,
  },
};

/** The running order: warm up on prices, one sharp round, then the good stuff. */
export const DEFAULT_ORDER = ['price', 'loot', 'memory'];
