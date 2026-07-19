"""Integrity tests for the bundled constellation dataset."""

from __future__ import annotations

from app.core.catalog import get_catalog
from app.core.constellations import get_constellations


def test_all_endpoints_exist_in_catalog():
    """Every constellation line endpoint must be a HIP id in the catalogue."""
    catalog_ids = set(int(i) for i in get_catalog().ids)
    cset = get_constellations()
    missing: set[int] = set()
    for constellation in cset.constellations:
        for a, b in constellation.segments:
            if a not in catalog_ids:
                missing.add(a)
            if b not in catalog_ids:
                missing.add(b)
        if constellation.label_star not in catalog_ids:
            missing.add(constellation.label_star)
    assert not missing, f"Constellation endpoints not in catalogue: {sorted(missing)}"


def test_zodiac_constellations_present():
    ids = {c.id for c in get_constellations().constellations}
    zodiac = {"Ari", "Tau", "Gem", "Cnc", "Leo", "Vir", "Lib", "Sco", "Sgr", "Cap", "Aqr", "Psc"}
    assert zodiac.issubset(ids), f"Missing zodiac: {zodiac - ids}"


def test_constellation_ids_unique():
    ids = [c.id for c in get_constellations().constellations]
    assert len(ids) == len(set(ids))


def test_no_self_loops():
    for c in get_constellations().constellations:
        for a, b in c.segments:
            assert a != b, f"{c.id} has a zero-length (self-loop) segment"
