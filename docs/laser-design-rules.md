# Laser Design Rules

## Why vector output

Lasers cut and engrave by moving along **paths**. A vector SVG gives the machine
exact, resolution-independent geometry: crisp circles for stars, clean lines for
constellations, and true physical dimensions in millimetres. A raster (PNG/JPG)
would force the laser into a dithered scan of pixels — fuzzy, slower, and
resolution-bound. This project therefore produces deterministic vector geometry
as its primary output; PNG is only a screen preview.

## Real-world units & layers

The SVG declares `width`/`height` in `mm` with a matching `viewBox`, so 1 user
unit = 1 mm and the design imports at true size. Geometry is grouped into
semantic layers, and colour is used to separate laser operations (the convention
LightBurn expects):

| Group id | Colour | Typical operation |
|---|---|---|
| `cut-outer-boundary` | red | Cut |
| `score-sky-border` | blue | Score / line |
| `engrave-stars`, `engrave-planets`, `engrave-constellations`, `engrave-labels`, `engrave-personalization` | black | Fill / line engrave |

## Minimum feature size

Very small features do not survive engraving — the beam has a finite kerf and
materials char or blow out fine detail. The validator warns (it does not force)
when features fall below sensible defaults:

- Dot diameter < **0.25 mm**
- Line width < **0.15 mm**
- Text height < **3 mm**
- Edge-to-edge gap < **0.20 mm**
- More than **3,000** stars in one design (crowding / burn-together)

Material presets tighten or relax these (coated metal resolves finer detail than
MDF).

## Text-to-path conversion

Export converts every text string to vector outlines using bundled, embeddable
fonts. This guarantees the design looks identical regardless of what fonts are
installed on the machine running the laser software. The live preview may use
normal SVG `<text>` for speed; the downloaded SVG uses paths.

## Duplicate-path risks

Overlapping or duplicate paths make a laser burn the same line twice — scorching
the material and wasting time. The generator avoids emitting duplicate or
zero-length geometry, and the validator reports any duplicates it finds.

## Fill engraving vs line engraving

- **Line engraving** follows a stroke once (constellation lines, the sky border).
- **Fill engraving** darkens an enclosed area (filled star dots, solid text).

Stars are filled circles; the Moon marker is an open ring to stay distinct and
reduce burn. Choose the operation per colour/layer in your laser software.

## Why power and speed are not universal

This tool never outputs laser power or speed settings. Correct settings depend on
your specific machine, tube wattage, lens, material, coating, focus height, and
air assist — the same file needs very different settings on different setups. The
presets here are **design** recommendations (feature sizes), not machine
settings. Always test on scrap first.
