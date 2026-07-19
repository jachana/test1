"""Laser-safety and geometry validation.

Inspects the generated geometry (dots, lines, text) and reports issues at three
levels: ``info``, ``warning``, ``error``. Warnings do not block export; only
``error`` marks the report as not-ok. Thresholds are the specification defaults
and can be overridden per material preset.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .svg import RenderResult


@dataclass(frozen=True)
class ValidationThresholds:
    min_dot_mm: float = 0.25
    min_stroke_mm: float = 0.15
    min_text_height_mm: float = 3.0
    min_gap_mm: float = 0.20
    max_stars: int = 3000
    min_canvas_mm: float = 50.0
    max_canvas_mm: float = 1000.0


@dataclass
class Issue:
    level: str
    code: str
    message: str
    count: int = 1


def _in_disc(x: float, y: float, proj) -> bool:
    dx = x - proj.center_x_mm
    dy = y - proj.center_y_mm
    return dx * dx + dy * dy <= (proj.map_radius_mm + 1e-6) ** 2


def validate_design(
    render: RenderResult,
    thresholds: ValidationThresholds,
    constellation_stroke_mm: float,
) -> list[Issue]:
    issues: list[Issue] = []
    proj = render.projection

    # --- Star / dot sizes ---------------------------------------------------
    small_dots = [d for d in render.dots if d.diameter_mm < thresholds.min_dot_mm]
    if small_dots:
        issues.append(
            Issue(
                "warning",
                "dot_too_small",
                f"{len(small_dots)} dot(s) smaller than {thresholds.min_dot_mm} mm may not "
                "engrave reliably.",
                len(small_dots),
            )
        )

    # --- Star count ---------------------------------------------------------
    star_count = sum(1 for d in render.dots if d.kind == "star")
    if star_count > thresholds.max_stars:
        issues.append(
            Issue(
                "warning",
                "too_many_stars",
                f"{star_count} stars exceed the recommended maximum of "
                f"{thresholds.max_stars}; the field may look crowded or burn together.",
            )
        )

    # --- Constellation stroke width ----------------------------------------
    if render.lines and constellation_stroke_mm < thresholds.min_stroke_mm:
        issues.append(
            Issue(
                "warning",
                "stroke_too_thin",
                f"Constellation stroke {constellation_stroke_mm} mm is below "
                f"{thresholds.min_stroke_mm} mm.",
            )
        )

    # --- Zero-length lines --------------------------------------------------
    zero_lines = sum(
        1 for ln in render.lines if math.hypot(ln.x1 - ln.x0, ln.y1 - ln.y0) < 1e-6
    )
    if zero_lines:
        issues.append(
            Issue("warning", "zero_length_line", f"{zero_lines} zero-length line(s).", zero_lines)
        )

    # --- Duplicate lines ----------------------------------------------------
    seen: set[tuple] = set()
    dupes = 0
    for ln in render.lines:
        endpoints = sorted(
            [(round(ln.x0, 3), round(ln.y0, 3)), (round(ln.x1, 3), round(ln.y1, 3))]
        )
        key = (endpoints[0], endpoints[1])
        if key in seen:
            dupes += 1
        seen.add(key)
    if dupes:
        issues.append(Issue("info", "duplicate_line", f"{dupes} duplicate line segment(s).", dupes))

    # --- Text heights -------------------------------------------------------
    small_text = [t for t in render.texts if t.height_mm < thresholds.min_text_height_mm]
    if small_text:
        issues.append(
            Issue(
                "warning",
                "text_too_small",
                f"{len(small_text)} text element(s) below {thresholds.min_text_height_mm} mm tall.",
                len(small_text),
            )
        )

    # --- Geometry outside the artboard -------------------------------------
    out_of_bounds = 0
    for d in render.dots:
        r = d.diameter_mm / 2
        if (
            d.x_mm - r < 0
            or d.y_mm - r < 0
            or d.x_mm + r > render.canvas_width_mm
            or d.y_mm + r > render.canvas_height_mm
        ):
            out_of_bounds += 1
    if out_of_bounds:
        issues.append(
            Issue(
                "error",
                "geometry_out_of_bounds",
                f"{out_of_bounds} object(s) fall outside the artboard.",
                out_of_bounds,
            )
        )

    # --- Objects outside the sky clipping circle ---------------------------
    if proj is not None:
        outside_disc = sum(1 for d in render.dots if not _in_disc(d.x_mm, d.y_mm, proj))
        if outside_disc:
            issues.append(
                Issue(
                    "warning",
                    "outside_sky_circle",
                    f"{outside_disc} star/planet marker(s) fall outside the sky circle.",
                    outside_disc,
                )
            )

    # --- Canvas dimensions --------------------------------------------------
    if not (thresholds.min_canvas_mm <= render.canvas_width_mm <= thresholds.max_canvas_mm) or not (
        thresholds.min_canvas_mm <= render.canvas_height_mm <= thresholds.max_canvas_mm
    ):
        issues.append(
            Issue(
                "warning",
                "canvas_out_of_range",
                "Canvas dimensions are outside the supported "
                f"{thresholds.min_canvas_mm}–{thresholds.max_canvas_mm} mm range.",
            )
        )

    # --- Minimum spacing between nearby dots -------------------------------
    close_pairs = _count_close_dot_pairs(render.dots, thresholds.min_gap_mm)
    if close_pairs:
        issues.append(
            Issue(
                "info",
                "dots_close",
                f"{close_pairs} pair(s) of dots are closer than {thresholds.min_gap_mm} mm edge-to-edge.",
                close_pairs,
            )
        )

    return issues


def _count_close_dot_pairs(dots, min_gap_mm: float, cell_scan_limit: int = 6000) -> int:
    """Count dot pairs whose edge-to-edge gap is below ``min_gap_mm``.

    Uses a uniform spatial grid so the check stays near-linear even for a few
    thousand stars (no O(n^2) blow-up).
    """
    if len(dots) > cell_scan_limit or not dots:
        # For very dense fields, skip the exact pairwise scan; the star-count
        # warning already flags the density.
        return 0
    max_d = max(d.diameter_mm for d in dots)
    cell = max(max_d + min_gap_mm, 0.5)
    grid: dict[tuple[int, int], list] = {}
    for d in dots:
        gx, gy = int(d.x_mm // cell), int(d.y_mm // cell)
        grid.setdefault((gx, gy), []).append(d)

    pairs = 0
    for (gx, gy), cell_dots in grid.items():
        neighbours = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                neighbours.extend(grid.get((gx + dx, gy + dy), []))
        for i, a in enumerate(cell_dots):
            for b in neighbours:
                if a is b:
                    continue
                dist = math.hypot(a.x_mm - b.x_mm, a.y_mm - b.y_mm)
                gap = dist - (a.diameter_mm + b.diameter_mm) / 2.0
                if gap < min_gap_mm:
                    pairs += 1
    return pairs // 2  # each pair counted twice
