"""Local-time to UTC conversion with correct DST handling.

The astronomical sky depends on the *instant* of observation, so we must
resolve the user's wall-clock local time (in a specific IANA timezone) to a
unique UTC instant. Daylight-saving transitions create two edge cases:

* **Non-existent times** – e.g. the hour skipped forward in spring. ``zoneinfo``
  represents these by extrapolating; we detect and report them.
* **Ambiguous times** – e.g. the hour repeated in autumn. ``zoneinfo`` lets us
  pick ``fold=0`` (first occurrence) or ``fold=1`` (second). We default to the
  first occurrence and flag the ambiguity.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class InvalidTimezoneError(ValueError):
    """Raised when the supplied timezone name is not a valid IANA zone."""


@dataclass(frozen=True)
class ResolvedTime:
    local_datetime: datetime  # timezone-aware, in the requested zone
    utc_datetime: datetime  # timezone-aware, UTC
    timezone_name: str
    utc_offset_hours: float
    is_dst: bool
    ambiguous: bool  # local time occurs twice (autumn fall-back)
    imaginary: bool  # local time does not exist (spring forward)


def _load_zone(timezone_name: str) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError, KeyError) as exc:
        raise InvalidTimezoneError(f"Unknown IANA timezone: {timezone_name!r}") from exc


def resolve_local_time(naive_local: datetime, timezone_name: str) -> ResolvedTime:
    """Resolve a naive local datetime in ``timezone_name`` to a UTC instant.

    Args:
        naive_local: A naive (tzinfo-free) datetime representing wall-clock
            local time.
        timezone_name: An IANA timezone name, e.g. ``"America/New_York"``.
    """
    if naive_local.tzinfo is not None:
        naive_local = naive_local.replace(tzinfo=None)

    zone = _load_zone(timezone_name)

    # First occurrence (fold=0).
    local_dt = naive_local.replace(tzinfo=zone, fold=0)
    utc_dt = local_dt.astimezone(timezone.utc)

    # Ambiguity check: fold=0 and fold=1 give different UTC offsets.
    local_fold1 = naive_local.replace(tzinfo=zone, fold=1)
    ambiguous = local_dt.utcoffset() != local_fold1.utcoffset()

    # Imaginary-time check: round-trip through UTC. If the wall clock changes,
    # the local time never actually existed (spring-forward gap).
    roundtrip = utc_dt.astimezone(zone).replace(tzinfo=None)
    imaginary = roundtrip != naive_local

    offset = local_dt.utcoffset()
    dst = local_dt.dst()
    return ResolvedTime(
        local_datetime=local_dt,
        utc_datetime=utc_dt,
        timezone_name=timezone_name,
        utc_offset_hours=offset.total_seconds() / 3600.0 if offset else 0.0,
        is_dst=bool(dst) and dst.total_seconds() != 0,
        ambiguous=ambiguous,
        imaginary=imaginary,
    )
