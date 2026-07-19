"""Solar-system body positions (planets, Moon, Sun) via Skyfield + JPL ephemeris.

Skyfield loads a locally-cached JPL ephemeris (DE421 by default). No network
request is made per map; the ephemeris is a one-time setup download
(``scripts/setup_data.py``). If the ephemeris file is missing the module
degrades gracefully: ``compute_bodies`` returns an empty list and the caller
records a warning rather than failing the whole request.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from ..config import get_settings

# Body name -> ephemeris target key. The Sun is computed but hidden from
# night-sky artwork unless explicitly enabled by the caller.
_BODY_TARGETS: dict[str, str] = {
    "Moon": "moon",
    "Mercury": "mercury",
    "Venus": "venus",
    "Mars": "mars",
    "Jupiter": "jupiter barycenter",
    "Saturn": "saturn barycenter",
    "Uranus": "uranus barycenter",
    "Neptune": "neptune barycenter",
    "Sun": "sun",
}

# Rough apparent visual magnitudes, used only to size the markers relative to
# stars. Planet brightness varies; these are representative values.
_BODY_MAGNITUDE: dict[str, float] = {
    "Moon": -12.0,
    "Venus": -4.0,
    "Jupiter": -2.0,
    "Mars": -1.0,
    "Mercury": 0.0,
    "Saturn": 0.5,
    "Uranus": 5.7,
    "Neptune": 7.8,
    "Sun": -26.7,
}


@dataclass(frozen=True)
class BodyPosition:
    name: str
    altitude_deg: float
    azimuth_deg: float
    magnitude: float
    phase_fraction: float | None = None  # illuminated fraction (Moon)


class EphemerisUnavailable(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load_ephemeris():
    settings = get_settings()
    path: Path = settings.ephemeris_path
    if not path.exists():
        raise EphemerisUnavailable(
            f"Ephemeris not found at {path}. Run `python scripts/setup_data.py`."
        )
    from skyfield.api import load, load_file

    ts = load.timescale(builtin=True)
    eph = load_file(str(path))
    return ts, eph


def ephemeris_available() -> bool:
    try:
        _load_ephemeris()
        return True
    except Exception:
        return False


def compute_bodies(
    utc_dt: datetime,
    latitude_deg: float,
    longitude_deg: float,
    elevation_m: float,
    body_names: list[str],
) -> list[BodyPosition]:
    """Compute apparent Alt/Az for the requested bodies at the given instant.

    Returns an empty list if the ephemeris is unavailable.
    """
    if not body_names:
        return []
    try:
        ts, eph = _load_ephemeris()
    except EphemerisUnavailable:
        return []

    from skyfield.api import wgs84

    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    t = ts.from_datetime(utc_dt.astimezone(timezone.utc))

    earth = eph["earth"]
    topos = wgs84.latlon(latitude_deg, longitude_deg, elevation_m=elevation_m)
    observer = earth + topos

    results: list[BodyPosition] = []
    for name in body_names:
        target_key = _BODY_TARGETS.get(name)
        if target_key is None:
            continue
        try:
            target = eph[target_key]
            astrometric = observer.at(t).observe(target).apparent()
            alt, az, _ = astrometric.altaz()

            phase = None
            if name == "Moon":
                sun = eph["sun"]
                phase = float(astrometric.fraction_illuminated(sun))
        except Exception:
            # DE421 covers ~1899–2053. For dates outside the ephemeris range
            # (or any per-body failure) we skip solar-system bodies; the star
            # map itself is valid for any date. The caller records the absence.
            continue

        results.append(
            BodyPosition(
                name=name,
                altitude_deg=float(alt.degrees),
                azimuth_deg=float(az.degrees),
                magnitude=_BODY_MAGNITUDE.get(name, 3.0),
                phase_fraction=phase,
            )
        )
    return results
