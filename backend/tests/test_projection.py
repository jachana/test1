"""Tests for the azimuthal projection: orientation, rotation, clipping."""

from __future__ import annotations

import numpy as np

from app.core.projection import (
    ProjectionConfig,
    clip_segment_to_disc,
    is_within_disc,
    project_arrays,
    project_point,
)

CFG = ProjectionConfig(center_x_mm=100.0, center_y_mm=100.0, map_radius_mm=100.0)


def test_zenith_maps_to_center():
    x, y = project_point(90.0, 123.0, CFG)  # azimuth irrelevant at zenith
    assert abs(x - 100.0) < 1e-9
    assert abs(y - 100.0) < 1e-9


def test_north_horizon_is_top():
    x, y = project_point(0.0, 0.0, CFG)
    assert abs(x - 100.0) < 1e-9
    assert abs(y - 0.0) < 1e-9  # top of the disc


def test_east_horizon_is_right():
    x, y = project_point(0.0, 90.0, CFG)
    assert abs(x - 200.0) < 1e-9  # right edge
    assert abs(y - 100.0) < 1e-9


def test_south_horizon_is_bottom():
    x, y = project_point(0.0, 180.0, CFG)
    assert abs(x - 100.0) < 1e-9
    assert abs(y - 200.0) < 1e-9  # bottom


def test_west_horizon_is_left():
    x, y = project_point(0.0, 270.0, CFG)
    assert abs(x - 0.0) < 1e-9  # left edge
    assert abs(y - 100.0) < 1e-9


def test_not_mirrored_east_west_distinct():
    xe, _ = project_point(0.0, 90.0, CFG)
    xw, _ = project_point(0.0, 270.0, CFG)
    assert xe > CFG.center_x_mm > xw  # East right of centre, West left


def test_rotation_shifts_north():
    rotated = ProjectionConfig(100.0, 100.0, 100.0, rotation_degrees=90.0)
    # North (az=0) after +90 rotation should land on the right (like East).
    x, y = project_point(0.0, 0.0, rotated)
    assert abs(x - 200.0) < 1e-9
    assert abs(y - 100.0) < 1e-9


def test_below_horizon_projects_outside_disc():
    x, y = project_point(-10.0, 45.0, CFG)
    assert not is_within_disc(x, y, CFG)


def test_project_arrays_matches_scalar():
    alt = np.array([0.0, 45.0, 90.0])
    az = np.array([0.0, 90.0, 180.0])
    xs, ys = project_arrays(alt, az, CFG)
    for i in range(3):
        sx, sy = project_point(float(alt[i]), float(az[i]), CFG)
        assert abs(xs[i] - sx) < 1e-9
        assert abs(ys[i] - sy) < 1e-9


def test_clip_segment_fully_inside_unchanged():
    p0 = (90.0, 90.0)
    p1 = (110.0, 110.0)
    clipped = clip_segment_to_disc(p0, p1, CFG)
    assert clipped == (p0, p1)


def test_clip_segment_crossing_boundary():
    p0 = (100.0, 100.0)  # centre
    p1 = (300.0, 100.0)  # far outside to the right
    clipped = clip_segment_to_disc(p0, p1, CFG)
    assert clipped is not None
    (_, _), (x1, y1) = clipped
    assert abs(x1 - 200.0) < 1e-6  # clipped to the right edge of the disc
    assert abs(y1 - 100.0) < 1e-6


def test_clip_segment_entirely_outside_returns_none():
    p0 = (300.0, 300.0)
    p1 = (400.0, 400.0)
    assert clip_segment_to_disc(p0, p1, CFG) is None
