"""Mapping from astronomical magnitude to engravable dot diameter.

Astronomical magnitude is inverse (brighter stars have *lower* magnitude), so
we invert and normalise, then apply a configurable power curve so the brightest
handful of stars stand out without the faint majority collapsing to nothing.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StarSizeConfig:
    minimum_dot_mm: float = 0.30
    maximum_dot_mm: float = 1.80
    brightness_exponent: float = 1.8
    magnitude_limit: float = 5.8
    brightest_reference: float = -1.5  # ~ Sirius, the brightest star.


def magnitude_to_diameter_mm(magnitude: float, cfg: StarSizeConfig) -> float:
    """Return the engraved dot diameter (mm) for a star of the given magnitude."""
    span = cfg.magnitude_limit - cfg.brightest_reference
    if span <= 0:
        normalized = 1.0
    else:
        normalized = (cfg.magnitude_limit - magnitude) / span
    normalized = min(1.0, max(0.0, normalized))
    return cfg.minimum_dot_mm + (normalized**cfg.brightness_exponent) * (
        cfg.maximum_dot_mm - cfg.minimum_dot_mm
    )
