"""Equatorial-to-horizontal (Alt/Az) coordinate transformation.

We implement the standard spherical-astronomy transformation directly with
NumPy rather than calling Astropy per request. This is a deliberate MVP
decision: for the bright-star catalogue (thousands of stars) a vectorised
NumPy transform is deterministic, dependency-light, and returns in a few
milliseconds, while agreeing with Astropy's ``AltAz`` frame to well within one
arc-minute — far below the angular size of an engraved dot. Astropy is still
used in the test-suite to cross-check this implementation, and Skyfield is used
for solar-system bodies (see ``planets.py``).

Conventions
-----------
* Azimuth is measured **clockwise from North** (N=0, E=90, S=180, W=270),
  matching the projection in ``projection.py``.
* Altitude is degrees above the horizon (negative below).
"""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

# Julian date of the standard epoch J2000.0 (2000-01-01 12:00 TT).
_JD_J2000 = 2451545.0
# Julian date of the Hipparcos catalogue epoch J1991.25.
_JD_HIP_EPOCH = 2448349.0625
_DAYS_PER_JULIAN_YEAR = 365.25
_MAS_TO_DEG = 1.0 / 3_600_000.0


def datetime_to_jd(dt: datetime) -> float:
    """Convert a timezone-aware datetime to a Julian Date (UTC-based).

    UTC is used directly; the ~0.4 ms/day difference between UT1 and UTC is
    negligible for this application.
    """
    if dt.tzinfo is None:
        raise ValueError("datetime must be timezone-aware")
    dt = dt.astimezone(timezone.utc)
    # Fractional day since the Unix epoch, offset to the JD of 1970-01-01T00:00.
    seconds = dt.timestamp()
    return 2440587.5 + seconds / 86400.0


def greenwich_mean_sidereal_time_deg(jd: float) -> float:
    """Greenwich Mean Sidereal Time in degrees [0, 360).

    Uses the IAU 1982 polynomial (Astronomical Almanac). Accurate to a fraction
    of an arc-second over the supported date range.
    """
    t = (jd - _JD_J2000) / 36525.0
    gmst = (
        280.46061837
        + 360.98564736629 * (jd - _JD_J2000)
        + 0.000387933 * t * t
        - (t * t * t) / 38_710_000.0
    )
    return gmst % 360.0


def local_sidereal_time_deg(jd: float, longitude_deg_east: float) -> float:
    """Local apparent sidereal time (mean) in degrees for an east-positive longitude."""
    return (greenwich_mean_sidereal_time_deg(jd) + longitude_deg_east) % 360.0


def apply_proper_motion(
    ra_deg: np.ndarray,
    dec_deg: np.ndarray,
    pm_ra_mas_yr: np.ndarray,
    pm_dec_mas_yr: np.ndarray,
    jd: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Advance catalogue positions to the observation epoch using proper motion.

    ``pm_ra_mas_yr`` follows the Hipparcos convention μα* = μα·cos(δ)
    (mas/yr), so the RA increment divides by cos(δ). Positions are catalogued at
    J1991.25.
    """
    dt_years = (jd - _JD_HIP_EPOCH) / _DAYS_PER_JULIAN_YEAR
    cos_dec = np.cos(np.radians(dec_deg))
    cos_dec = np.where(np.abs(cos_dec) < 1e-6, 1e-6, cos_dec)
    ra_out = ra_deg + (pm_ra_mas_yr * _MAS_TO_DEG / cos_dec) * dt_years
    dec_out = dec_deg + (pm_dec_mas_yr * _MAS_TO_DEG) * dt_years
    return ra_out % 360.0, dec_out


def precess_from_j2000(
    ra_deg: np.ndarray, dec_deg: np.ndarray, jd: float
) -> tuple[np.ndarray, np.ndarray]:
    """Precess mean equatorial coordinates from J2000.0 to the equinox of date.

    Uses the IAU 1976 precession angles (Meeus, *Astronomical Algorithms*,
    ch. 21). Without this, positions drift ~50"/year, which over a couple of
    decades noticeably distorts constellation shapes on the engraving.
    """
    t = (jd - _JD_J2000) / 36525.0  # Julian centuries since J2000.
    # Precession angles in arc-seconds -> radians.
    zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t**3) / 3600.0
    z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t**3) / 3600.0
    theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t**3) / 3600.0
    zeta, z, theta = np.radians(zeta), np.radians(z), np.radians(theta)

    ra = np.radians(ra_deg)
    dec = np.radians(dec_deg)
    a = np.cos(dec) * np.sin(ra + zeta)
    b = np.cos(theta) * np.cos(dec) * np.cos(ra + zeta) - np.sin(theta) * np.sin(dec)
    c = np.sin(theta) * np.cos(dec) * np.cos(ra + zeta) + np.cos(theta) * np.sin(dec)
    ra_out = (np.degrees(np.arctan2(a, b)) + np.degrees(z)) % 360.0
    dec_out = np.degrees(np.arcsin(np.clip(c, -1.0, 1.0)))
    return ra_out, dec_out


def equatorial_to_altaz(
    ra_deg: np.ndarray,
    dec_deg: np.ndarray,
    latitude_deg: float,
    lst_deg: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Transform equatorial (RA/Dec) to horizontal (Alt/Az) coordinates.

    Args:
        ra_deg, dec_deg: Right ascension / declination in degrees (arrays).
        latitude_deg: Observer geodetic latitude, north-positive.
        lst_deg: Local sidereal time in degrees.

    Returns:
        (altitude_deg, azimuth_deg) arrays. Azimuth is clockwise from North.
    """
    ra = np.radians(ra_deg)
    dec = np.radians(dec_deg)
    lat = np.radians(latitude_deg)
    lst = np.radians(lst_deg)

    hour_angle = lst - ra  # radians

    sin_alt = np.sin(dec) * np.sin(lat) + np.cos(dec) * np.cos(lat) * np.cos(hour_angle)
    sin_alt = np.clip(sin_alt, -1.0, 1.0)
    altitude = np.arcsin(sin_alt)

    # Azimuth measured clockwise from North (East positive). Derived so that a
    # star on the meridian south of the zenith reads az=180, a star rising due
    # east reads az=90, etc.
    az_y = -np.cos(dec) * np.sin(hour_angle)
    az_x = np.sin(dec) * np.cos(lat) - np.cos(dec) * np.sin(lat) * np.cos(hour_angle)
    azimuth = np.arctan2(az_y, az_x)

    altitude_deg = np.degrees(altitude)
    azimuth_deg = np.degrees(azimuth) % 360.0
    return altitude_deg, azimuth_deg
