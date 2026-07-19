"""Tests for SVG generation: dimensions, layers, geometry, text-to-path."""

from __future__ import annotations

import xml.dom.minidom as minidom

from app.core.svg import build_svg
from app.services.pipeline import compute_scene

REQUIRED_LAYER_IDS = [
    "engrave-stars",
    "engrave-planets",
    "engrave-constellations",
    "engrave-labels",
    "engrave-personalization",
    "score-sky-border",
    "cut-outer-boundary",
]


def _render(request):
    scene = compute_scene(request.observer, request.sky)
    return build_svg(request, scene)


def test_svg_is_valid_xml(chesapeake_request):
    result = _render(chesapeake_request)
    minidom.parseString(result.svg)  # raises on malformed XML


def test_svg_has_mm_dimensions(chesapeake_request):
    result = _render(chesapeake_request)
    assert 'width="300mm"' in result.svg
    assert 'height="400mm"' in result.svg
    assert 'viewBox="0 0 300 400"' in result.svg


def test_all_layer_ids_present(chesapeake_request):
    result = _render(chesapeake_request)
    for layer_id in REQUIRED_LAYER_IDS:
        assert f'id="{layer_id}"' in result.svg


def test_metadata_embedded(chesapeake_request):
    result = _render(chesapeake_request)
    assert "<metadata>" in result.svg
    assert "utc_datetime" in result.svg
    assert "azimuthal" in result.svg


def test_all_stars_inside_sky_circle(chesapeake_request):
    result = _render(chesapeake_request)
    proj = result.projection
    for dot in result.dots:
        if dot.kind != "star":
            continue
        dx = dot.x_mm - proj.center_x_mm
        dy = dot.y_mm - proj.center_y_mm
        assert dx * dx + dy * dy <= (proj.map_radius_mm + 1e-6) ** 2


def test_text_to_path_produces_path_not_text(chesapeake_request):
    chesapeake_request.export.convert_text_to_paths = True
    result = _render(chesapeake_request)
    perso = result.svg.split('id="engrave-personalization"')[1].split("</g>")[0]
    assert "<path" in perso
    assert "<text" not in perso


def test_preview_text_uses_text_elements(chesapeake_request):
    chesapeake_request.export.convert_text_to_paths = False
    result = _render(chesapeake_request)
    assert "<text" in result.svg


def test_no_forbidden_effects(chesapeake_request):
    result = _render(chesapeake_request)
    low = result.svg.lower()
    for banned in ["<image", "filter:", "fegaussianblur", "lineargradient", "radialgradient"]:
        assert banned not in low


def test_constellation_lines_disabled(chesapeake_request):
    chesapeake_request.sky.show_constellations = False
    result = _render(chesapeake_request)
    assert len(result.lines) == 0
