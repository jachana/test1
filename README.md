# Tibia Idle

An idle/incremental game in the shape of [Melvor Idle](https://melvoridle.com/), built out
of [Tibia](https://www.tibia.com/)'s world, vocations and formulas. Pick a vocation, park
your character in a hunting ground or at a mining vein, and come back later to a fatter
character.

No build step, no dependencies — plain ES modules, `localStorage` saves.

## Run it

```bash
python3 -m http.server 8000     # or: npx http-server -p 8000 -c-1
# open http://localhost:8000
```

Opening `index.html` straight off disk will **not** work: browsers block ES module imports
over `file://`.

## What's in the game

| System | Detail |
| --- | --- |
| Vocations | Knight, Paladin, Sorcerer, Druid, Citizen — each with real per-level hp/mana/cap gains and skill cost multipliers |
| Combat skills | Fist, Club, Sword, Axe, Distance, Shielding, Magic Level |
| Idle skills | Fishing, Mining, Woodcutting, Cooking, Blacksmithing, Rune Making |
| Hunting | 10 areas from the Rookgaard Sewers to Hellgate, 40 creatures, weighted spawns and loot tables |
| Items | ~90 items — rapier to magic sword, leather to magic plate armor, runes, potions, food, ores, bars |
| Automation | Auto-eat, auto-potion, auto-heal spell, auto-attack spell, auto-sell junk, walk back after dying |
| Offline | Up to 12 hours of away time is replayed on load and summarised in a welcome-back screen |

## The formulas are the real ones

The point of a Tibia idle game is that the grind curves feel like Tibia, so the core maths
comes straight from the game (see `src/core/formulas.js`):

- **Experience:** `exp(level) = 50/3 · (level³ − 6·level² + 17·level − 12)` — level 8 is 4,200 exp, as it should be.
- **Skills:** every skill advances on *tries*, and the next level costs `base · factor^(skill − offset)`.
  A knight needs 50 hits for sword 10 → 11 (`factor 1.1`); a sorcerer needs the same 50 hits
  but with `factor 2.0`, so they are still at sword 20 while the knight is at 60.
- **Magic level:** `1600 · factor^ml` mana spent, with 1.1 for mages, 1.4 for paladins, 3.0 for knights.
  You raise it by *spending* mana — casting spells or making runes.
- **Damage:** `max = 0.085 · stanceFactor · weaponAttack · skill + level/5`, with Full
  Attack / Balanced / Full Defence trading damage against blocking.
- **Armour:** soaks a random slice between `0.475·armor` and `armor` off every hit.

Deliberate departures from canon, for the sake of a playable idle game: vocation hp/mana
gains start at level 2 instead of level 8, there is no death item loss (just 10% exp and
skill progress), weights are lighter than the real ones, and Mining / Woodcutting /
Blacksmithing / Cooking are invented skills — Tibia has no crafting professions.

## Code layout

```
index.html            shell; loads src/main.js as a module
src/main.js           boot: load save → replay offline time → mount UI → start engine
src/core/
  engine.js           100 ms tick loop, offline replay, autosave
  state.js            save shape, load/save/migrate/export, adventure log
  formulas.js         experience, skill tries, hp/mana/cap, damage, defence
  bus.js util.js      tiny pub/sub and formatting helpers
src/data/             pure content: items, monsters, areas, actions, spells, shops, skills, vocations
src/systems/
  player.js           levels, skill tries, regeneration, food, potions, death
  combat.js           the fight loop, loot, auto-cast, auto-return
  idle.js             gathering and production actions
  inventory.js        stacks, weight/capacity, equipment, derived stats
src/ui/
  app.js              shell, nav, routing, header, log, toasts, offline modal
  dom.js              el() / bar() / card() / button() helpers
  views/              one module per page
```

The state object is the single source of truth and is JSON-serialisable end to end; systems
mutate it, the UI reads it 10×/second and patches the DOM in place. Adding content is
usually a data edit only — a new monster is one line in `src/data/monsters.js`, a new
gathering node one line in `src/data/actions.js`.

`window.game.state` is exposed in the console for poking at a live save.

## Ideas worth building next

- Quests and the Rookgaard → mainland progression gate
- Party/summon system, or a second character slot
- Imbuements or a soul-point sink
- Fishing rods / pickaxes as tools with tiers
- A proper bank (depot) separate from the backpack
- Rare-drop announcements and a loot log tab
