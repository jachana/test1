# Tests

Test suites live close to their code:

- **Backend** (`backend/tests/`, pytest): unit tests (time conversion, DST,
  coordinate transform, horizon filtering, projection orientation/rotation,
  magnitude→dot mapping, circular clipping, constellation filtering, SVG
  dimensions/layer ids, validation warnings, filename generation), integration
  tests (geocode/preview/SVG/PNG endpoints, invalid inputs), and three golden
  cases (Chesapeake, London, Sydney).

  ```bash
  cd backend && PYTHONPATH=. pytest
  ```

- **Frontend** (`frontend/lib/*.test.ts`, Vitest): pure UI logic (star-density
  mapping). Production build additionally type-checks the whole app.

  ```bash
  cd frontend && npm test && npm run build
  ```

## End-to-end smoke test

`tests/e2e_smoke.sh` starts nothing itself; it exercises a running stack
(backend on :8000, frontend on :3000) end to end.

```bash
# Terminal 1: backend    (cd backend && PYTHONPATH=. uvicorn app.main:app --port 8000)
# Terminal 2: frontend   (cd frontend && npm run dev)
# Terminal 3:
bash tests/e2e_smoke.sh
```
