"""Render orchestration: scene -> SVG -> validation -> metadata / PNG.

Ties the pipeline stages together and produces the API-facing response objects.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone

from ..config import get_settings
from ..core.svg import build_svg
from ..core.validation import validate_design
from ..models.schemas import (
    AstronomyMetadata,
    MapRequest,
    ValidationIssue,
    ValidationReport,
    VisibleBody,
    VisibleStar,
)
from . import presets
from .pipeline import compute_scene


class RenderBundle:
    def __init__(self, request: MapRequest):
        self.request = request
        self.scene = compute_scene(request.observer, request.sky)
        self.render = build_svg(request, self.scene)
        thresholds = presets.thresholds_for_material(request.engraving.material_preset)
        # Honour explicit engraving minimums if stricter than the material preset.
        thresholds = _merge_thresholds(thresholds, request)
        self.issues = validate_design(
            self.render, thresholds, request.engraving.constellation_stroke_mm
        )

    @property
    def svg(self) -> str:
        return self.render.svg

    def validation_report(self) -> ValidationReport:
        issues = [
            ValidationIssue(level=i.level, code=i.code, message=i.message, count=i.count)
            for i in self.issues
        ]
        ok = not any(i.level == "error" for i in issues)
        return ValidationReport(issues=issues, ok=ok)

    def astronomy_metadata(self) -> AstronomyMetadata:
        settings = get_settings()
        rt = self.scene.resolved_time
        return AstronomyMetadata(
            latitude=self.request.observer.latitude,
            longitude=self.request.observer.longitude,
            elevation_m=self.request.observer.elevation_m,
            timezone=self.request.observer.timezone,
            local_datetime=rt.local_datetime.isoformat(),
            utc_datetime=rt.utc_datetime.isoformat(),
            utc_offset_hours=rt.utc_offset_hours,
            is_dst=rt.is_dst,
            ambiguous_local_time=rt.ambiguous,
            imaginary_local_time=rt.imaginary,
            magnitude_limit=self.request.sky.magnitude_limit,
            catalog_source=settings.catalog_source,
            ephemeris_source=settings.ephemeris_source,
            projection="azimuthal-equidistant (zenith-centred)",
            rotation_degrees=self.request.sky.rotation_degrees,
            catalog_stars_processed=self.scene.catalog_stars_processed,
            stars_above_horizon=self.scene.stars_above_horizon,
        )

    def visible_stars(self, limit: int | None = None) -> list[VisibleStar]:
        stars = [
            VisibleStar(
                id=s.id,
                magnitude=round(s.magnitude, 3),
                altitude_deg=round(s.altitude_deg, 4),
                azimuth_deg=round(s.azimuth_deg, 4),
                common_name=s.common_name or None,
            )
            for s in self.scene.iter_stars()
        ]
        return stars[:limit] if limit else stars

    def visible_bodies(self) -> list[VisibleBody]:
        return [
            VisibleBody(
                name=b.name,
                magnitude=b.magnitude,
                altitude_deg=round(b.altitude_deg, 4),
                azimuth_deg=round(b.azimuth_deg, 4),
                phase_fraction=b.phase_fraction,
            )
            for b in self.scene.bodies
        ]

    def png_bytes(self, scale: float = 4.0) -> bytes:
        """Render the SVG to a PNG preview via CairoSVG (raster is preview-only)."""
        import cairosvg

        return cairosvg.svg2png(
            bytestring=self.svg.encode("utf-8"),
            output_width=int(self.render.canvas_width_mm * scale),
            output_height=int(self.render.canvas_height_mm * scale),
            background_color="white",
        )


def _merge_thresholds(thresholds, request: MapRequest):
    from dataclasses import replace

    return replace(
        thresholds,
        min_dot_mm=min(thresholds.min_dot_mm, request.engraving.minimum_dot_mm),
        min_stroke_mm=min(thresholds.min_stroke_mm, request.engraving.constellation_stroke_mm),
    )


def safe_filename(request: MapRequest, extension: str) -> str:
    """Generate a safe download filename from location + date (no path traversal)."""
    base = request.personalization.location_text or request.observer.location_name or "starmap"
    date_part = request.observer.local_datetime.date().isoformat()
    raw = f"{base}-{date_part}"
    # ASCII-fold, keep alnum/dash/underscore only.
    normalized = unicodedata.normalize("NFKD", raw).encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", normalized).strip("-").lower()
    cleaned = re.sub(r"-{2,}", "-", cleaned) or "starmap"
    return f"{cleaned[:80]}.{extension}"


def utc_stamp() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
