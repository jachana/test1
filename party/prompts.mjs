// The "Who Among Us" prompts.
//
// EDIT THIS FILE BEFORE THE PARTY. This is the round the evening is actually
// for, and the prompts that land are the ones about your specific friends —
// the guild that fell apart, the one who got scammed, the character name
// everybody still brings up. The generic ones below are a starting point and a
// format guide, not a script.
//
// A good prompt names something everyone in the room can picture, and has at
// least two defensible answers. "Who was the best player" is a fact and dies
// instantly; "Who would ding level 8 and immediately walk into the Minotaur
// Caves" is an accusation and takes twenty minutes to settle.
//
// You can also add prompts live from the host screen — press A during a game.

export const PROMPTS = [
  // --------------------------------------------------------- the early days
  'Most likely to have kept playing on Rookgaard long after level 8',
  'Whose first character name was the most embarrassing',
  'Who spent the longest deciding on a vocation',
  'Most likely to have picked knight purely because it sounded safest',
  'Who begged hardest for a spot in somebody else\'s hunt',
  'Most likely to have sold a rare drop for a tenth of what it was worth',

  // ------------------------------------------------------------- the deaths
  'Most likely to have died to a rotworm at a shamefully high level',
  'Who has the most deaths that were entirely their own fault',
  'Most likely to have died because they were "just checking something"',
  'Who would walk into the Dragon Lair ten levels early and blame the lag',
  'Most likely to have lost a full backpack and gone quiet about it',
  'Who took a death the hardest',

  // ----------------------------------------------------------- the economy
  'Most likely to have been scammed in a trade',
  'Most likely to have done the scamming',
  'Who hoarded gold and never spent it on anything useful',
  'Most likely to have paid real money for something',
  'Who always had the best gear and would never say how',

  // -------------------------------------------------------------- the group
  'Who was the actual leader, whatever the guild ranks said',
  'Most likely to have gone AFK mid-hunt and come back to a corpse',
  'Who talked the most and contributed the least',
  'Most likely to have kept a spreadsheet',
  'Who would still be playing today if the rest of us had stuck with it',
  'Most likely to have quit dramatically and come back within a week',
  'Who is most nostalgic about all this',

  // --------------------------------------------------------------- tonight
  'Who has drunk the most so far',
  'Most likely to still be here at 4am',
  'Who is taking this party game the most seriously',
];

/** Prompts are plain strings; anything non-empty works. */
export const isValidPrompt = (text) => typeof text === 'string' && text.trim().length >= 3;
