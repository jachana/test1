// Idle actions. Tibia only ever had two things you could sit and repeat:
// fishing, and making runes. Everything else you did was hunting or questing.
//
//   req     skill level required
//   ms      base duration of one action
//   tries   skill tries granted per completed action
//   inputs  consumed items  [{ item, qty }]
//   out     produced items  [{ item, chance, lo, hi }]
//   mana    mana spent per action (also trains Magic Level)

const out = (list) => list.map(([item, chance = 1, lo = 1, hi = lo]) => ({ item, chance, lo, hi }));
const inp = (list) => list.map(([item, qty = 1]) => ({ item, qty }));

export const ACTIONS = {
  // Fishing is the no-risk, no-supplies alternative to hunting: it pays roughly
  // a fifth of what the hunting ground you could reach pays, and it cannot kill
  // you. Two things were wrong with it. The deep water paid LESS than the falls
  // one tier below, so the last thing you unlocked was a downgrade; and every
  // tier was pure fish, which meant fishing was solved the moment your food bar
  // was full — you need sixty food-minutes an hour and the shallows made five
  // thousand. The deep water now has something worth waiting for in it.
  fishing: [
    { id: 'fish_shallows', name: 'Rookgaard Shallows', icon: '🌊', req: 10, ms: 2800, tries: 1, out: out([['raw_fish', 0.85, 1, 2]]) },
    { id: 'fish_river', name: 'Venore River', icon: '🏞️', req: 25, ms: 3200, tries: 1, out: out([['raw_fish', 0.5], ['raw_salmon', 0.55, 1, 2]]) },
    {
      id: 'fish_lake', name: 'Carlin Lake', icon: '🎏', req: 45, ms: 3800, tries: 2,
      out: out([['raw_salmon', 0.5], ['northern_pike', 0.55, 1, 2], ['white_pearl', 0.004]]),
    },
    {
      id: 'fish_falls', name: 'Edron Falls', icon: '🌈', req: 65, ms: 4400, tries: 3,
      out: out([['northern_pike', 0.5], ['rainbow_trout', 0.45], ['white_pearl', 0.005], ['small_ruby', 0.003]]),
    },
    {
      id: 'fish_deep', name: 'Fibula Deep Water', icon: '🔷', req: 85, ms: 6000, tries: 4,
      out: out([['rainbow_trout', 0.7, 1, 2], ['northern_pike', 0.5], ['white_pearl', 0.008], ['small_ruby', 0.005], ['small_diamond', 0.002]]),
    },
  ],
  runecrafting: [
    { id: 'rune_light_healing', name: 'Light Healing Rune', icon: '💊', req: 1, reqMagic: 1, ms: 2500, tries: 1, mana: 20, inputs: inp([['blank_rune', 1]]), out: out([['rune_light_healing', 1, 1, 2]]) },
    { id: 'rune_fireball', name: 'Fireball Rune', icon: '🔥', req: 5, reqMagic: 4, ms: 3000, tries: 2, mana: 60, inputs: inp([['blank_rune', 1]]), out: out([['rune_fireball', 1, 1, 2]]) },
    { id: 'rune_intense_healing', name: 'Intense Healing Rune', icon: '💊', req: 12, reqMagic: 8, ms: 3400, tries: 3, mana: 120, inputs: inp([['blank_rune', 1]]), out: out([['rune_intense_healing', 1]]) },
    { id: 'rune_great_fireball', name: 'Great Fireball Rune', icon: '☄️', req: 20, reqMagic: 12, ms: 3800, tries: 4, mana: 240, inputs: inp([['blank_rune', 1]]), out: out([['rune_great_fireball', 1]]) },
    { id: 'rune_explosion', name: 'Explosion Rune', icon: '💥', req: 28, reqMagic: 16, ms: 4200, tries: 5, mana: 350, inputs: inp([['blank_rune', 1]]), out: out([['rune_explosion', 1]]) },
    { id: 'rune_ultimate_healing', name: 'Ultimate Healing Rune', icon: '💖', req: 36, reqMagic: 20, ms: 4600, tries: 6, mana: 400, inputs: inp([['blank_rune', 1]]), out: out([['rune_ultimate_healing', 1]]) },
    { id: 'rune_sudden_death', name: 'Sudden Death Rune', icon: '💀', req: 48, reqMagic: 25, ms: 5200, tries: 8, mana: 985, inputs: inp([['blank_rune', 1]]), out: out([['rune_sudden_death', 1]]) },
  ],
};

export function getAction(skillId, actionId) {
  return ACTIONS[skillId]?.find((a) => a.id === actionId) ?? null;
}

export const IDLE_SKILLS = Object.keys(ACTIONS);
