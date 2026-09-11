# Tibia Idle

An idle/incremental game in the shape of [Melvor Idle](https://melvoridle.com/), built out
of Tibia's world, vocations and formulas — aimed squarely at the **7.6 era**, in both
content and looks: beveled brown chrome, sunken black panels, flat health bars, bitmap
type, square corners.

You start the way everyone did: a vocationless citizen on Rookgaard with a club and a
wooden shield. Reach level 8, choose a vocation, and the ship to the mainland opens up.
Park the character in a hunting ground or at a mining vein and come back later.

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
| Vocations | Citizen until level 8, then Knight, Paladin, Sorcerer or Druid — permanent, and it gates spells, rune making and the mainland |
| Combat skills | Fist, Club, Sword, Axe, Distance, Shielding, Magic Level |
| Idle skills | Fishing and Rune Making — the only two things Tibia ever let you sit and repeat |
| Quests | 16 one-time trips from The Bear Room to Ferumbras' Tower; two of them are the only way into Drefia and Hellgate, one opens the djinn trader, and the Annihilator makes you pick your chest before you walk in |
| Gear comparison | Every wearable item is measured against what you have on — max hit, armor, defence, attack speed, skill bonuses — as a whole-character before/after, so it knows a rapier beats a battle axe when your sword skill is higher. Upgrades are marked in the backpack, tagged in shops, and called out in the log when they drop |
| Hunting guide | Every area is costed against your actual character: exp/hour, gold/hour, seconds-to-kill per creature, damage taken, supplies needed and a safe/comfortable/risky/deadly verdict |
| Hunting | 12 areas from the Rookgaard Sewers to Hellgate — Cyclopolis, Drefia, Deep Kazordoon — with 43 creatures, weighted spawns and loot tables |
| Items | 173 items — rapier to magic sword, leather to golden legs, runes, potions, food, gems |
| Automation | Auto-eat, auto-potion, auto-heal spell, auto-attack spell, auto-sell junk, walk back after dying (stops after three deaths without a kill) |
| Offline | Up to 12 hours of away time is replayed on load and summarised in a welcome-back screen |

## The formulas are the real ones

The point of a Tibia idle game is that the grind curves feel like Tibia, so the core maths
comes straight from the game (see `src/core/formulas.js`):

- **Experience:** `exp(level) = 50/3 · (level³ − 6·level² + 17·level − 12)` — level 8 is 4,200 exp, as it should be.
- **Health, mana and capacity:** levels 2-8 are vocationless rookie levels worth +5 hp / +5 mana / +10 oz, so every level 8 character lands on exactly **185 hp, 35 mana, 470 oz** before the vocation starts paying out at level 9.
- **Skills:** every skill advances on *tries*, and the next level costs `base · factor^(skill − offset)`.
  A knight needs 50 hits for sword 10 → 11 (`factor 1.1`); a sorcerer needs the same 50 hits
  but with `factor 2.0`, so they are still at sword 20 while the knight is at 60.
- **Magic level:** `1600 · factor^ml` mana spent, with 1.1 for mages, 1.4 for paladins, 3.0 for knights.
  You raise it by *spending* mana — casting spells or making runes.
- **Damage:** `max = 0.085 · stanceFactor · weaponAttack · skill + level/5`, with Full
  Attack / Balanced / Full Defence trading damage against blocking.
- **Armour:** soaks a random slice between `0.475·armor` and `armor` off every hit.

Deliberate departures from canon, for the sake of a playable idle game: there is no death
item loss (just 10% exp and skill progress), weights are lighter than the real ones,
and health and mana regenerate four times faster between spawns and in larger chunks at
high level (an idle hunt cannot restock potions). There are no crafting professions,
because Tibia never had any: progression outside hunting is quests.

Content is kept to roughly what existed in 7.6: no Tiquanda, no Ankrahmun, no ice
islands — so no hydras, serpent spawns or frost dragons. The deep end is Behemoths, Black
Knights, Heroes, Warlocks and Demons.

## Code layout

```
index.html            shell; loads src/main.js as a module
src/main.js           boot: load save → replay offline time → mount UI → start engine
src/core/
  engine.js           100 ms tick loop, offline replay, autosave
  state.js            save shape, load/save/migrate/export, adventure log
  formulas.js         experience, skill tries, hp/mana/cap, damage, defence
  bus.js util.js      tiny pub/sub and formatting helpers
src/data/             pure content: items, monsters, areas, quests, actions, spells, shops, skills, vocations
src/fonts.css         Silkscreen (SIL OFL 1.1) embedded, so the client looks right offline
src/systems/
  player.js           levels, skill tries, regeneration, food, potions, death
  combat.js           the fight loop, loot, auto-cast, auto-return
  idle.js             fishing and rune making
  quests.js           quest runs, chests, prerequisites and unlocks
  guide.js            hunting-ground estimates: exp/h, gp/h, danger, notable drops
  inventory.js        stacks, weight/capacity, equipment, derived stats
src/ui/
  app.js              shell, nav, routing, header, log, toasts, offline modal
  dom.js              el() / bar() / card() / button() helpers
  views/              one module per page (incl. the level 8 vocation chooser)
tools/check-data.mjs      cross-checks every id in src/data — run it after editing content
tools/build-artifact.mjs  bundles the game into one self-contained HTML file
tools/sprite-picker.html  click tiles on a sprite sheet to build src/data/sprites.js
tools/import-otserv.mjs   pulls creature stats and loot tables from an OTServ data dump
```

The state object is the single source of truth and is JSON-serialisable end to end; systems
mutate it, the UI reads it 10×/second and patches the DOM in place. Adding content is
usually a data edit only — a new monster is one line in `src/data/monsters.js`, a new
gathering node one line in `src/data/actions.js`.

`window.game.state` is exposed in the console for poking at a live save.

Run `node tools/check-data.mjs` after touching content; it catches a typo'd item id in a
loot table before the game does.

## Where the numbers come from

Creature health, experience, armour, defence and **loot tables with their real drop
rates** are imported from the monster XML in
[OpenTibiaArchives/otserv](https://github.com/OpenTibiaArchives/otserv) rather than typed
from memory — a demon drops magic plate armor at 0.13% because that is what the server
file says. Re-run the import after adding creatures or items:

```bash
git clone --depth 1 https://github.com/OpenTibiaArchives/otserv /tmp/otserv
node tools/import-otserv.mjs /tmp/otserv --dry   # shows what maps and what it would skip
node tools/import-otserv.mjs /tmp/otserv
```

It rewrites only the stats and loot on each `M(...)` line. Damage, attack speed and gold
stay hand-tuned for idle pacing — server gold is capped at 100 coins per stack and split
across bags, so importing it would read a demon as carrying 100 gold. Loot the game has
no item for is reported and skipped, which conveniently keeps post-7.6 gear out. That
dump targets 8.7, so a handful of its drops are an OT server's interpretation rather than
7.6 canon.

## Sprites

Items fall back to emoji, but the game can draw a real Tibia item sheet instead. Note
that no open-source repo ships the game sprites — not OTServ, not
[otclient](https://github.com/edubart/otclient) — because they live in the client's
`Tibia.spr`/`Tibia.dat`, which you have to supply yourself. Put the sheet at
`assets/items.png`, open `tools/sprite-picker.html` (through the same local
server), and click each tile: it hands you the `itemId: tileIndex,` lines to paste into
`src/data/sprites.js`. Anything you have not mapped keeps its emoji, so a partial mapping
is fine.

## Ideas worth building next

- Promotion at level 20 (Elite Knight, Royal Paladin, Master Sorcerer, Elder Druid)
- More quests: Djinn war (Efreet vs Marid), Explorer Society, Dark Cathedral bonelords
- Party/summon system, or a second character slot
- A proper depot separate from the backpack
- Rare-drop announcements and a loot log tab
