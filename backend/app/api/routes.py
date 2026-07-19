"""API v1 routes.

Route handlers stay thin: they validate input via Pydantic, delegate to the
service layer, and shape responses. No astronomy or SVG logic lives here.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Response

from ..config import get_settings
from ..core.catalog import get_catalog
from ..core.planets import ephemeris_available
from ..core.timeconv import InvalidTimezoneError
from ..models.schemas import (
    CalculateResponse,
    GeocodeRequest,
    GeocodeResponse,
    MapRequest,
    MaterialPreset,
    PreviewResponse,
)
from ..services import presets
from ..services.geocode import GeocodeError, geocode
from ..services.render import RenderBundle, safe_filename

logger = logging.getLogger("starmap.api")
router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    catalog_ok = settings.catalog_path.exists()
    star_count = 0
    if catalog_ok:
        try:
            star_count = len(get_catalog())
        except Exception:  # pragma: no cover - defensive
            catalog_ok = False
    return {
        "status": "ok" if catalog_ok else "degraded",
        "version": __import__("app").__version__,
        "catalog_loaded": catalog_ok,
        "catalog_stars": star_count,
        "ephemeris_available": ephemeris_available(),
        "catalog_source": settings.catalog_source,
        "ephemeris_source": settings.ephemeris_source,
    }


def _build_bundle(request: MapRequest) -> RenderBundle:
    try:
        return RenderBundle(request)
    except InvalidTimezoneError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/maps/calculate", response_model=CalculateResponse)
def calculate(request: MapRequest) -> CalculateResponse:
    bundle = _build_bundle(request)
    return CalculateResponse(
        metadata=bundle.astronomy_metadata(),
        stars=bundle.visible_stars(),
        bodies=bundle.visible_bodies(),
    )


@router.post("/maps/preview", response_model=PreviewResponse)
def preview(request: MapRequest) -> PreviewResponse:
    bundle = _build_bundle(request)
    return PreviewResponse(
        svg=bundle.svg,
        validation=bundle.validation_report(),
        metadata=bundle.astronomy_metadata(),
        normalized_request=request,
        star_count=bundle.scene.stars_above_horizon,
        body_count=len(bundle.scene.bodies),
    )


@router.post("/maps/export/svg")
def export_svg(request: MapRequest) -> Response:
    bundle = _build_bundle(request)
    filename = safe_filename(request, "svg")
    report = bundle.validation_report()
    return Response(
        content=bundle.svg,
        media_type="image/svg+xml",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Validation-Ok": "true" if report.ok else "false",
            "X-Validation-Report": json.dumps(
                [i.model_dump() for i in report.issues]
            ),
        },
    )


@router.post("/maps/export/png")
def export_png(request: MapRequest) -> Response:
    bundle = _build_bundle(request)
    try:
        png = bundle.png_bytes()
    except Exception as exc:  # pragma: no cover - cairo/runtime failure
        raise HTTPException(status_code=500, detail=f"PNG rendering failed: {exc}") from exc
    filename = safe_filename(request, "png")
    return Response(
        content=png,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/geocode", response_model=GeocodeResponse)
def geocode_endpoint(request: GeocodeRequest) -> GeocodeResponse:
    try:
        result = geocode(request.query)
    except GeocodeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return GeocodeResponse(**result)


@router.get("/presets/materials", response_model=list[MaterialPreset])
def material_presets() -> list[MaterialPreset]:
    return [
        MaterialPreset(
            id=p["id"],
            label=p["label"],
            minimum_dot_mm=p["minimum_dot_mm"],
            minimum_stroke_mm=p["minimum_stroke_mm"],
            minimum_text_height_mm=p["minimum_text_height_mm"],
            recommended_density=p["recommended_density"],
            note=p["note"],
        )
        for p in presets.load_material_presets()
    ]


@router.get("/presets/templates")
def template_presets() -> list[dict]:
    return presets.load_templates()
