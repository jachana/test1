"""Integration tests for the FastAPI endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

client = TestClient(create_app())


BASE_REQUEST = {
    "observer": {
        "latitude": 36.7682,
        "longitude": -76.2875,
        "timezone": "America/New_York",
        "local_datetime": "2017-09-26T21:30:00",
    },
    "sky": {"magnitude_limit": 5.8},
}


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["catalog_loaded"] is True
    assert body["catalog_stars"] > 1000


def test_calculate_returns_stars_and_metadata():
    r = client.post("/api/v1/maps/calculate", json=BASE_REQUEST)
    assert r.status_code == 200
    body = r.json()
    assert body["metadata"]["utc_datetime"] == "2017-09-27T01:30:00+00:00"
    assert body["metadata"]["stars_above_horizon"] > 500
    assert len(body["stars"]) == body["metadata"]["stars_above_horizon"]
    # Every star must be above the horizon.
    assert all(s["altitude_deg"] > 0 for s in body["stars"])


def test_preview_returns_svg_and_validation():
    r = client.post("/api/v1/maps/preview", json=BASE_REQUEST)
    assert r.status_code == 200
    body = r.json()
    assert body["svg"].startswith("<svg")
    assert "validation" in body
    assert body["star_count"] > 500


def test_export_svg_headers():
    r = client.post("/api/v1/maps/export/svg", json=BASE_REQUEST)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/svg+xml")
    assert "attachment" in r.headers["content-disposition"]
    assert "X-Validation-Ok" in r.headers


def test_export_png_returns_image():
    r = client.post("/api/v1/maps/export/png", json=BASE_REQUEST)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_invalid_timezone_returns_422():
    bad = {**BASE_REQUEST, "observer": {**BASE_REQUEST["observer"], "timezone": "Not/AZone"}}
    r = client.post("/api/v1/maps/calculate", json=bad)
    assert r.status_code == 422


def test_invalid_latitude_returns_422():
    bad = {**BASE_REQUEST, "observer": {**BASE_REQUEST["observer"], "latitude": 200.0}}
    r = client.post("/api/v1/maps/calculate", json=bad)
    assert r.status_code == 422


def test_magnitude_out_of_range_returns_422():
    bad = {**BASE_REQUEST, "sky": {"magnitude_limit": 12.0}}
    r = client.post("/api/v1/maps/calculate", json=bad)
    assert r.status_code == 422


def test_material_presets_endpoint():
    r = client.get("/api/v1/presets/materials")
    assert r.status_code == 200
    ids = {p["id"] for p in r.json()}
    assert "birch_plywood" in ids and "acrylic" in ids


def test_template_presets_endpoint():
    r = client.get("/api/v1/presets/templates")
    assert r.status_code == 200
    assert len(r.json()) >= 1


@pytest.mark.parametrize("future_date", ["2400-01-01T00:00:00"])
def test_far_future_date_supported(future_date):
    req = {**BASE_REQUEST, "observer": {**BASE_REQUEST["observer"], "local_datetime": future_date}}
    r = client.post("/api/v1/maps/calculate", json=req)
    assert r.status_code == 200
