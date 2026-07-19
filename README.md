# Star-Map Laser Studio

Generate **historically accurate, laser-ready custom star maps** for any
location, date, and local time. The primary output is a clean, layered **SVG** in
real-world millimetres, designed to import straight into laser software such as
LightBurn for engraving on wood, plywood, acrylic, coated metal, and similar
materials.

The core output is **deterministic vector geometry** — not a raster image.

![preview placeholder](docs/screenshot-placeholder.png)
<!-- Screenshot placeholder: run the app and capture the editor + preview. -->

## What it produces

- A circular all-sky star map (zenith-centred azimuthal projection)
- Stars sized by apparent brightness (magnitude → dot diameter)
- Optional constellation lines and labels
- Optional planets and the Moon
- A scored sky border and an outer cut boundary
- Personalised names, headline, location, coordinates, date/time
- SVG export (text converted to vector paths) + PNG preview
- Laser-safety validation warnings (feature sizes, density, out-of-bounds)

## Requirements

- Python 3.11+ (3.12 recommended), Node.js 20+
- System Cairo libraries (`libcairo2`) for PNG previews
- Internet access **once** to download the JPL ephemeris (and optionally rebuild
  the star catalogue)

## Quick start (Docker)

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/docs
```

## Local setup

```bash
# 1. Data (downloads the ~17 MB JPL ephemeris; catalogue is committed)
pip install -r backend/requirements.txt
python scripts/setup_data.py

# 2. Backend
cd backend
PYTHONPATH=. uvicorn app.main:app --reload --port 8000

# 3. Frontend (in another terminal)
cd frontend
npm install
npm run dev            # http://localhost:3000
```

## Running tests

```bash
# Backend: unit + integration + golden tests
cd backend && PYTHONPATH=. pytest

# Frontend: unit tests + production build/type-check
cd frontend && npm test && npm run build
```

## Example API request

The first milestone endpoint — astronomy only, no artwork:

```bash
curl -X POST http://localhost:8000/api/v1/maps/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "observer": {
      "latitude": 36.7682,
      "longitude": -76.2875,
      "timezone": "America/New_York",
      "local_datetime": "2017-09-26T21:30:00"
    },
    "sky": { "magnitude_limit": 5.8 }
  }'
```

Returns the resolved UTC datetime, catalogue/above-horizon star counts, a list of
visible stars (id, magnitude, altitude, azimuth, common name), and visible
planets/Moon.

Other endpoints (all under `/api/v1`): `health`, `geocode`, `maps/preview`,
`maps/export/svg`, `maps/export/png`, `presets/materials`, `presets/templates`.
Full schema at `http://localhost:8000/docs`.

## Export instructions (LightBurn)

1. Click **Download SVG** in the editor (text is converted to paths).
2. Import the SVG into LightBurn — it arrives at true millimetre size.
3. Assign operations by colour: **red** = cut (outer boundary), **blue** = score
   (sky border), **black** = fill/line engrave (stars, lines, text).
4. Test settings on scrap first. See `docs/laser-design-rules.md`.

## Known limitations (MVP)

- Star catalogue limited to magnitude ≤ 7.0 (Hipparcos subset), not full Gaia.
- 28 constellations included (all 12 zodiac signs plus prominent northern and
  southern figures); extend `data/catalog/constellation_lines.json` for more.
- Planet/Moon positions require the DE421 ephemeris (date range ~1899–2053); the
  star map itself works for any date.
- No accounts, payments, orders, direct laser control, or machine power/speed
  settings (these vary by machine/material and are intentionally out of scope).
- Single azimuthal projection; no Milky Way texture or 3D globe view.
- Geocoding uses public Nominatim (rate-limited); configure a real User-Agent.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — components & pipeline
- [`docs/astronomy.md`](docs/astronomy.md) — time, coordinates, accuracy
- [`docs/svg-format.md`](docs/svg-format.md) — layers, units, metadata
- [`docs/laser-design-rules.md`](docs/laser-design-rules.md) — engraving rules
- [`docs/data-sources.md`](docs/data-sources.md) — catalogues, ephemeris, licences
- [`docs/development.md`](docs/development.md) — dev workflow
- [`docs/deployment.md`](docs/deployment.md) — Docker & configuration

## Licence

Project code: MIT (see `LICENSE`). Bundled data and fonts use permissive licences
that allow commercial output — see `docs/data-sources.md`.
