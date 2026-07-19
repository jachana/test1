"""Azimuthal (zenith-centred) polar projection onto the circular sky disc.

Maps horizontal coordinates (altitude, azimuth) to millimetre positions on the
artboard:

* Zenith (alt = 90) -> centre of the disc.
* Horizon (alt = 0) -> outer circle (radius = map_radius).
* Altitude controls radial distance (linear in zenith angle).
* Azimuth controls angular position, clockwise from North.
* North is at the top by default; ``rotation_degrees`` rotates the whole map.

The projection is intentionally NOT mirrored: increasing azimuth (towards the
East) moves clockwise, so with the default rotation North is up and East is to
the right, exactly as the specification requires.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class ProjectionConfig:
    center_x_mm: float
    center_y_mm: float
    map_radius_mm: float
    rotation_degrees: float = 0.0


def project_point(alt_deg: float, az_deg: float, cfg: ProjectionConfig) -> tuple[float, float]:
    """Project a single (altitude, azimuth) to (x_mm, y_mm)."""
    radius = cfg.map_radius_mm * (90.0 - alt_deg) / 90.0
    angle = math.radians(az_deg + cfg.rotation_degrees)
    x = cfg.center_x_mm + radius * math.sin(angle)
    y = cfg.center_y_mm - radius * math.cos(angle)
    return x, y


def project_arrays(
    alt_deg: np.ndarray, az_deg: np.ndarray, cfg: ProjectionConfig
) -> tuple[np.ndarray, np.ndarray]:
    """Vectorised projection of altitude/azimuth arrays to x/y millimetre arrays."""
    radius = cfg.map_radius_mm * (90.0 - alt_deg) / 90.0
    angle = np.radians(az_deg + cfg.rotation_degrees)
    x = cfg.center_x_mm + radius * np.sin(angle)
    y = cfg.center_y_mm - radius * np.cos(angle)
    return x, y


def is_within_disc(x_mm: float, y_mm: float, cfg: ProjectionConfig, epsilon_mm: float = 1e-9) -> bool:
    """Whether a projected point lies inside (or on) the circular sky boundary."""
    dx = x_mm - cfg.center_x_mm
    dy = y_mm - cfg.center_y_mm
    return (dx * dx + dy * dy) <= (cfg.map_radius_mm + epsilon_mm) ** 2


def clip_segment_to_disc(
    p0: tuple[float, float], p1: tuple[float, float], cfg: ProjectionConfig
) -> tuple[tuple[float, float], tuple[float, float]] | None:
    """Clip a line segment to the circular sky boundary.

    Returns the (possibly shortened) segment that lies inside the disc, or
    ``None`` if the segment does not intersect the disc at all. Used so
    constellation lines never extend beyond the sky circle.
    """
    cx, cy, r = cfg.center_x_mm, cfg.center_y_mm, cfg.map_radius_mm
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0

    fx, fy = x0 - cx, y0 - cy
    a = dx * dx + dy * dy
    if a == 0:
        return (p0, p1) if is_within_disc(x0, y0, cfg) else None

    b = 2 * (fx * dx + fy * dy)
    c = fx * fx + fy * fy - r * r
    disc = b * b - 4 * a * c
    if disc < 0:
        return None  # no intersection with the circle at all

    p0_in = (fx * fx + fy * fy) <= r * r
    p1_in = ((x1 - cx) ** 2 + (y1 - cy) ** 2) <= r * r
    if p0_in and p1_in:
        return (p0, p1)

    sqrt_disc = math.sqrt(disc)
    t1 = (-b - sqrt_disc) / (2 * a)
    t2 = (-b + sqrt_disc) / (2 * a)
    hits = sorted(t for t in (t1, t2) if 0.0 <= t <= 1.0)

    def at(t: float) -> tuple[float, float]:
        return (x0 + t * dx, y0 + t * dy)

    if p0_in and hits:
        return (p0, at(hits[-1]))
    if p1_in and hits:
        return (at(hits[0]), p1)
    if len(hits) >= 2:
        return (at(hits[0]), at(hits[1]))
    return None
