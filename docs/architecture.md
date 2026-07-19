# Architecture

A monorepo with a Python/FastAPI backend (all astronomy + SVG logic) and a
Next.js frontend (editor + live preview).

```
/
  backend/            FastAPI app + astronomy/SVG core + tests
    app/
      core/           domain logic (no HTTP): timeconv, astronomy, projection,
                      starsize, catalog, constellations, planets, svg,
                      validation, fonts
      services/       orchestration: pipeline, render, geocode, presets
      models/         Pydantic schemas
      api/            thin FastAPI routers
      fonts/          bundled, embeddable fonts
    tests/            pytest unit + integration + golden tests
  frontend/           Next.js + React + TypeScript + Tailwind editor
  data/               bundled catalogue, constellation lines, presets, ephemeris
  scripts/            build_catalog.py, setup_data.py
  docs/               this documentation set
```

## Pipeline stages (deliberately separated)

1. **Astronomy calculation** — `services/pipeline.py`: resolve time → UTC, load
   catalogue, apply proper motion + precession, transform to Alt/Az, filter to
   above-horizon, compute planets/Moon. Cached (see below).
2. **Projection** — `core/projection.py`: Alt/Az → millimetre x/y on the disc,
   with circular clipping.
3. **Artwork layout** — `core/svg.py`: place stars, planet markers, constellation
   lines, text blocks; resolve canvas/disc geometry.
4. **SVG serialisation** — `core/svg.py`: emit layered, unit-correct SVG.
5. **Export conversion** — `core/fonts.py` (text→path) and `services/render.py`
   (`cairosvg` PNG preview).

Keeping these separate means each is independently testable, and layout/text
changes never trigger an astronomy recompute.

## Caching

`_compute_scene_cached` is an LRU keyed on rounded latitude/longitude, UTC
datetime, magnitude limit, and the selected body set — the quantities that
change the physical sky. Text, layout, engraving, and personalisation are **not**
in the key, so editing a name or resizing the canvas reuses the cached sky.

## Request flow

```
Browser (debounced) ──POST /api/v1/maps/preview──▶ FastAPI route
   route ─▶ RenderBundle ─▶ compute_scene (cached) ─▶ build_svg ─▶ validate
   ◀── { svg, validation, metadata, star_count } ──
```

## Security posture

- All inputs validated by Pydantic (latitude/longitude bounds, magnitude range,
  canvas limits).
- Request body size capped by middleware.
- Geocoder: configurable User-Agent, process-wide 1 req/s rate limit, timeout.
- Filenames sanitised (ASCII-fold + allow-list) — no path traversal.
- Fonts selectable only by fixed key; no arbitrary file paths from users.
- No shell execution from request parameters; CORS origins from env.
