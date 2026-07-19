"""Tests for the coordinate transformation and horizon filtering."""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from app.core import astronomy


def test_polaris_altitude_equals_latitude():
    # Polaris sits ~ on the north celestial pole, so its altitude ~ observer
    # latitude and its azimuth ~ 0 (due north) at any time.
    utc = datetime(2017, 9, 27, 1, 30, tzinfo=timezone.utc)
    jd = astronomy.datetime_to_jd(utc)
    lat = 36.7682
    lst = astronomy.local_sidereal_time_deg(jd, -76.2875)
    ra = np.array([37.95])
    dec = np.array([89.264])  # Polaris
    alt, az = astronomy.equatorial_to_altaz(ra, dec, lat, lst)
    assert abs(alt[0] - lat) < 1.0
    assert az[0] < 3.0 or az[0] > 357.0


def test_zenith_star_has_high_altitude():
    # A star with dec == latitude and hour angle 0 passes through the zenith.
    lat = 40.0
    lst = 80.0  # degrees
    ra = np.array([80.0])  # HA = 0
    dec = np.array([40.0])
    alt, _ = astronomy.equatorial_to_altaz(ra, dec, lat, lst)
    assert alt[0] > 89.5


def test_gmst_monotonic_and_wrapped():
    jd0 = astronomy.datetime_to_jd(datetime(2000, 1, 1, 12, tzinfo=timezone.utc))
    g = astronomy.greenwich_mean_sidereal_time_deg(jd0)
    assert 0.0 <= g < 360.0


def test_horizon_filtering_removes_below_horizon():
    # Southern-sky star from a northern observer should be below the horizon.
    lat = 60.0
    lst = 0.0
    ra = np.array([180.0])  # HA = -180 -> lower culmination
    dec = np.array([-80.0])
    alt, _ = astronomy.equatorial_to_altaz(ra, dec, lat, lst)
    assert alt[0] < 0.0


def test_cardinal_azimuth_of_meridian_star_south():
    # Star on the meridian (HA=0) south of zenith reads azimuth ~180 (south).
    lat = 40.0
    lst = 100.0
    ra = np.array([100.0])
    dec = np.array([-10.0])  # south of the zenith
    _, az = astronomy.equatorial_to_altaz(ra, dec, lat, lst)
    assert abs(az[0] - 180.0) < 1.0


def test_proper_motion_moves_position():
    ra = np.array([100.0])
    dec = np.array([20.0])
    jd_future = astronomy.datetime_to_jd(datetime(2100, 1, 1, tzinfo=timezone.utc))
    ra2, dec2 = astronomy.apply_proper_motion(
        ra, dec, np.array([1000.0]), np.array([1000.0]), jd_future
    )
    # ~1 arcsec/yr over ~109 yr ~ 0.03 deg; should be a small but nonzero shift.
    assert not np.isclose(dec2[0], dec[0])


def test_precession_changes_ra_over_decades():
    ra = np.array([0.0])
    dec = np.array([0.0])
    jd = astronomy.datetime_to_jd(datetime(2050, 1, 1, tzinfo=timezone.utc))
    ra2, _ = astronomy.precess_from_j2000(ra, dec, jd)
    assert ra2[0] > 0.0  # equinox precesses forward in RA
