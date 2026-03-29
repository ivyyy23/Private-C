"""Cross-check Gemini output with user preferences → alert flags for the extension."""

from __future__ import annotations

from typing import Any

from app.models.documents import SensitiveFlags, UserPreferences


def build_alert_flags(
    ai: dict[str, Any],
    prefs: UserPreferences,
) -> list[str]:
    flags: list[str] = []
    risk = int(ai.get("risk_score", 0))
    if risk >= 70:
        flags.append("high_risk_score")
    elif risk >= 45:
        flags.append("elevated_risk_score")

    text_blob = " ".join(
        [
            ai.get("plain_english_explanation", ""),
            " ".join(ai.get("concerning_clauses", [])),
            " ".join(ai.get("hidden_risks", [])),
        ]
    ).lower()

    sf: SensitiveFlags = prefs.sensitive_flags

    if sf.location_tracking and any(
        x in text_blob for x in ("location", "geolocation", "gps", "precise location", "where you are")
    ):
        flags.append("location_tracking_mentioned")

    if sf.biometric_collection and any(
        x in text_blob for x in ("biometric", "fingerprint", "face", "voice", "iris")
    ):
        flags.append("biometric_collection_mentioned")

    if sf.third_party_sale and any(
        x in text_blob for x in ("sell", "sale", "broker", "monetiz", "advertising partner")
    ):
        flags.append("third_party_commercial_use")

    if sf.cross_site_tracking and any(
        x in text_blob for x in ("cookie", "pixel", "tracking", "cross-app", "behavioral")
    ):
        flags.append("cross_site_tracking_mentioned")

    if prefs.alert_mode == "verbose":
        flags.append("verbose_mode")

    return sorted(set(flags))
