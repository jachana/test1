"""Shared pytest fixtures."""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import pytest

# Ensure the backend package is importable when running pytest from anywhere.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.schemas import (  # noqa: E402
    EngravingSettings,
    LayoutSettings,
    MapRequest,
    Observer,
    Personalization,
    SkySettings,
)


def make_request(**overrides) -> MapRequest:
    observer = overrides.pop(
        "observer",
        Observer(
            location_name="Chesapeake, Virginia, USA",
            latitude=36.7682,
            longitude=-76.2875,
            timezone="America/New_York",
            local_datetime=datetime(2017, 9, 26, 21, 30),
        ),
    )
    return MapRequest(
        observer=observer,
        sky=overrides.pop("sky", SkySettings(magnitude_limit=5.8)),
        layout=overrides.pop("layout", LayoutSettings()),
        engraving=overrides.pop("engraving", EngravingSettings()),
        personalization=overrides.pop(
            "personalization",
            Personalization(names="Angelina & Michael", headline="When Two Became One"),
        ),
    )


@pytest.fixture
def chesapeake_request() -> MapRequest:
    return make_request()
