"""Application configuration.

Settings are read from environment variables (12-factor style) with sensible
defaults for local development. Data paths default to the repository ``data/``
directory so the app works out of the box after ``scripts/setup_data.py``.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> repo root is three levels up.
REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="STARMAP_", env_file=".env", extra="ignore")

    # --- Data locations -----------------------------------------------------
    data_dir: Path = REPO_ROOT / "data"
    catalog_path: Path = REPO_ROOT / "data" / "catalog" / "hip_bright.csv"
    constellations_path: Path = REPO_ROOT / "data" / "catalog" / "constellation_lines.json"
    ephemeris_path: Path = REPO_ROOT / "data" / "ephemeris" / "de421.bsp"
    fonts_dir: Path = REPO_ROOT / "backend" / "app" / "fonts"

    # --- Geocoding ----------------------------------------------------------
    geocode_url: str = "https://nominatim.openstreetmap.org/search"
    geocode_user_agent: str = "starmap-laser-mvp/0.1 (contact: set STARMAP_GEOCODE_USER_AGENT)"
    geocode_timeout_s: float = 8.0
    geocode_rate_limit_s: float = 1.0  # Nominatim policy: max 1 req/sec.

    # --- API hygiene --------------------------------------------------------
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    max_request_bytes: int = 64 * 1024

    # --- Astronomy defaults -------------------------------------------------
    catalog_source: str = "Hipparcos main catalogue (ESA 1997), mag <= 7.0 subset"
    ephemeris_source: str = "JPL DE421"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
