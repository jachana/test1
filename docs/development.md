# Development

## Prerequisites

- Python 3.11+ (3.12 recommended)
- Node.js 20+
- System Cairo libraries for PNG preview (`libcairo2`); on Debian/Ubuntu:
  `sudo apt-get install libcairo2`.

## First-time data setup

The star catalogue CSV is committed. The JPL ephemeris (17 MB) is not — download
it once:

```bash
pip install -r backend/requirements.txt
python scripts/setup_data.py
```

## Backend

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

Run tests:

```bash
cd backend
PYTHONPATH=. pytest            # unit + integration + golden
```

## Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:3000  (proxies /api to :8000)
npm test                       # vitest unit tests
npm run build                  # production build + type-check
```

Set `BACKEND_URL` if the backend is not on `http://localhost:8000`.

## Project layout & conventions

- Astronomy/SVG logic lives in `backend/app/core` and `backend/app/services`,
  never in route handlers or React components.
- Units are explicit in variable names (`_mm`, `_deg`, `_mas_yr`).
- Deterministic output: given the same request, the SVG is byte-stable (aside
  from the metadata creation timestamp).

## Regenerating the catalogue

```bash
python scripts/build_catalog.py   # rebuilds data/catalog/hip_bright.csv
```

Edit `data/catalog/star_names.json` to add common names, or
`data/catalog/constellation_lines.json` to add constellations (endpoints are HIP
ids that must exist in the catalogue).
