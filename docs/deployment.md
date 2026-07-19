# Deployment

## Docker Compose (recommended)

```bash
docker compose up --build
```

- Backend → http://localhost:8000 (API + `/docs`)
- Frontend → http://localhost:3000

The backend image runs `scripts/setup_data.py` during build, which downloads the
JPL ephemeris into the image (network required at build time). The star
catalogue is already committed, so no other data download is needed.

## Configuration (environment variables)

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose | Default |
|---|---|---|
| `STARMAP_CORS_ORIGINS` | comma-separated allowed origins | localhost:3000 |
| `STARMAP_GEOCODE_USER_AGENT` | Nominatim User-Agent (set a real contact) | placeholder |
| `STARMAP_GEOCODE_URL` | geocoding endpoint | Nominatim |
| `STARMAP_MAX_REQUEST_BYTES` | request body cap | 65536 |
| `BACKEND_URL` | URL the frontend proxies `/api/*` to | http://localhost:8000 |

## Production notes

- Put the backend behind a reverse proxy (TLS termination, request limits).
- Respect the OpenStreetMap Nominatim usage policy or switch to a hosted
  geocoder; set a descriptive `STARMAP_GEOCODE_USER_AGENT`.
- The star catalogue is loaded once per process and cached in memory; run
  multiple Uvicorn workers for concurrency (each holds its own cache).
- PostgreSQL is optional and not required for the MVP (no persistence yet).
- The DE421 ephemeris limits planet/Moon rendering to ~1899–2053; swap in a
  longer ephemeris (e.g. DE440) by updating `scripts/setup_data.py` and
  `STARMAP` ephemeris path if you need a wider range.
