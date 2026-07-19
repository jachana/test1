"""Tests for magnitude-to-dot-size mapping."""

from __future__ import annotations

from app.core.starsize import StarSizeConfig, magnitude_to_diameter_mm

CFG = StarSizeConfig(
    minimum_dot_mm=0.30, maximum_dot_mm=1.80, brightness_exponent=1.8, magnitude_limit=5.8
)


def test_faintest_star_gets_minimum_dot():
    d = magnitude_to_diameter_mm(5.8, CFG)
    assert abs(d - 0.30) < 1e-9


def test_brightest_reference_gets_maximum_dot():
    d = magnitude_to_diameter_mm(-1.5, CFG)
    assert abs(d - 1.80) < 1e-9


def test_brighter_star_is_larger_than_fainter():
    assert magnitude_to_diameter_mm(0.0, CFG) > magnitude_to_diameter_mm(3.0, CFG)


def test_below_limit_clamped_to_minimum():
    d = magnitude_to_diameter_mm(9.0, CFG)
    assert abs(d - 0.30) < 1e-9


def test_brighter_than_reference_clamped_to_maximum():
    d = magnitude_to_diameter_mm(-5.0, CFG)
    assert abs(d - 1.80) < 1e-9


def test_all_values_within_bounds():
    for mag in [-2, -1, 0, 1, 2, 3, 4, 5, 5.8]:
        d = magnitude_to_diameter_mm(mag, CFG)
        assert 0.30 <= d <= 1.80 + 1e-9
