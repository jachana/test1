"""Tests for the laser-safety validation module and filename generation."""

from __future__ import annotations

from datetime import datetime

from app.core.svg import DotFeature, LineFeature, RenderResult, TextFeature
from app.core.validation import ValidationThresholds, validate_design
from app.models.schemas import Observer
from app.services.render import safe_filename
from conftest import make_request


def _codes(issues):
    return {i.code for i in issues}


def test_small_dot_warning():
    render = RenderResult(
        svg="", dots=[DotFeature(10, 10, 0.10, "star")], canvas_width_mm=300, canvas_height_mm=400
    )
    issues = validate_design(render, ValidationThresholds(), 0.20)
    assert "dot_too_small" in _codes(issues)


def test_thin_stroke_warning():
    render = RenderResult(
        svg="",
        lines=[LineFeature(0, 0, 10, 0, 0.05)],
        canvas_width_mm=300,
        canvas_height_mm=400,
    )
    issues = validate_design(render, ValidationThresholds(), constellation_stroke_mm=0.05)
    assert "stroke_too_thin" in _codes(issues)


def test_out_of_bounds_is_error():
    render = RenderResult(
        svg="", dots=[DotFeature(-5, 10, 1.0, "star")], canvas_width_mm=300, canvas_height_mm=400
    )
    issues = validate_design(render, ValidationThresholds(), 0.20)
    assert any(i.code == "geometry_out_of_bounds" and i.level == "error" for i in issues)


def test_small_text_warning():
    render = RenderResult(
        svg="",
        texts=[TextFeature("hi", 10, 10, 2.0, "sans-default")],
        canvas_width_mm=300,
        canvas_height_mm=400,
    )
    issues = validate_design(render, ValidationThresholds(), 0.20)
    assert "text_too_small" in _codes(issues)


def test_clean_design_has_no_errors():
    render = RenderResult(
        svg="",
        dots=[DotFeature(150, 150, 0.5, "star")],
        texts=[TextFeature("Names", 150, 380, 12.0, "script-default")],
        canvas_width_mm=300,
        canvas_height_mm=400,
    )
    issues = validate_design(render, ValidationThresholds(), 0.20)
    assert not any(i.level == "error" for i in issues)


def test_filename_is_safe():
    req = make_request(
        observer=Observer(
            location_name="../etc/passwd",
            latitude=1.0,
            longitude=2.0,
            timezone="UTC",
            local_datetime=datetime(2020, 5, 1, 12, 0),
        )
    )
    name = safe_filename(req, "svg")
    assert "/" not in name and ".." not in name
    assert name.endswith(".svg")


def test_filename_uses_location_and_date():
    req = make_request()
    req.personalization.location_text = "Chesapeake, VA"
    name = safe_filename(req, "png")
    assert name == "chesapeake-va-2017-09-26.png"
