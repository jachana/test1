# Astronomy Notes

## Why exact time is required

The sky rotates ~15° per hour. A star map is only truthful for a specific
**instant** — a difference of a few minutes visibly moves objects near the
horizon, and a few hours rotates the whole sky. The app therefore refuses to
claim a map represents a real sky unless date, exact local time, location, and
timezone are all resolved.

## Local time vs UTC, time zones and DST

Users think in wall-clock local time ("9:30 PM"). Astronomy works in UTC. We
resolve the naive local datetime through the requested IANA timezone
(`zoneinfo`), which knows the full history of UTC-offset and daylight-saving
rules for that zone. Two edge cases are detected and flagged:

- **Ambiguous times** (autumn "fall back" — the hour repeats). We take the first
  occurrence (`fold=0`) and set `ambiguous_local_time`.
- **Imaginary times** (spring "forward" — the hour is skipped). We report
  `imaginary_local_time`.

Example: `2017-09-26 21:30` in `America/New_York` is EDT (UTC−4, DST active), so
UTC = `2017-09-27 01:30`.

## Altitude and azimuth

Equatorial coordinates (right ascension / declination) are fixed to the stars.
For a given observer and instant we convert to **horizontal** coordinates:

- **Altitude** — degrees above the horizon (0 = horizon, 90 = zenith).
- **Azimuth** — compass bearing, measured clockwise from North (N=0°, E=90°,
  S=180°, W=270°).

The transform uses local sidereal time (from Greenwich Mean Sidereal Time plus
longitude) and the observer's latitude. Objects with altitude ≤ 0 are below the
horizon and removed.

## Projection orientation

We use a zenith-centred azimuthal projection: zenith at the centre, horizon at
the outer circle, altitude → radial distance, azimuth → angle. North is at the
top; East is to the right (the map is **not** mirrored). Rotation is a
user-controlled offset added to every azimuth.

## Magnitude

Apparent magnitude is a logarithmic, **inverse** brightness scale: brighter
objects have *smaller* (even negative) magnitudes (Sirius ≈ −1.46, faint
naked-eye stars ≈ +6). The engraving maps magnitude to dot diameter with a
configurable power curve so the brightest stars stand out.

## Proper motion & precession

- **Proper motion** — stars drift across the sky (mas/year). We advance
  catalogue positions from epoch J1991.25 to the observation date.
- **Precession** — Earth's axis wobbles, moving the equinox ~50″/year. We precess
  positions from J2000 to the equinox of date (IAU 1976 angles). Without this,
  constellation shapes would visibly distort for dates far from 2000.

## Accuracy limitations

This is an MVP tuned for *engraving*, where a dot is ~0.3–1.8 mm across:

- Star Alt/Az agrees with Astropy to well under 1 arc-minute — far finer than any
  engraved feature.
- We use mean (not apparent) sidereal time and omit nutation, stellar
  aberration, atmospheric refraction, and parallax. Each is at most tens of
  arc-seconds and irrelevant at this physical scale.
- Planet/Moon positions come from Skyfield + JPL DE421 and are accurate to well
  under an arc-minute within the ephemeris date range (~1899–2053).
- The catalogue is limited to magnitude ≤ 7.0 (naked-eye plus a margin), not the
  full Gaia billion-star catalogue.
