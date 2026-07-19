# SVG Output Format

The SVG is the primary product. It is designed to import cleanly into LightBurn
and standard vector editors.

## Document

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     width="300mm" height="400mm"
     viewBox="0 0 300 400" version="1.1">
```

- Physical size in `mm`; `viewBox` uses the same numbers so **1 user unit = 1 mm**.
- No external CSS, no scripts, no embedded raster images.

## Layers (semantic groups)

Emitted in this order; colour encodes the intended laser operation.

| id | contents | fill/stroke |
|---|---|---|
| `cut-outer-boundary` | rounded rectangle at the artboard edge | stroke red, no fill |
| `score-sky-border` | the circular sky boundary | stroke blue, no fill |
| `engrave-constellations` | constellation line segments (clipped to disc) | stroke black |
| `engrave-stars` | filled circles, radius from magnitude | fill black |
| `engrave-planets` | diamonds (planets) + ringed circle (Moon) | fill black |
| `engrave-labels` | cardinal directions, optional constellation names | fill black |
| `engrave-personalization` | headline, names, location, date, coordinates, message | fill black |

## Metadata

A `<metadata>` block embeds provenance under a custom namespace:

```xml
<metadata>
  <starmap:map xmlns:starmap="https://starmap-laser.example/ns">
    <starmap:generator>starmap-laser-mvp 0.1.0</starmap:generator>
    <starmap:latitude>36.7682</starmap:latitude>
    <starmap:longitude>-76.2875</starmap:longitude>
    <starmap:timezone>America/New_York</starmap:timezone>
    <starmap:local_datetime>2017-09-26T21:30:00-04:00</starmap:local_datetime>
    <starmap:utc_datetime>2017-09-27T01:30:00+00:00</starmap:utc_datetime>
    <starmap:catalog_source>Hipparcos …</starmap:catalog_source>
    <starmap:magnitude_limit>5.8</starmap:magnitude_limit>
    <starmap:projection>azimuthal-equidistant (zenith-centred)</starmap:projection>
    <starmap:ephemeris_source>JPL DE421</starmap:ephemeris_source>
    …
  </starmap:map>
</metadata>
```

No private server information is exposed.

## Text

- **Preview:** normal `<text>` elements (fast; uses bundled font families).
- **Export:** with `convert_text_to_paths: true`, each string becomes `<path>`
  outlines so the engraving never depends on machine-installed fonts.

## What is deliberately avoided

Blur, glow, drop-shadows, gradients, transparency-dependent effects, embedded
raster images, duplicate/hidden geometry, zero-length paths, and external CSS.
The validator checks for several of these.
