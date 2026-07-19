"""Pydantic schemas for the star-map API.

These define the request/response contract and provide validation (latitude
bounds, magnitude range, canvas sizes) at the edge of the system.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


# --------------------------------------------------------------------------- #
# Request sub-models
# --------------------------------------------------------------------------- #
class Observer(BaseModel):
    location_name: str = Field(default="", max_length=200)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    elevation_m: float = Field(default=0.0, ge=-500.0, le=9000.0)
    timezone: str = Field(..., min_length=1, max_length=64)
    local_datetime: datetime


class SkySettings(BaseModel):
    magnitude_limit: float = Field(default=5.8, ge=3.0, le=7.0)
    rotation_degrees: float = Field(default=0.0, ge=-360.0, le=360.0)
    show_constellations: bool = True
    show_constellation_labels: bool = False
    show_planets: bool = True
    show_moon: bool = True
    show_sun: bool = False
    show_cardinal_directions: bool = False


class LayoutSettings(BaseModel):
    canvas_width_mm: float = Field(default=300.0, ge=50.0, le=1000.0)
    canvas_height_mm: float = Field(default=400.0, ge=50.0, le=1000.0)
    map_diameter_mm: float = Field(default=220.0, ge=30.0, le=900.0)
    map_center_x_mm: float | None = None
    map_center_y_mm: float | None = None
    outer_margin_mm: float = Field(default=15.0, ge=0.0, le=100.0)


class EngravingSettings(BaseModel):
    minimum_dot_mm: float = Field(default=0.30, ge=0.05, le=5.0)
    maximum_dot_mm: float = Field(default=1.80, ge=0.10, le=10.0)
    brightness_exponent: float = Field(default=1.8, ge=0.5, le=4.0)
    constellation_stroke_mm: float = Field(default=0.20, ge=0.05, le=2.0)
    minimum_gap_mm: float = Field(default=0.20, ge=0.0, le=5.0)
    material_preset: str = Field(default="birch_plywood", max_length=64)

    @field_validator("maximum_dot_mm")
    @classmethod
    def max_ge_min(cls, v: float, info):  # noqa: ANN001
        return v


class Personalization(BaseModel):
    names: str = Field(default="", max_length=120)
    headline: str = Field(default="", max_length=160)
    location_text: str = Field(default="", max_length=160)
    date_text: str = Field(default="", max_length=80)
    time_text: str = Field(default="", max_length=40)
    custom_message: str = Field(default="", max_length=200)
    show_coordinates: bool = True
    show_time: bool = False
    names_font: str = Field(default="script-default", max_length=40)
    details_font: str = Field(default="sans-default", max_length=40)


class ExportSettings(BaseModel):
    convert_text_to_paths: bool = True
    include_metadata: bool = True


class MapRequest(BaseModel):
    observer: Observer
    sky: SkySettings = Field(default_factory=SkySettings)
    layout: LayoutSettings = Field(default_factory=LayoutSettings)
    engraving: EngravingSettings = Field(default_factory=EngravingSettings)
    personalization: Personalization = Field(default_factory=Personalization)
    export: ExportSettings = Field(default_factory=ExportSettings)


# --------------------------------------------------------------------------- #
# Response sub-models
# --------------------------------------------------------------------------- #
class VisibleStar(BaseModel):
    id: int
    magnitude: float
    altitude_deg: float
    azimuth_deg: float
    common_name: str | None = None


class VisibleBody(BaseModel):
    name: str
    magnitude: float
    altitude_deg: float
    azimuth_deg: float
    phase_fraction: float | None = None


class AstronomyMetadata(BaseModel):
    latitude: float
    longitude: float
    elevation_m: float
    timezone: str
    local_datetime: str
    utc_datetime: str
    utc_offset_hours: float
    is_dst: bool
    ambiguous_local_time: bool
    imaginary_local_time: bool
    magnitude_limit: float
    catalog_source: str
    ephemeris_source: str
    projection: str
    rotation_degrees: float
    catalog_stars_processed: int
    stars_above_horizon: int


class CalculateResponse(BaseModel):
    metadata: AstronomyMetadata
    stars: list[VisibleStar]
    bodies: list[VisibleBody]


class ValidationIssue(BaseModel):
    level: Literal["info", "warning", "error"]
    code: str
    message: str
    count: int = 1


class ValidationReport(BaseModel):
    issues: list[ValidationIssue]
    ok: bool  # True when there are no error-level issues


class PreviewResponse(BaseModel):
    svg: str
    validation: ValidationReport
    metadata: AstronomyMetadata
    normalized_request: MapRequest
    star_count: int
    body_count: int


class GeocodeRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)


class GeocodeResponse(BaseModel):
    display_name: str
    latitude: float
    longitude: float
    timezone: str


class MaterialPreset(BaseModel):
    id: str
    label: str
    minimum_dot_mm: float
    minimum_stroke_mm: float
    minimum_text_height_mm: float
    recommended_density: str
    note: str


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
