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
  fishing: [
    { id: 'fish_shallows', name: 'Rookgaard Shallows', icon: '🌊', req: 10, ms: 2800, tries: 1, out: out([['raw_fish', 0.75]]) },
    { id: 'fish_river', name: 'Venore River', icon: '🏞️', req: 25, ms: 3600, tries: 1, out: out([['raw_fish', 0.5], ['raw_salmon', 0.4]]) },
    { id: 'fish_lake', name: 'Carlin Lake', icon: '🎏', req: 45, ms: 4500, tries: 1, out: out([['raw_salmon', 0.4], ['northern_pike', 0.4]]) },
    { id: 'fish_falls', name: 'Edron Falls', icon: '🌈', req: 65, ms: 5500, tries: 1, out: out([['northern_pike', 0.4], ['rainbow_trout', 0.35]]) },
    { id: 'fish_deep', name: 'Fibula Deep Water', icon: '🔷', req: 85, ms: 7000, tries: 1, out: out([['rainbow_trout', 0.5], ['northern_pike', 0.3]]) },
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
