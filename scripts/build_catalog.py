"""Build the bundled bright-star catalog from the Hipparcos catalogue.

This is a one-time data-preparation script. It downloads the Hipparcos main
catalogue via Skyfield, filters to visually useful stars (magnitude <= 7.0),
normalises the fields the application needs, attaches a small set of common
proper names, and writes a compact CSV into ``data/catalog/``.

The generated CSV is committed to the repository so the running application
never needs network access to load the catalogue.

Usage:
    python scripts/build_catalog.py
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

from skyfield.api import load
from skyfield.data import hipparcos

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_CSV = REPO_ROOT / "data" / "catalog" / "hip_bright.csv"
NAMES_JSON = REPO_ROOT / "data" / "catalog" / "star_names.json"

# Magnitude cut-off for the bundled catalogue. The application default limit is
# 5.8 and the maximum selectable limit is 7.0, so 7.0 covers every use case.
MAGNITUDE_CUTOFF = 7.0


def load_common_names() -> dict[int, str]:
    """Return a mapping of HIP id -> common proper name.

    The list is intentionally small (the brightest and most recognisable
    stars). Names are the IAU-approved common names, which are not subject to
    copyright.
    """
    if NAMES_JSON.exists():
        raw = json.loads(NAMES_JSON.read_text())
        return {int(k): v for k, v in raw.items()}
    return {}


def main() -> None:
    print("Loading Hipparcos catalogue via Skyfield ...")
    with load.open(hipparcos.URL) as f:
        df = hipparcos.load_dataframe(f)

    print(f"  raw rows: {len(df)}")
    df = df[df["magnitude"] <= MAGNITUDE_CUTOFF].copy()
    df = df.dropna(subset=["ra_degrees", "dec_degrees", "magnitude"])
    print(f"  rows with magnitude <= {MAGNITUDE_CUTOFF}: {len(df)}")

    names = load_common_names()

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    with OUT_CSV.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(
            [
                "id",
                "ra_deg",
                "dec_deg",
                "mag",
                "pm_ra_mas_yr",
                "pm_dec_mas_yr",
                "common_name",
            ]
        )
        for hip_id, row in df.iterrows():
            pm_ra = row.get("ra_mas_per_year", 0.0)
            pm_dec = row.get("dec_mas_per_year", 0.0)
            writer.writerow(
                [
                    int(hip_id),
                    f"{row['ra_degrees']:.6f}",
                    f"{row['dec_degrees']:.6f}",
                    f"{row['magnitude']:.3f}",
                    f"{0.0 if pm_ra != pm_ra else pm_ra:.2f}",
                    f"{0.0 if pm_dec != pm_dec else pm_dec:.2f}",
                    names.get(int(hip_id), ""),
                ]
            )
            written += 1

    print(f"Wrote {written} stars to {OUT_CSV.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
