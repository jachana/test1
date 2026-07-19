"""Geocoding via OpenStreetMap Nominatim, plus timezone resolution.

Applies a simple process-wide rate limit (Nominatim's usage policy is max 1
request/second), a configurable User-Agent, and a request timeout. The timezone
for a coordinate is resolved locally with ``timezonefinder`` (no network).
"""

from __future__ import annotations

import threading
import time

import httpx
from timezonefinder import TimezoneFinder

from ..config import get_settings

_tf = TimezoneFinder()
_rate_lock = threading.Lock()
_last_request_ts = 0.0


class GeocodeError(RuntimeError):
    pass


def timezone_for(latitude: float, longitude: float) -> str:
    tz = _tf.timezone_at(lat=latitude, lng=longitude)
    if tz is None:
        tz = _tf.closest_timezone_at(lat=latitude, lng=longitude)
    return tz or "UTC"


def _respect_rate_limit(min_interval_s: float) -> None:
    global _last_request_ts
    with _rate_lock:
        elapsed = time.monotonic() - _last_request_ts
        if elapsed < min_interval_s:
            time.sleep(min_interval_s - elapsed)
        _last_request_ts = time.monotonic()


def geocode(query: str) -> dict:
    """Resolve a place name to display_name, latitude, longitude, timezone."""
    settings = get_settings()
    _respect_rate_limit(settings.geocode_rate_limit_s)

    headers = {"User-Agent": settings.geocode_user_agent}
    params = {"q": query, "format": "jsonv2", "limit": 1}
    try:
        resp = httpx.get(
            settings.geocode_url,
            params=params,
            headers=headers,
            timeout=settings.geocode_timeout_s,
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise GeocodeError(f"Geocoding request failed: {exc}") from exc

    results = resp.json()
    if not results:
        raise GeocodeError(f"No results for query: {query!r}")

    top = results[0]
    lat = float(top["lat"])
    lon = float(top["lon"])
    return {
        "display_name": top.get("display_name", query),
        "latitude": lat,
        "longitude": lon,
        "timezone": timezone_for(lat, lon),
    }
