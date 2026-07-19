# Data Sources & Licensing

All bundled data uses sources that permit redistribution and commercial output.

## Star catalogue — Hipparcos

- **Source:** Hipparcos Main Catalogue (ESA, 1997), retrieved via
  [Skyfield](https://rhodesmill.org/skyfield/)'s `skyfield.data.hipparcos` loader
  (the original `hip_main.dat`).
- **Bundled subset:** `data/catalog/hip_bright.csv` — all stars with visual
  magnitude ≤ 7.0 (15,537 stars), with fields `id` (HIP number), `ra_deg`,
  `dec_deg`, `mag`, `pm_ra_mas_yr`, `pm_dec_mas_yr`, `common_name`.
- **Epoch:** positions are ICRS at catalogue epoch J1991.25; the pipeline applies
  proper motion and precession to the observation date.
- **Regenerate:** `python scripts/build_catalog.py`.
- **Licence:** The Hipparcos catalogue is published by ESA as public scientific
  data and is freely redistributable. Star coordinates and magnitudes are facts,
  not copyrightable.

## Common star names

- `data/catalog/star_names.json` maps HIP numbers to IAU-approved common proper
  names (Sirius, Vega, Polaris, …). These names are in the public domain.

## Constellation lines

- **Source:** `data/catalog/constellation_lines.json` — hand-authored
  stick-figure line segments for 14 of the most recognisable constellations,
  with endpoints referenced by HIP number.
- **Licence:** Authored originally for this project and released under the
  project's MIT licence. Based on the classic public-domain Western star-figure
  conventions; no third-party dataset is redistributed.
- Extendable: add constellations by appending to the JSON. Endpoints must be HIP
  ids present in `hip_bright.csv`; missing/​below-horizon endpoints are skipped
  automatically.

## Planetary / lunar ephemeris — JPL DE421

- **Source:** NASA JPL Development Ephemeris DE421 (`de421.bsp`), fetched by
  Skyfield during setup into `data/ephemeris/`.
- **Coverage:** ~1899–2053. Outside this range the star map still renders; only
  solar-system bodies are omitted.
- **Licence:** Produced by NASA/JPL and freely usable. Not committed to the
  repository (17 MB) — downloaded by `python scripts/setup_data.py`.

## Fonts

See [`backend/app/fonts/LICENSES.md`](../backend/app/fonts/LICENSES.md). All
three bundled fonts (Great Vibes, DejaVu Sans, DejaVu Serif) permit embedding
and commercial use.
