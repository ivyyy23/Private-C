from typing import Any

from pydantic import BaseModel, Field


class ScanSiteRequest(BaseModel):
    domain: str = Field(..., min_length=1, max_length=253, description="e.g. example.com")
    user_id: str = Field(..., min_length=1, description="Opaque user / device id from extension")


class ScanSiteResponse(BaseModel):
    risk_score: int
    summary: str
    flags: list[str] = Field(default_factory=list)
    audio_url: str | None = None
    from_cache: bool = False
    domain: str
    details: dict[str, Any] = Field(default_factory=dict)
