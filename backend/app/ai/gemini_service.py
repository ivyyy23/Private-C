"""
Gemini integration for privacy policy analysis.

Returns structured JSON: risk score, clauses, data practices, plain-language summary.
User sensitive_flags steer prompt emphasis (e.g. location_tracking).
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

import google.generativeai as genai

from app.models.documents import SensitiveFlags


class GeminiPolicyService:
    def __init__(self, api_key: str, model_name: str) -> None:
        self._api_key = api_key
        self._model_name = model_name

    def _build_prompt(self, policy_text: str, flags: SensitiveFlags) -> str:
        priority_lines = []
        if flags.location_tracking:
            priority_lines.append("- User flagged LOCATION: prioritize geolocation, precise location, GPS, and regional tracking language.")
        if flags.biometric_collection:
            priority_lines.append("- User flagged BIOMETRIC: prioritize face, voiceprint, fingerprint, and health-sensor wording.")
        if flags.third_party_sale:
            priority_lines.append("- User flagged THIRD-PARTY SALE: prioritize data brokers, sale, monetization, and advertising partners.")
        if flags.cross_site_tracking:
            priority_lines.append("- User flagged CROSS-SITE TRACKING: prioritize cookies, pixels, ad tech, and cross-context behavioral ads.")

        priorities = "\n".join(priority_lines) if priority_lines else "- Apply balanced emphasis across all categories."

        return f"""You are a privacy policy analyst for a browser security product.

Analyze the following privacy policy text. Focus on:
- Tracking (cookies, pixels, SDKs, analytics)
- Third-party sharing and subprocessors
- Biometric or health-adjacent collection
- Data retention and deletion
- Advertising / marketing use and profiling
- Non-obvious or "hidden" risks (broad definitions, unlimited sharing, children)

User priority hints:
{priorities}

Respond with VALID JSON ONLY (no markdown fences), using this exact schema:
{{
  "risk_score": <integer 0-100, higher = more concerning>,
  "concerning_clauses": [<short strings>],
  "data_collected": [<short strings>],
  "third_party_sharing": [<short strings>],
  "hidden_risks": [<short strings>],
  "plain_english_explanation": "<2-4 sentences for end users>",
  "summary_short": "<one sentence>",
  "summary_bullets": ["<bullet>", "..."]
}}

POLICY TEXT:
---
{policy_text[:120000]}
---
"""

    @staticmethod
    def _extract_json(text: str) -> dict[str, Any]:
        text = text.strip()
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if fence:
            text = fence.group(1).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                return json.loads(text[start : end + 1])
            raise

    async def analyze_policy(
        self,
        policy_text: str,
        sensitive_flags: SensitiveFlags | dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self._api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        if isinstance(sensitive_flags, dict):
            sensitive_flags = SensitiveFlags.model_validate(
                {k: bool(v) for k, v in sensitive_flags.items()}
            )
        elif sensitive_flags is None:
            sensitive_flags = SensitiveFlags()

        prompt = self._build_prompt(policy_text, sensitive_flags)

        def _sync_call() -> str:
            genai.configure(api_key=self._api_key)
            model = genai.GenerativeModel(self._model_name)
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": 8192,
                },
            )
            text = getattr(response, "text", None) or ""
            if not text.strip() and getattr(response, "candidates", None):
                parts = []
                for c in response.candidates:
                    for p in getattr(c.content, "parts", []) or []:
                        if getattr(p, "text", None):
                            parts.append(p.text)
                text = "\n".join(parts)
            if not text.strip():
                raise RuntimeError("Empty Gemini response")
            return text

        raw = await asyncio.to_thread(_sync_call)
        data = self._extract_json(raw)

        # Normalize keys and types
        risk = int(data.get("risk_score", 50))
        risk = max(0, min(100, risk))
        data["risk_score"] = risk
        for key in (
            "concerning_clauses",
            "data_collected",
            "third_party_sharing",
            "hidden_risks",
            "summary_bullets",
        ):
            v = data.get(key)
            data[key] = list(v) if isinstance(v, list) else []
        data["plain_english_explanation"] = str(data.get("plain_english_explanation", "")).strip()
        data["summary_short"] = str(data.get("summary_short", "")).strip()
        return data
