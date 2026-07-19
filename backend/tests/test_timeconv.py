"""Tests for local-time to UTC conversion and DST edge cases."""

from __future__ import annotations

from datetime import datetime

import pytest

from app.core.timeconv import InvalidTimezoneError, resolve_local_time


def test_est_standard_time_offset():
    r = resolve_local_time(datetime(2017, 1, 15, 21, 30), "America/New_York")
    assert r.utc_offset_hours == -5.0
    assert r.is_dst is False
    assert r.utc_datetime.hour == 2  # 21:30 EST -> 02:30 UTC next day
    assert r.utc_datetime.day == 16


def test_edt_daylight_saving_offset():
    r = resolve_local_time(datetime(2017, 9, 26, 21, 30), "America/New_York")
    assert r.utc_offset_hours == -4.0
    assert r.is_dst is True
    assert r.utc_datetime.isoformat() == "2017-09-27T01:30:00+00:00"


def test_utc_passthrough():
    r = resolve_local_time(datetime(2000, 1, 1, 0, 0), "UTC")
    assert r.utc_offset_hours == 0.0
    assert r.utc_datetime.isoformat() == "2000-01-01T00:00:00+00:00"


def test_sydney_southern_hemisphere_dst():
    # June is winter (standard time) in Sydney: UTC+10.
    r = resolve_local_time(datetime(2025, 6, 15, 20, 0), "Australia/Sydney")
    assert r.utc_offset_hours == 10.0
    assert r.is_dst is False


def test_ambiguous_time_flagged():
    # 2021-11-07 01:30 US Eastern occurs twice (fall back).
    r = resolve_local_time(datetime(2021, 11, 7, 1, 30), "America/New_York")
    assert r.ambiguous is True


def test_imaginary_time_flagged():
    # 2021-03-14 02:30 US Eastern does not exist (spring forward).
    r = resolve_local_time(datetime(2021, 3, 14, 2, 30), "America/New_York")
    assert r.imaginary is True


def test_invalid_timezone_raises():
    with pytest.raises(InvalidTimezoneError):
        resolve_local_time(datetime(2020, 1, 1, 0, 0), "Not/AZone")
