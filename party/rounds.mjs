// Question generation for the party game, built on the same `src/data` the idle
// game runs on — the items, the creatures and the real OTServ drop tables.
//
// Three round types, in the order they should be played:
//
//   price   Everyone guesses what a thing is worth. No knowledge gate: the
//           friend who quit in 2006 still remembers a demon armor was "a lot",
//           and gets to be outraged when the number comes up.
//   loot    Four items, one of which this creature does not drop. Fast, so
//           keep it short and put it in the middle.
//   sprite  32 pixels, no name, four guesses. Nobody reads item names in
//           Tibia — you recognise the picture — so this is the round that
//           finds out whether twenty years later you still do.
import { ITEMS } from '../src/data/items.js';
import { MONSTERS } from '../src/data/monsters.js';
import { sellPrice } from '../src/data/shops.js';
import { hasSprite } from '../src/data/sprites.js';

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
  return { id, name: item.name, icon: item.icon, type: item.type, sprite: hasSprite(id) };
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

// ------------------------------------------------------------------ sprite

/** Only items we have the real 32x32 art for — the rest are emoji, which is a
 *  different and much easier question. */
const DRAWN = Object.keys(ITEMS).filter(hasSprite);
const DRAWN_BY_TYPE = DRAWN.reduce((byType, id) => {
  (byType[ITEMS[id].type] ??= []).push(id);
  return byType;
}, {});

/**
 * Only things with three siblings to hide among. "Which of these is the bolt"
 * answers itself when the other three are a suit of armour, a helmet and a
 * shield, so ammunition, coins and the lone resource are never the subject —
 * which is no loss, because nobody wants to be asked to identify a gold coin.
 */
const ASKABLE = DRAWN.filter((id) => DRAWN_BY_TYPE[ITEMS[id].type].length >= 4);

/**
 * One sprite, no name, four names to choose from.
 *
 * The three wrong names always come from the same item type, because "which of
 * these is the shield" is not a question when the picture is obviously a
 * shield. Within a type it comes down to whether you remember that the brass
 * shield is the round one.
 */
export function spriteQuestion() {
  const id = pick(ASKABLE);
  const sameType = DRAWN_BY_TYPE[ITEMS[id].type].filter((other) => other !== id);
  const wrong = shuffle(sameType).slice(0, 3);
  const options = shuffle([id, ...wrong]);
  return {
    kind: 'sprite',
    prompt: 'What is this?',
    item: itemCard(id),
    options: options.map((other) => ({ id: other, name: ITEMS[other].name })),
    answer: options.indexOf(id),
  };
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
  sprite: {
    id: 'sprite',
    name: 'Name That Sprite',
    icon: '🔍',
    blurb: '32 pixels. No name. Do you still know it?',
    seconds: 18,
    make: spriteQuestion,
  },
};

/** The running order: warm up on prices, one sharp round, then the pictures. */
export const DEFAULT_ORDER = ['price', 'loot', 'sprite'];
