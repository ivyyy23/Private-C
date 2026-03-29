"""ElevenLabs text-to-speech: returns raw audio bytes (mpeg)."""

from __future__ import annotations

import httpx


class ElevenLabsAudioService:
    BASE = "https://api.elevenlabs.io/v1"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def synthesize(self, text: str, voice_id: str, model_id: str = "eleven_monolingual_v1") -> bytes:
        if not self._api_key:
            raise RuntimeError("ELEVENLABS_API_KEY is not configured")
        url = f"{self.BASE}/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": self._api_key,
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
        }
        body = {
            "text": text[:2500],
            "model_id": model_id,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=body)
            r.raise_for_status()
            return r.content
