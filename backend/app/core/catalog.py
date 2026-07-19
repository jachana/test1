"""Bright-star catalogue loading and in-memory caching.

The catalogue CSV (derived from Hipparcos, see ``scripts/build_catalog.py``) is
loaded once per process into NumPy arrays for fast vectorised transformation.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

from ..config import get_settings


@dataclass(frozen=True)
class StarCatalog:
    ids: np.ndarray  # int64 HIP ids
    ra_deg: np.ndarray  # float64
    dec_deg: np.ndarray  # float64
    magnitude: np.ndarray  # float64
    pm_ra_mas_yr: np.ndarray  # float64 (mu_alpha* )
    pm_dec_mas_yr: np.ndarray  # float64
    common_names: list[str]

    def __len__(self) -> int:
        return int(self.ids.shape[0])

    def index_by_id(self) -> dict[int, int]:
        return {int(hip): i for i, hip in enumerate(self.ids)}


def load_catalog_from_path(path: Path) -> StarCatalog:
    ids: list[int] = []
    ra: list[float] = []
    dec: list[float] = []
    mag: list[float] = []
    pm_ra: list[float] = []
    pm_dec: list[float] = []
    names: list[str] = []

    with path.open(newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            ids.append(int(row["id"]))
            ra.append(float(row["ra_deg"]))
            dec.append(float(row["dec_deg"]))
            mag.append(float(row["mag"]))
            pm_ra.append(float(row["pm_ra_mas_yr"] or 0.0))
            pm_dec.append(float(row["pm_dec_mas_yr"] or 0.0))
            names.append(row.get("common_name", "") or "")

    return StarCatalog(
        ids=np.asarray(ids, dtype=np.int64),
        ra_deg=np.asarray(ra, dtype=np.float64),
        dec_deg=np.asarray(dec, dtype=np.float64),
        magnitude=np.asarray(mag, dtype=np.float64),
        pm_ra_mas_yr=np.asarray(pm_ra, dtype=np.float64),
        pm_dec_mas_yr=np.asarray(pm_dec, dtype=np.float64),
        common_names=names,
    )


@lru_cache(maxsize=1)
def get_catalog() -> StarCatalog:
    """Return the process-wide cached catalogue (loaded on first call)."""
    settings = get_settings()
    if not settings.catalog_path.exists():
        raise FileNotFoundError(
            f"Star catalogue not found at {settings.catalog_path}. "
            "Run `python scripts/build_catalog.py` to generate it."
        )
    return load_catalog_from_path(settings.catalog_path)
