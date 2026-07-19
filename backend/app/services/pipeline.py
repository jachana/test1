"""Astronomy pipeline: request -> visible sky scene.

Stage 1 of the render pipeline. Produces the set of stars and solar-system
bodies above the horizon at the resolved instant, in horizontal (Alt/Az)
coordinates. Deliberately independent of projection / layout / SVG so it can be
cached on a key that excludes text and layout settings.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache

import numpy as np

from ..core import astronomy, planets
from ..core.catalog import get_catalog
from ..core.timeconv import ResolvedTime, resolve_local_time


@dataclass(frozen=True)
class SceneStar:
    id: int
    magnitude: float
    altitude_deg: float
    azimuth_deg: float
    common_name: str


@dataclass
class SkyScene:
    resolved_time: ResolvedTime
    latitude: float
    longitude: float
    elevation_m: float
    magnitude_limit: float
    catalog_stars_processed: int
    # Above-horizon star arrays (parallel), sorted brightest-first.
    star_ids: np.ndarray
    star_mag: np.ndarray
    star_alt: np.ndarray
    star_az: np.ndarray
    star_names: list[str]
    bodies: list[planets.BodyPosition]

    @property
    def stars_above_horizon(self) -> int:
        return int(self.star_ids.shape[0])

    def iter_stars(self):
        for i in range(self.stars_above_horizon):
            yield SceneStar(
                id=int(self.star_ids[i]),
                magnitude=float(self.star_mag[i]),
                altitude_deg=float(self.star_alt[i]),
                azimuth_deg=float(self.star_az[i]),
                common_name=self.star_names[i],
            )

    def star_index_by_id(self) -> dict[int, int]:
        return {int(hip): i for i, hip in enumerate(self.star_ids)}


def _round_key(value: float, places: int) -> float:
    return round(value, places)


@lru_cache(maxsize=256)
def _compute_scene_cached(
    lat_key: float,
    lon_key: float,
    elevation_m: float,
    utc_iso: str,
    magnitude_limit: float,
    body_names_key: tuple[str, ...],
) -> "SkyScene":
    """Cached core computation.

    The cache key intentionally excludes layout/text/personalisation settings —
    only quantities that change the physical sky matter (see docs/astronomy.md).
    """
    utc_dt = datetime.fromisoformat(utc_iso)
    catalog = get_catalog()

    jd = astronomy.datetime_to_jd(utc_dt)
    ra, dec = astronomy.apply_proper_motion(
        catalog.ra_deg, catalog.dec_deg, catalog.pm_ra_mas_yr, catalog.pm_dec_mas_yr, jd
    )
    # Precess from J2000 to the equinox of date so constellation shapes stay true.
    ra, dec = astronomy.precess_from_j2000(ra, dec, jd)
    # Longitude is carried in the cache key at 4 dp (~11 m), fine for sidereal
    # time (that error is far below one arc-second of sky rotation).
    lst = astronomy.local_sidereal_time_deg(jd, lon_key)

    alt, az = astronomy.equatorial_to_altaz(ra, dec, lat_key, lst)

    mag_mask = catalog.magnitude <= magnitude_limit
    horizon_mask = alt > 0.0
    visible = mag_mask & horizon_mask

    idx = np.nonzero(visible)[0]
    # Sort brightest (lowest magnitude) first for deterministic draw order.
    order = np.argsort(catalog.magnitude[idx], kind="stable")
    idx = idx[order]

    names = [catalog.common_names[i] for i in idx]

    bodies = planets.compute_bodies(
        utc_dt,
        lat_key,
        lon_key,
        elevation_m,
        list(body_names_key),
    )
    # Keep only bodies above the horizon.
    bodies = [b for b in bodies if b.altitude_deg > 0.0]

    return SkyScene(
        resolved_time=None,  # filled by wrapper (not part of cache identity)
        latitude=lat_key,
        longitude=lon_key,
        elevation_m=elevation_m,
        magnitude_limit=magnitude_limit,
        catalog_stars_processed=len(catalog),
        star_ids=catalog.ids[idx],
        star_mag=catalog.magnitude[idx],
        star_alt=alt[idx],
        star_az=az[idx],
        star_names=names,
        bodies=bodies,
    )


def _selected_bodies(sky) -> tuple[str, ...]:
    names: list[str] = []
    if getattr(sky, "show_moon", False):
        names.append("Moon")
    if getattr(sky, "show_planets", False):
        names.extend(["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"])
    if getattr(sky, "show_sun", False):
        names.append("Sun")
    return tuple(names)


def compute_scene(observer, sky) -> SkyScene:
    """Public entry point. Resolves time, then computes (and caches) the scene."""
    resolved = resolve_local_time(observer.local_datetime.replace(tzinfo=None), observer.timezone)

    scene = _compute_scene_cached(
        _round_key(observer.latitude, 4),
        _round_key(observer.longitude, 4),
        float(observer.elevation_m),
        resolved.utc_datetime.replace(microsecond=0).isoformat(),
        float(sky.magnitude_limit),
        _selected_bodies(sky),
    )
    # Attach resolved time (not part of the cache key).
    scene.resolved_time = resolved
    return scene
