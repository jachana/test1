"""Constellation-line dataset loading.

Line endpoints reference Hipparcos ids from the star catalogue. Segments whose
endpoints are missing (or below the horizon) are skipped by the pipeline.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from ..config import get_settings


@dataclass(frozen=True)
class Constellation:
    id: str
    name: str
    label_star: int
    segments: list[tuple[int, int]]


@dataclass(frozen=True)
class ConstellationSet:
    constellations: list[Constellation]
    license: str


def load_constellations_from_path(path: Path) -> ConstellationSet:
    data = json.loads(path.read_text())
    constellations = [
        Constellation(
            id=c["id"],
            name=c["name"],
            label_star=int(c["label_star"]),
            segments=[(int(a), int(b)) for a, b in c["segments"]],
        )
        for c in data["constellations"]
    ]
    return ConstellationSet(
        constellations=constellations,
        license=data.get("meta", {}).get("license", "unknown"),
    )


@lru_cache(maxsize=1)
def get_constellations() -> ConstellationSet:
    settings = get_settings()
    if not settings.constellations_path.exists():
        raise FileNotFoundError(
            f"Constellation dataset not found at {settings.constellations_path}."
        )
    return load_constellations_from_path(settings.constellations_path)
