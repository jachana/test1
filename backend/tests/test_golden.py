"""Golden test cases: three real locations/dates with sanity assertions.

These are not snapshot tests — each asserts physically meaningful properties
(UTC conversion, plausible star counts, Polaris placement, orientation, all
stars inside the disc, valid XML).
"""

from __future__ import annotations

import xml.dom.minidom as minidom
from datetime import datetime

import pytest

from app.models.schemas import MapRequest, Observer, SkySettings
from app.services.render import RenderBundle


def _bundle(lat, lon, tz, dt, mag=5.8) -> RenderBundle:
    req = MapRequest(
        observer=Observer(latitude=lat, longitude=lon, timezone=tz, local_datetime=dt),
        sky=SkySettings(magnitude_limit=mag),
    )
    return RenderBundle(req)


def _polaris_altaz(bundle):
    idx = bundle.scene.star_index_by_id()
    i = idx.get(11767)
    if i is None:
        return None
    return float(bundle.scene.star_alt[i]), float(bundle.scene.star_az[i])


def _assert_all_stars_in_disc(bundle):
    proj = bundle.render.projection
    for dot in bundle.render.dots:
        if dot.kind != "star":
            continue
        dx = dot.x_mm - proj.center_x_mm
        dy = dot.y_mm - proj.center_y_mm
        assert dx * dx + dy * dy <= (proj.map_radius_mm + 1e-6) ** 2


def test_golden_chesapeake():
    b = _bundle(36.7682, -76.2875, "America/New_York", datetime(2017, 9, 26, 21, 30))
    md = b.astronomy_metadata()
    assert md.utc_datetime == "2017-09-27T01:30:00+00:00"
    assert 800 < b.scene.stars_above_horizon < 3500
    alt, az = _polaris_altaz(b)
    assert abs(alt - 36.77) < 1.5  # Polaris altitude ~ latitude
    assert az < 3.0 or az > 357.0  # ~ due north
    minidom.parseString(b.svg)
    _assert_all_stars_in_disc(b)


def test_golden_london():
    b = _bundle(51.5074, -0.1278, "Europe/London", datetime(2000, 1, 1, 0, 0))
    md = b.astronomy_metadata()
    # London is on GMT (UTC+0) in January.
    assert md.utc_datetime == "2000-01-01T00:00:00+00:00"
    assert 800 < b.scene.stars_above_horizon < 3500
    alt, az = _polaris_altaz(b)
    assert abs(alt - 51.5) < 1.5
    assert az < 3.0 or az > 357.0
    minidom.parseString(b.svg)
    _assert_all_stars_in_disc(b)


def test_golden_sydney():
    b = _bundle(-33.8688, 151.2093, "Australia/Sydney", datetime(2025, 6, 15, 20, 0))
    md = b.astronomy_metadata()
    # June = standard time in Sydney: UTC+10 -> 20:00 local is 10:00 UTC.
    assert md.utc_datetime == "2025-06-15T10:00:00+00:00"
    assert 800 < b.scene.stars_above_horizon < 3500
    # From the southern hemisphere Polaris is below the horizon (not visible).
    assert _polaris_altaz(b) is None
    minidom.parseString(b.svg)
    _assert_all_stars_in_disc(b)


@pytest.mark.parametrize(
    "lat,lon,tz,dt",
    [
        (36.7682, -76.2875, "America/New_York", datetime(2017, 9, 26, 21, 30)),
        (51.5074, -0.1278, "Europe/London", datetime(2000, 1, 1, 0, 0)),
        (-33.8688, 151.2093, "Australia/Sydney", datetime(2025, 6, 15, 20, 0)),
    ],
)
def test_golden_all_valid_svg_and_bounded(lat, lon, tz, dt):
    b = _bundle(lat, lon, tz, dt)
    minidom.parseString(b.svg)
    _assert_all_stars_in_disc(b)
