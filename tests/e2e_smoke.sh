#!/usr/bin/env bash
# End-to-end smoke test against a running stack.
#   Backend expected on http://localhost:8000, frontend on http://localhost:3000.
set -euo pipefail

BACKEND="${BACKEND:-http://localhost:8000}"
FRONTEND="${FRONTEND:-http://localhost:3000}"

echo "1) Backend health"
curl -fsS "$BACKEND/api/v1/health" | grep -q '"catalog_loaded":true'
echo "   ok"

echo "2) Calculate (Chesapeake 2017-09-26 21:30)"
curl -fsS -X POST "$BACKEND/api/v1/maps/calculate" \
  -H "Content-Type: application/json" \
  -d '{"observer":{"latitude":36.7682,"longitude":-76.2875,"timezone":"America/New_York","local_datetime":"2017-09-26T21:30:00"},"sky":{"magnitude_limit":5.8}}' \
  | grep -q '"utc_datetime":"2017-09-27T01:30:00+00:00"'
echo "   ok (correct UTC conversion)"

echo "3) Preview returns SVG"
curl -fsS -X POST "$BACKEND/api/v1/maps/preview" \
  -H "Content-Type: application/json" \
  -d '{"observer":{"latitude":51.5074,"longitude":-0.1278,"timezone":"Europe/London","local_datetime":"2000-01-01T00:00:00"},"sky":{"magnitude_limit":5.0}}' \
  | grep -q '<svg'
echo "   ok"

echo "4) SVG export has mm dimensions + attachment header"
curl -fsS -D - -o /tmp/starmap_smoke.svg -X POST "$BACKEND/api/v1/maps/export/svg" \
  -H "Content-Type: application/json" \
  -d '{"observer":{"latitude":36.7682,"longitude":-76.2875,"timezone":"America/New_York","local_datetime":"2017-09-26T21:30:00"}}' \
  | grep -qi 'content-disposition: attachment'
grep -q 'width="300mm"' /tmp/starmap_smoke.svg
echo "   ok"

echo "5) Frontend serves the editor"
curl -fsS -o /dev/null -w '%{http_code}' "$FRONTEND/" | grep -q 200
echo "   ok"

echo "6) Frontend proxies API"
curl -fsS "$FRONTEND/api/v1/health" | grep -q '"status"'
echo "   ok"

echo "All smoke checks passed."
