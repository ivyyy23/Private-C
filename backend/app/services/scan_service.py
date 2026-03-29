"""Orchestrates policy fetch → hash cache → Gemini → persistence → optional TTS."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.gemini_service import GeminiPolicyService
from app.audio.elevenlabs_service import ElevenLabsAudioService
from app.core.config import Settings
from app.models.documents import PolicySummary, SensitiveFlags, UserPreferences
from app.repositories.audio_logs import AudioLogRepository
from app.repositories.scanned_websites import ScannedWebsiteRepository
from app.repositories.user_scan_history import UserScanHistoryRepository
from app.repositories.users import UserRepository
from app.services.alert_service import build_alert_flags
from app.services.policy_fetcher import fetch_privacy_policy_text, normalize_domain, policy_hash


class ScanSiteService:
    def __init__(self, db: AsyncIOMotorDatabase, settings: Settings) -> None:
        self._db = db
        self._settings = settings
        self._sites = ScannedWebsiteRepository(db)
        self._history = UserScanHistoryRepository(db)
        self._users = UserRepository(db)
        self._audio_logs = AudioLogRepository(db)
        self._gemini = GeminiPolicyService(settings.gemini_api_key, settings.gemini_model)
        self._eleven = ElevenLabsAudioService(settings.elevenlabs_api_key)

    def _user_prefs_from_doc(self, doc: dict[str, Any] | None) -> UserPreferences:
        if not doc:
            return UserPreferences()
        raw = doc.get("preferences") or {}
        try:
            return UserPreferences.model_validate(raw)
        except Exception:
            return UserPreferences()

    def _sensitive_merge(self, prefs: UserPreferences, doc: dict[str, Any] | None) -> SensitiveFlags:
        base = prefs.sensitive_flags.model_dump()
        extra = (doc or {}).get("sensitive_privacy_flags") or {}
        merged = {**base, **{k: bool(v) for k, v in extra.items() if k in base}}
        return SensitiveFlags.model_validate(merged)

    async def scan_site(self, user_id: str, domain: str) -> dict[str, Any]:
        domain_n = normalize_domain(domain)

        await self._users.upsert_by_external_id(
            user_id,
            {"preferences": UserPreferences().model_dump(), "theme": "dark"},
        )
        user_doc = await self._users.find_by_external_id(user_id)

        prefs = self._user_prefs_from_doc(user_doc)
        sensitive = self._sensitive_merge(prefs, user_doc)

        policy_text, source_url = await fetch_privacy_policy_text(domain_n)
        phash = policy_hash(policy_text)

        existing = await self._sites.find_by_domain(domain_n)
        if existing and existing.get("policy_hash") == phash:
            risk = int(existing.get("risk_score", 0))
            summary = (existing.get("policy_summary") or {}).get("short") or ""
            stored_flags = list(existing.get("flags") or [])
            alert_flags = build_alert_flags(
                {
                    "risk_score": risk,
                    "plain_english_explanation": summary,
                    "concerning_clauses": [],
                    "hidden_risks": [],
                },
                prefs,
            )
            audio_url = None
            if prefs.audio_feedback and self._settings.elevenlabs_api_key:
                audio_url = await self._maybe_tts(
                    user_id, domain_n, summary or "Privacy summary unchanged.", prefs
                )

            await self._history.append(user_id, domain_n, risk, "cache_reuse")

            return {
                "risk_score": risk,
                "summary": summary or existing.get("policy_summary", {}).get("short", ""),
                "flags": sorted(set(stored_flags + alert_flags)),
                "audio_url": audio_url,
                "from_cache": True,
                "domain": domain_n,
                "details": {
                    "policy_source": source_url,
                    "policy_hash": phash,
                    "status": existing.get("status"),
                },
            }

        ai = await self._gemini.analyze_policy(policy_text, sensitive)
        risk = int(ai.get("risk_score", 50))
        status = "high_risk" if risk >= 70 else "review" if risk >= 40 else "trusted"

        policy_summary = PolicySummary(
            short=ai.get("summary_short") or ai.get("plain_english_explanation", "")[:500],
            bullets=ai.get("summary_bullets") or [],
        )

        combined_flags = build_alert_flags(ai, prefs)

        await self._sites.upsert_scan(
            domain_n,
            {
                "risk_score": risk,
                "status": status,
                "policy_summary": policy_summary.model_dump(),
                "flags": combined_flags,
                "gemini_version": self._settings.gemini_model,
                "policy_hash": phash,
                "raw_ai_response": ai,
            },
        )

        await self._history.append(user_id, domain_n, risk, "scanned")

        summary_out = policy_summary.short or ai.get("plain_english_explanation", "")

        audio_url = None
        if prefs.audio_feedback and self._settings.elevenlabs_api_key:
            snippet = summary_out[:1200]
            audio_url = await self._maybe_tts(user_id, domain_n, snippet, prefs)

        return {
            "risk_score": risk,
            "summary": summary_out,
            "flags": combined_flags,
            "audio_url": audio_url,
            "from_cache": False,
            "domain": domain_n,
            "details": {
                "policy_source": source_url,
                "policy_hash": phash,
                "status": status,
                "data_collected": ai.get("data_collected"),
                "third_party_sharing": ai.get("third_party_sharing"),
                "hidden_risks": ai.get("hidden_risks"),
            },
        }

    async def _maybe_tts(self, user_id: str, domain: str, text: str, prefs: UserPreferences) -> str | None:
        voice = prefs.voice_id or self._settings.elevenlabs_default_voice_id
        try:
            audio_bytes = await self._eleven.synthesize(text, voice)
        except Exception:
            return None

        Path(self._settings.audio_storage_dir).mkdir(parents=True, exist_ok=True)
        log_id = await self._audio_logs.create(user_id, domain, text, voice, None)
        path = os.path.join(self._settings.audio_storage_dir, f"{log_id}.mp3")
        with open(path, "wb") as f:
            f.write(audio_bytes)
        await self._db["audio_logs"].update_one({"_id": ObjectId(log_id)}, {"$set": {"file_path": path}})
        return f"{self._settings.public_base_url}/api/v1/audio/stream/{log_id}"
