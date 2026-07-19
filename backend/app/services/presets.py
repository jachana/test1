"""Material and template preset loading with validation-threshold mapping."""

from __future__ import annotations

import json
from functools import lru_cache

from ..config import get_settings
from ..core.validation import ValidationThresholds


@lru_cache(maxsize=1)
def load_material_presets() -> list[dict]:
    settings = get_settings()
    path = settings.data_dir / "presets" / "materials.json"
    data = json.loads(path.read_text())
    return data["presets"]


def get_material_preset(preset_id: str) -> dict | None:
    for preset in load_material_presets():
        if preset["id"] == preset_id:
            return preset
    return None


def thresholds_for_material(preset_id: str) -> ValidationThresholds:
    """Return validation thresholds tuned to a material (falls back to defaults)."""
    preset = get_material_preset(preset_id)
    if preset is None:
        return ValidationThresholds()
    return ValidationThresholds(
        min_dot_mm=preset.get("minimum_dot_mm", 0.25),
        min_stroke_mm=preset.get("minimum_stroke_mm", 0.15),
        min_text_height_mm=preset.get("minimum_text_height_mm", 3.0),
    )


# Starter templates (layout + personalisation presets) for the UI.
_TEMPLATES = [
    {
        "id": "anniversary_portrait",
        "label": "Anniversary (portrait)",
        "canvas_width_mm": 300,
        "canvas_height_mm": 400,
        "map_diameter_mm": 220,
        "outer_margin_mm": 15,
    },
    {
        "id": "square_keepsake",
        "label": "Square keepsake",
        "canvas_width_mm": 300,
        "canvas_height_mm": 300,
        "map_diameter_mm": 240,
        "outer_margin_mm": 12,
    },
    {
        "id": "wide_plaque",
        "label": "Wide plaque",
        "canvas_width_mm": 400,
        "canvas_height_mm": 300,
        "map_diameter_mm": 200,
        "outer_margin_mm": 15,
    },
]


def load_templates() -> list[dict]:
    return _TEMPLATES
