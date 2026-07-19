"""Laser-ready SVG generation.

Stage 4 of the pipeline: turn a projected sky scene plus layout/personalisation
settings into deterministic vector geometry, organised into semantic layers with
real-world millimetre units. No raster, blur, gradient, or transparency effects
are used — everything is clean fills and strokes suitable for LightBurn and
standard vector editors.

Colour is used only to separate laser operations (LightBurn assigns operations
by colour): red = cut, blue = score border, black = engrave.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from .. import __version__
from ..config import get_settings
from . import fonts
from .constellations import get_constellations
from .projection import ProjectionConfig, clip_segment_to_disc, project_arrays, project_point
from .starsize import StarSizeConfig, magnitude_to_diameter_mm

# Layer colours (hex). Chosen so a laser operator can map operations by colour.
COLOR_CUT = "#FF0000"
COLOR_BORDER = "#0000FF"
COLOR_ENGRAVE = "#000000"

PROJECTION_NAME = "azimuthal-equidistant (zenith-centred)"


# --------------------------------------------------------------------------- #
# Geometry records (also consumed by the validator)
# --------------------------------------------------------------------------- #
@dataclass
class DotFeature:
    x_mm: float
    y_mm: float
    diameter_mm: float
    kind: str  # "star" | "planet" | "moon"


@dataclass
class LineFeature:
    x0: float
    y0: float
    x1: float
    y1: float
    stroke_mm: float


@dataclass
class TextFeature:
    text: str
    x_mm: float
    baseline_y_mm: float
    height_mm: float
    font_key: str


@dataclass
class RenderResult:
    svg: str
    dots: list[DotFeature] = field(default_factory=list)
    lines: list[LineFeature] = field(default_factory=list)
    texts: list[TextFeature] = field(default_factory=list)
    canvas_width_mm: float = 0.0
    canvas_height_mm: float = 0.0
    projection: ProjectionConfig | None = None


@dataclass
class ResolvedLayout:
    canvas_width_mm: float
    canvas_height_mm: float
    center_x_mm: float
    center_y_mm: float
    map_radius_mm: float
    outer_margin_mm: float


def resolve_layout(layout) -> ResolvedLayout:
    cx = layout.map_center_x_mm if layout.map_center_x_mm is not None else layout.canvas_width_mm / 2.0
    cy = (
        layout.map_center_y_mm
        if layout.map_center_y_mm is not None
        else layout.map_diameter_mm / 2.0 + layout.outer_margin_mm
    )
    return ResolvedLayout(
        canvas_width_mm=layout.canvas_width_mm,
        canvas_height_mm=layout.canvas_height_mm,
        center_x_mm=cx,
        center_y_mm=cy,
        map_radius_mm=layout.map_diameter_mm / 2.0,
        outer_margin_mm=layout.outer_margin_mm,
    )


def _f(value: float) -> str:
    """Format a float compactly for SVG (4 dp, no trailing zeros)."""
    return f"{value:.4f}".rstrip("0").rstrip(".")


def _metadata_block(request, scene) -> str:
    settings = get_settings()
    rt = scene.resolved_time
    meta = {
        "generator": f"starmap-laser-mvp {__version__}",
        "latitude": request.observer.latitude,
        "longitude": request.observer.longitude,
        "elevation_m": request.observer.elevation_m,
        "timezone": request.observer.timezone,
        "local_datetime": rt.local_datetime.isoformat(),
        "utc_datetime": rt.utc_datetime.isoformat(),
        "catalog_source": settings.catalog_source,
        "magnitude_limit": request.sky.magnitude_limit,
        "projection": PROJECTION_NAME,
        "rotation_degrees": request.sky.rotation_degrees,
        "ephemeris_source": settings.ephemeris_source,
        "created_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
    rows = "".join(
        f'    <starmap:{k}>{escape(str(v))}</starmap:{k}>\n' for k, v in meta.items()
    )
    return (
        '  <metadata>\n'
        '    <starmap:map xmlns:starmap="https://starmap-laser.example/ns">\n'
        f"{rows}"
        "    </starmap:map>\n"
        "  </metadata>\n"
    )


# --------------------------------------------------------------------------- #
# Main entry point
# --------------------------------------------------------------------------- #
def build_svg(request, scene) -> RenderResult:
    layout = resolve_layout(request.layout)
    proj = ProjectionConfig(
        center_x_mm=layout.center_x_mm,
        center_y_mm=layout.center_y_mm,
        map_radius_mm=layout.map_radius_mm,
        rotation_degrees=request.sky.rotation_degrees,
    )
    size_cfg = StarSizeConfig(
        minimum_dot_mm=request.engraving.minimum_dot_mm,
        maximum_dot_mm=request.engraving.maximum_dot_mm,
        brightness_exponent=request.engraving.brightness_exponent,
        magnitude_limit=request.sky.magnitude_limit,
    )
    result = RenderResult(
        svg="",
        canvas_width_mm=layout.canvas_width_mm,
        canvas_height_mm=layout.canvas_height_mm,
        projection=proj,
    )

    parts: list[str] = []
    w, h = layout.canvas_width_mm, layout.canvas_height_mm
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{_f(w)}mm" height="{_f(h)}mm" '
        f'viewBox="0 0 {_f(w)} {_f(h)}" '
        f'version="1.1">\n'
    )
    if request.export.include_metadata:
        parts.append(_metadata_block(request, scene))

    # A clip path for the circular sky disc (used by preview renderers).
    parts.append(
        f'  <defs><clipPath id="sky-clip">'
        f'<circle cx="{_f(proj.center_x_mm)}" cy="{_f(proj.center_y_mm)}" '
        f'r="{_f(proj.map_radius_mm)}"/></clipPath></defs>\n'
    )

    parts.append(_cut_layer(layout))
    parts.append(_border_layer(proj, request.engraving.constellation_stroke_mm))
    parts.append(_constellations_layer(scene, proj, request, result))
    parts.append(_stars_layer(scene, proj, size_cfg, result))
    parts.append(_planets_layer(scene, proj, size_cfg, request, result))
    parts.append(_labels_layer(scene, proj, request, result))
    parts.append(_personalization_layer(layout, request, result))

    parts.append("</svg>\n")
    result.svg = "".join(parts)
    return result


# --------------------------------------------------------------------------- #
# Individual layers
# --------------------------------------------------------------------------- #
def _cut_layer(layout: ResolvedLayout) -> str:
    """Outer boundary cut line — a rounded rectangle around the whole design."""
    m = 0.0  # cut exactly at the artboard edge; margin already in layout.
    x, y = m, m
    w, h = layout.canvas_width_mm, layout.canvas_height_mm
    r = min(w, h) * 0.02
    return (
        '  <g id="cut-outer-boundary" '
        f'fill="none" stroke="{COLOR_CUT}" stroke-width="0.1">\n'
        f'    <rect x="{_f(x)}" y="{_f(y)}" width="{_f(w)}" height="{_f(h)}" '
        f'rx="{_f(r)}" ry="{_f(r)}"/>\n'
        "  </g>\n"
    )


def _border_layer(proj: ProjectionConfig, stroke_mm: float) -> str:
    return (
        '  <g id="score-sky-border" '
        f'fill="none" stroke="{COLOR_BORDER}" stroke-width="{_f(max(stroke_mm, 0.15))}">\n'
        f'    <circle cx="{_f(proj.center_x_mm)}" cy="{_f(proj.center_y_mm)}" '
        f'r="{_f(proj.map_radius_mm)}"/>\n'
        "  </g>\n"
    )


def _stars_layer(scene, proj, size_cfg, result: RenderResult) -> str:
    if scene.stars_above_horizon == 0:
        return '  <g id="engrave-stars"/>\n'
    xs, ys = project_arrays(scene.star_alt, scene.star_az, proj)
    circles: list[str] = []
    for i in range(scene.stars_above_horizon):
        d = magnitude_to_diameter_mm(float(scene.star_mag[i]), size_cfg)
        cx, cy = float(xs[i]), float(ys[i])
        circles.append(f'    <circle cx="{_f(cx)}" cy="{_f(cy)}" r="{_f(d / 2.0)}"/>\n')
        result.dots.append(DotFeature(cx, cy, d, "star"))
    return (
        f'  <g id="engrave-stars" fill="{COLOR_ENGRAVE}" stroke="none">\n'
        + "".join(circles)
        + "  </g>\n"
    )


def _planets_layer(scene, proj, size_cfg, request, result: RenderResult) -> str:
    if not scene.bodies:
        return '  <g id="engrave-planets"/>\n'
    shapes: list[str] = []
    for body in scene.bodies:
        x, y = project_point(body.altitude_deg, body.azimuth_deg, proj)
        # Size planets a touch larger than an equally-bright star so they read
        # as distinct; the Moon gets the largest marker.
        d = magnitude_to_diameter_mm(body.magnitude, size_cfg)
        d = max(d, size_cfg.minimum_dot_mm * 2.2)
        if body.name == "Moon":
            d = max(d, size_cfg.maximum_dot_mm * 1.3)
            shapes.append(_moon_marker(x, y, d, body.phase_fraction))
            result.dots.append(DotFeature(x, y, d, "moon"))
        else:
            shapes.append(_planet_marker(x, y, d))
            result.dots.append(DotFeature(x, y, d, "planet"))
    return (
        f'  <g id="engrave-planets" fill="{COLOR_ENGRAVE}" stroke="none">\n'
        + "".join(shapes)
        + "  </g>\n"
    )


def _planet_marker(x: float, y: float, d: float) -> str:
    """A four-point diamond so planets are visually distinct from round stars."""
    r = d / 2.0
    pts = f"{_f(x)},{_f(y - r)} {_f(x + r)},{_f(y)} {_f(x)},{_f(y + r)} {_f(x - r)},{_f(y)}"
    return f'    <polygon points="{pts}"/>\n'


def _moon_marker(x: float, y: float, d: float, phase: float | None) -> str:
    """A ringed circle for the Moon (open centre keeps it distinct + saves burn)."""
    r = d / 2.0
    inner = max(r - max(d * 0.18, 0.2), r * 0.55)
    # Outer filled ring via even-odd: outer circle minus inner circle.
    return (
        f'    <path fill-rule="evenodd" d="'
        f'M {_f(x - r)} {_f(y)} a {_f(r)} {_f(r)} 0 1 0 {_f(2 * r)} 0 '
        f'a {_f(r)} {_f(r)} 0 1 0 {_f(-2 * r)} 0 Z '
        f'M {_f(x - inner)} {_f(y)} a {_f(inner)} {_f(inner)} 0 1 1 {_f(2 * inner)} 0 '
        f'a {_f(inner)} {_f(inner)} 0 1 1 {_f(-2 * inner)} 0 Z"/>\n'
    )


def _constellations_layer(scene, proj, request, result: RenderResult) -> str:
    if not request.sky.show_constellations:
        return '  <g id="engrave-constellations"/>\n'
    cset = get_constellations()
    index = scene.star_index_by_id()
    stroke = request.engraving.constellation_stroke_mm
    lines: list[str] = []
    for constellation in cset.constellations:
        for a, b in constellation.segments:
            ia, ib = index.get(a), index.get(b)
            if ia is None or ib is None:
                continue  # one or both endpoints below horizon / not in catalogue
            p0 = project_point(float(scene.star_alt[ia]), float(scene.star_az[ia]), proj)
            p1 = project_point(float(scene.star_alt[ib]), float(scene.star_az[ib]), proj)
            clipped = clip_segment_to_disc(p0, p1, proj)
            if clipped is None:
                continue
            (x0, y0), (x1, y1) = clipped
            if abs(x0 - x1) < 1e-9 and abs(y0 - y1) < 1e-9:
                continue  # zero-length after clipping
            lines.append(
                f'    <line x1="{_f(x0)}" y1="{_f(y0)}" x2="{_f(x1)}" y2="{_f(y1)}"/>\n'
            )
            result.lines.append(LineFeature(x0, y0, x1, y1, stroke))
    return (
        f'  <g id="engrave-constellations" fill="none" stroke="{COLOR_ENGRAVE}" '
        f'stroke-width="{_f(stroke)}" stroke-linecap="round">\n'
        + "".join(lines)
        + "  </g>\n"
    )


def _labels_layer(scene, proj, request, result: RenderResult) -> str:
    items: list[str] = []
    convert = request.export.convert_text_to_paths

    # Cardinal directions just outside the sky circle.
    if request.sky.show_cardinal_directions:
        cardinal_h = 4.0
        r = proj.map_radius_mm + cardinal_h * 0.9
        for label, az in (("N", 0.0), ("E", 90.0), ("S", 180.0), ("W", 270.0)):
            x, y = project_point(0.0, az, proj)
            # place slightly outside the circle along the same radial direction
            import math

            angle = math.radians(az + proj.rotation_degrees)
            x = proj.center_x_mm + r * math.sin(angle)
            y = proj.center_y_mm - r * math.cos(angle)
            items.append(_text_element(label, x, y + cardinal_h / 2, cardinal_h, "sans-default", convert, result))

    if request.sky.show_constellation_labels:
        cset = get_constellations()
        index = scene.star_index_by_id()
        label_h = 3.0
        for constellation in cset.constellations:
            i = index.get(constellation.label_star)
            if i is None:
                continue
            x, y = project_point(float(scene.star_alt[i]), float(scene.star_az[i]), proj)
            items.append(
                _text_element(constellation.name, x, y - 1.5, label_h, "sans-default", convert, result)
            )

    return '  <g id="engrave-labels" fill="' + COLOR_ENGRAVE + '">\n' + "".join(items) + "  </g>\n"


def _personalization_layer(layout: ResolvedLayout, request, result: RenderResult) -> str:
    p = request.personalization
    convert = request.export.convert_text_to_paths
    cx = layout.center_x_mm
    items: list[str] = []

    # Vertical stack below the map disc.
    top = layout.center_y_mm + layout.map_radius_mm
    bottom = layout.canvas_height_mm
    zone = bottom - top
    y = top + zone * 0.16

    def add(text: str, height: float, font: str, gap: float) -> None:
        nonlocal y
        text = text.strip()
        if not text:
            return
        y += height
        items.append(_text_element(text, cx, y, height, font, convert, result))
        y += gap

    if p.headline:
        add(p.headline, 6.0, resolve_details_font(p.details_font, serif=True), 3.0)
    if p.names:
        add(p.names, 12.0, p.names_font, 3.0)

    details: list[str] = []
    if p.location_text:
        details.append(p.location_text)
    if p.date_text:
        details.append(p.date_text)
    if p.show_time and p.time_text:
        details.append(p.time_text)
    if p.show_coordinates:
        details.append(_format_coords(request.observer.latitude, request.observer.longitude))
    if p.custom_message:
        details.append(p.custom_message)

    for line in details:
        add(line, 4.0, p.details_font, 2.0)

    return (
        '  <g id="engrave-personalization" fill="' + COLOR_ENGRAVE + '">\n'
        + "".join(items)
        + "  </g>\n"
    )


def resolve_details_font(font_key: str, serif: bool = False) -> str:
    if serif:
        return "serif-default"
    return font_key


def _format_coords(lat: float, lon: float) -> str:
    ns = "N" if lat >= 0 else "S"
    ew = "E" if lon >= 0 else "W"
    return f"{abs(lat):.4f}° {ns}, {abs(lon):.4f}° {ew}"


def _text_element(
    text: str,
    x_mm: float,
    baseline_y_mm: float,
    height_mm: float,
    font_key: str,
    convert_to_path: bool,
    result: RenderResult,
) -> str:
    result.texts.append(TextFeature(text, x_mm, baseline_y_mm, height_mm, fonts.resolve_font_key(font_key)))
    if convert_to_path:
        tp = fonts.text_to_path(text, font_key, height_mm, x_mm, baseline_y_mm, anchor="middle")
        return f"    {_group_wrap(tp.path_d)}\n" if tp.path_d else ""
    family = fonts.FONT_CSS_FAMILY.get(fonts.resolve_font_key(font_key), "sans-serif")
    return (
        f'    <text x="{_f(x_mm)}" y="{_f(baseline_y_mm)}" '
        f'font-family="{family}" font-size="{_f(height_mm)}" '
        f'text-anchor="middle">{escape(text)}</text>\n'
    )


def _group_wrap(path_children: str) -> str:
    return f"<g>{path_children}</g>"
