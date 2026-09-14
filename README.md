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
| Quests | 16 one-time trips from The Bear Room to Ferumbras' Tower; three of them are the only way into Drefia, Hellgate and the citadel, one opens the djinn trader, and the Annihilator makes you pick your chest before you walk in. Each is worth a third of a level at the start of the chain, rising to three quarters for the last two |
| Gear comparison | Every wearable item is measured against what you have on — max hit, armor, defence, attack speed, skill bonuses — as a whole-character before/after, so it knows a rapier beats a battle axe when your sword skill is higher. Upgrades are marked in the backpack, tagged in shops, and called out in the log when they drop |
| Hunting guide | Every area is costed against your actual character: exp/hour, gold/hour, seconds-to-kill per creature, damage taken, supplies needed and a safe/comfortable/risky/deadly verdict |
| Hunting | 13 areas from the Rookgaard Sewers to Ferumbras' Citadel — Cyclopolis, Drefia, Deep Kazordoon, Hellgate — with 46 creatures, weighted spawns and loot tables. Every area has an identity: the orc fortress is loot, the desert is gold, the ghostlands are experience, the citadel is the only place golden legs and a demon shield actually drop |
| Champions | About one spawn in forty comes up bigger, hits harder, is worth three times as much and rolls its loot table twice |
| Bestiary | What you know about a creature is what you have killed of it. Kill tiers reveal its statistics, then its damage and armour, then its full loot table — and the last three pay, up to +10% experience and +10% drop chance from that creature |
| Soul board | Every kill is a soul point, a champion is eight, and they buy nine permanent perks. The only progression a death cannot take back; the whole board is about 55–110 hours of hunting |
| Items | 173 items — rapier to magic sword, leather to golden legs, runes, potions, food, gems — in five rarities derived from value |
| Automation | Auto-eat, auto-potion (one every two seconds, and it drinks the cheapest one that covers the wound), auto-heal spell, auto-attack spell, auto-sell junk, walk back after dying (stops after three deaths inside ten minutes, or when the potions run out) |
| Offline | Up to 12 hours of away time is replayed on load and summarised in a welcome-back screen — what you earned, what dropped, and what stopped you |
| Sound | Short blips synthesised with OscillatorNode, since there are no asset files. Off by default |

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
- **Damage:** `max = 0.085 · weaponAttack · skill / attackFactor + level/5`. The stance is a
  *divisor*, as it is in the real client — Full Attack 1.0, Balanced 1.2, Full Defence 2.0 —
  and the same three multiply your defence by 0.5, 1.0 and 1.5. Treating it as a multiplier
  instead handed out 2.4× Tibia's damage, and nothing in the game could kill anybody past
  about level 14.
- **Armour:** soaks a random slice between `0.475·armor` and `armor` off every hit.

Deliberate departures from canon, for the sake of a playable idle game: there is no death
item loss (just 10% exp and skill progress), weights are lighter than the real ones,
and health and mana regenerate four times faster between spawns and in larger chunks at
high level (an idle hunt cannot restock potions). There are no crafting professions,
because Tibia never had any: progression outside hunting is quests.

Two more, both about a character nobody is watching. Potions carry a two-second exhaust,
or automation would empty a backpack into a single blow and make death impossible; and a
character who runs out of potions walks home rather than dying three times in a row.

Content is kept to roughly what existed in 7.6: no Tiquanda, no Ankrahmun, no ice
islands — so no hydras, serpent spawns or frost dragons. The deep end is Behemoths, Black
Knights, Heroes, Warlocks and Demons, and past them Orshabaal, Ghazbaran and Ferumbras,
who is the one thing in the game that comes back after you kill him.

The two casters share Tibia's stat block, which is correct for 7.6, but not its spellbook:
a druid that held every sorcerer spell but three was a strictly worse sorcerer. They split
on element — the sorcerer keeps fire and energy and hits hardest, the druid takes the ice
line, gets Mass Healing, and multiplies every heal it casts.

## The LAN party game

`party/` is a second game that runs on the same `src/data` — a Jackbox-shaped
quiz for a room with one television and a pile of phones.

```bash
npm run party
```

It prints two addresses: `/host` goes on the TV, the bare one goes on everyone's
phone. No installs, no accounts, no internet — plain Node, no dependencies, and
Server-Sent Events instead of WebSockets, because this runs on a laptop at a LAN
party where the wifi is bad and nobody is going to `npm install` anything at
11pm.

Three rounds, and the order matters:

| Round | What happens | Why it is in that slot |
| --- | --- | --- |
| 🪙 **Price Check** | An item appears; everyone types what a trader pays for it. Closest takes a bonus. | No knowledge gate — the friend who quit in 2006 still remembers a demon armor was "a lot", and gets to be outraged at the real number. Warms the room up. |
| 💀 **Whose Loot Is This?** | Four items, one of which that creature never drops. Fast, and faster is worth more. | The only round that rewards actually knowing things, so it is short and it goes in the middle. Real OTServ drop tables; the impostor always comes from a creature of a similar tier, or it answers itself. |
| 🍻 **Who Among Us** | "Most likely to have died to a rotworm at a shamefully high level." Everyone votes for each other. | There is no right answer. The score is a scaffold for the argument, and this is the round the evening is actually for. |

The host screen has exactly one control — **space** moves everything along —
plus `S` for standings, `A` to add a prompt somebody just thought of, and `R` to
start over. At the final scores space deliberately does nothing, because
somebody will lean on it while the room is still reading the board.

**Edit `party/prompts.mjs` before the party.** The prompts that land are the ones
about your specific friends, not the generic ones shipped in that file. A good
prompt has at least two defensible answers: "who was the best player" is a fact
and dies instantly, "who would ding level 8 and walk straight into the Minotaur
Caves" takes twenty minutes to settle.

Phones keep their seat through a locked screen, a dead battery or a reload, and
a player whose phone forgot everything can take their own name — and score —
back. A round nobody has enough people for is skipped rather than played.

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
                      — shared with party/, which is why it holds no game logic
src/fonts.css         Silkscreen (SIL OFL 1.1) embedded, so the client looks right offline
src/systems/
  player.js           levels, skill tries, regeneration, food, potions, death
  combat.js           the fight loop, loot, auto-cast, auto-return
  idle.js             fishing and rune making
  quests.js           quest runs, chests, prerequisites and unlocks
  guide.js            hunting-ground estimates: exp/h, gp/h, danger, notable and exclusive drops
  bestiary.js         kill tiers: what you have earned the right to know, and what it pays
  perks.js            the soul board — souls in, permanent effects out
  compare.js          whole-character before/after for any wearable item
  inventory.js        stacks, weight/capacity, equipment, derived stats
src/ui/
  app.js              shell, nav, routing, header, log, toasts, offline modal
  dom.js              el() / bar() / card() / button() / kvList() helpers
  sound.js            OscillatorNode blips; nothing is constructed until the first one plays
  views/              one module per page (incl. the level 8 vocation chooser)
party/
  server.mjs          dependency-free HTTP + SSE; prints the address to read out
  game.mjs            the state machine, free of I/O so a test can play it out
  rounds.mjs          question generation from src/data
  prompts.mjs         the Who Among Us prompts — EDIT THIS ONE
  host.html/.js       the television
  player.html/.js     the phone
tools/check-data.mjs      cross-checks every id in src/data — run it after editing content
tools/balance.mjs         hunts every area for a simulated hour at fifteen levels
tools/smoke.mjs           loads the real page in a browser and fails on any console error
tools/build-artifact.mjs  bundles the game into one self-contained HTML file
tools/sprite-picker.html  click tiles on a sprite sheet to build src/data/sprites.js
tools/import-otserv.mjs   pulls creature stats and loot tables from an OTServ data dump
```

The state object is the single source of truth and is JSON-serialisable end to end; systems
mutate it, the UI reads it 10×/second and patches the DOM in place. Adding content is
usually a data edit only — a new monster is one line in `src/data/monsters.js`, a new
gathering node one line in `src/data/actions.js`.

`window.game.state` is exposed in the console for poking at a live save.

Run `npm test` after touching anything: 43 tests that drive the engine headless, plus
`tools/check-data.mjs`, which catches a typo'd item id in a loot table before the game does.

## Balancing

Twelve of the thirteen areas used to be a menu where six were never the right answer.
`tools/balance.mjs` is what fixed that and is what to re-run after touching a creature, a
multiplier or a formula:

```bash
node tools/balance.mjs            # one simulated hour per area, per level band
node tools/balance.mjs 3          # three hours, for tighter numbers
node tools/balance.mjs 1 demona   # just that area
```

It hunts every area for a simulated hour at fifteen levels with the gear a character of
that level plausibly has, and prints experience, gold, deaths, potions drunk, and how far
the hunting guide's prediction sits from the measurement — that last column should stay
near 1.00, and a drift in it means the guide and the fight have come apart. It finishes
with the best hunt and the best gold at each level, and names any area that is neither,
and is not the only source of something worth having. Every `req` in `src/data/areas.js`
is the lowest level at which that run finishes the hour alive.

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

Items fall back to emoji, but the game can draw real Tibia sprites instead. No
open-source repo ships them — not OTServ, not
[otclient](https://github.com/edubart/otclient) — because they live in the client's
`Tibia.spr`/`Tibia.dat`, so you supply your own dump.

**The ids in a sprite dump are a trap.** Dumps are named after the *client* object id of
whatever version they were ripped from, and that id space is not the *server* id space in
any `items.xml` — nor is it stable between client versions, because CipSoft inserted items
over time. Mapping a dump by name through items.xml looks like it works and quietly
produces a Mastermind Shield that renders as a bunch of bananas. If your dump happens to
share an id space with a server's `items.otb`, `tools/import-sprites.mjs` will do the job
automatically; verify a handful of the results before trusting it.

Otherwise map by eye, which is quick with the picker:

1. Put the PNGs somewhere under the repo, e.g. `tmp-sprites/`
2. Open `tools/sprite-picker.html` through the local server
3. It shows one item at a time and the whole sprite folder as a grid — click the match,
   press <kbd>S</kbd> to skip, <kbd>Z</kbd> to undo
4. Copy the two outputs into `src/data/sprites.js` and `src/sprites.css`

Anything unmapped keeps its emoji, so a partial mapping renders fine — map the weapons and
armour you actually see and leave the junk on emoji.

## Ideas worth building next

- Promotion at level 20 (Elite Knight, Royal Paladin, Master Sorcerer, Elder Druid)
- More quests: Djinn war (Efreet vs Marid), Explorer Society, Dark Cathedral bonelords
- Party/summon system, or a second character slot
- A proper depot separate from the backpack
- Rare-drop announcements and a loot log tab
