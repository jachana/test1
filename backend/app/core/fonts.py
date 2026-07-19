"""Font handling and text-to-path conversion using fontTools.

Production SVG export converts text into vector outlines so the engraving does
not depend on fonts installed on the end-user's machine. Three bundled,
permissively-licensed fonts are exposed:

* ``script-default`` – Great Vibes (SIL OFL 1.1) – for names.
* ``sans-default``   – DejaVu Sans (Bitstream Vera / public-domain amendment).
* ``serif-default``  – DejaVu Serif.

Only these bundled fonts are selectable; user-supplied font paths are never
accepted (see the security notes in docs/).
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

from ..config import get_settings

FONT_FILES: dict[str, str] = {
    "script-default": "GreatVibes-Regular.ttf",
    "sans-default": "DejaVuSans.ttf",
    "serif-default": "DejaVuSerif.ttf",
}

# CSS font-family fallbacks for on-screen (non-outlined) preview text.
FONT_CSS_FAMILY: dict[str, str] = {
    "script-default": "'Great Vibes', cursive",
    "sans-default": "'DejaVu Sans', sans-serif",
    "serif-default": "'DejaVu Serif', serif",
}


@dataclass
class LoadedFont:
    key: str
    font: TTFont
    units_per_em: int


def resolve_font_key(key: str) -> str:
    """Map an unknown/aliased font key to a known bundled font."""
    if key in FONT_FILES:
        return key
    if "script" in key:
        return "script-default"
    if "serif" in key:
        return "serif-default"
    return "sans-default"


@lru_cache(maxsize=8)
def load_font(key: str) -> LoadedFont:
    key = resolve_font_key(key)
    fonts_dir: Path = get_settings().fonts_dir
    path = fonts_dir / FONT_FILES[key]
    font = TTFont(str(path))
    upem = int(font["head"].unitsPerEm)
    return LoadedFont(key=key, font=font, units_per_em=upem)


def _hmtx_advance(font: TTFont, glyph_name: str) -> int:
    return font["hmtx"][glyph_name][0]


@dataclass
class TextPath:
    """A text string rendered as SVG path data at a given height, plus width."""

    path_d: str
    width_mm: float
    height_mm: float


def text_to_path(
    text: str,
    font_key: str,
    height_mm: float,
    x_mm: float,
    baseline_y_mm: float,
    anchor: str = "middle",
) -> TextPath:
    """Convert ``text`` to a single SVG path ``d`` string positioned on the artboard.

    The glyph outlines are scaled so the em-height equals ``height_mm`` and
    translated so the text sits on the baseline at ``baseline_y_mm``. SVG y grows
    downward, so we flip the glyph y-axis.
    """
    loaded = load_font(font_key)
    font = loaded.font
    upem = loaded.units_per_em
    scale = height_mm / upem

    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()

    # First pass: total advance width in font units.
    total_advance = 0
    runs: list[tuple[str, int]] = []
    for ch in text:
        glyph_name = cmap.get(ord(ch))
        if glyph_name is None:
            glyph_name = ".notdef" if ".notdef" in glyph_set else None
        adv = _hmtx_advance(font, glyph_name) if glyph_name else int(upem * 0.5)
        runs.append((glyph_name, adv))
        total_advance += adv

    width_mm = total_advance * scale
    if anchor == "middle":
        start_x = x_mm - width_mm / 2.0
    elif anchor == "end":
        start_x = x_mm - width_mm
    else:  # start
        start_x = x_mm

    parts: list[str] = []
    pen_x_units = 0
    for glyph_name, adv in runs:
        if glyph_name and glyph_name in glyph_set:
            pen = SVGPathPen(glyph_set)
            glyph_set[glyph_name].draw(pen)
            d = pen.getCommands()
            if d:
                tx = start_x + pen_x_units * scale
                # transform: translate then scale with y flipped (glyph y-up -> svg y-down)
                parts.append(
                    f'<path d="{d}" transform="translate({_f(tx)},{_f(baseline_y_mm)}) '
                    f'scale({_f(scale)},{_f(-scale)})"/>'
                )
        pen_x_units += adv

    return TextPath(path_d="".join(parts), width_mm=width_mm, height_mm=height_mm)


def measure_text_width_mm(text: str, font_key: str, height_mm: float) -> float:
    loaded = load_font(font_key)
    font = loaded.font
    upem = loaded.units_per_em
    cmap = font.getBestCmap()
    total = 0
    for ch in text:
        glyph_name = cmap.get(ord(ch))
        total += _hmtx_advance(font, glyph_name) if glyph_name else int(upem * 0.5)
    return total * (height_mm / upem)


def _f(value: float) -> str:
    return f"{value:.4f}".rstrip("0").rstrip(".")
