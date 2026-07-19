"""One-time data setup: star catalogue + JPL ephemeris.

Run once after cloning:

    python scripts/setup_data.py

* Ensures the bright-star catalogue CSV exists (rebuilds from Hipparcos if not).
* Downloads the JPL DE421 ephemeris into ``data/ephemeris/`` for Skyfield.

Both are cached locally; the running application makes no network calls per map.
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG = REPO_ROOT / "data" / "catalog" / "hip_bright.csv"
EPHEMERIS = REPO_ROOT / "data" / "ephemeris" / "de421.bsp"


def ensure_catalog() -> None:
    if CATALOG.exists():
        print(f"[ok] Star catalogue present: {CATALOG.relative_to(REPO_ROOT)}")
        return
    print("[..] Building star catalogue from Hipparcos ...")
    import build_catalog  # noqa: F401  (script in the same directory)

    build_catalog.main()


def ensure_ephemeris() -> None:
    EPHEMERIS.parent.mkdir(parents=True, exist_ok=True)
    if EPHEMERIS.exists():
        print(f"[ok] Ephemeris present: {EPHEMERIS.relative_to(REPO_ROOT)}")
        return
    print("[..] Downloading JPL DE421 ephemeris (~17 MB) ...")
    from skyfield.api import load

    loader = load.Loader(str(EPHEMERIS.parent))
    loader("de421.bsp")
    print(f"[ok] Ephemeris downloaded: {EPHEMERIS.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    ensure_catalog()
    ensure_ephemeris()
    print("Data setup complete.")
