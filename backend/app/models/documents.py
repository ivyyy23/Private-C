"""MongoDB document shapes (Pydantic) — used for validation before persistence."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SensitiveFlags(BaseModel):
    model_config = ConfigDict(extra="ignore")
    location_tracking: bool = False
    biometric_collection: bool = False
    third_party_sale: bool = False
    cross_site_tracking: bool = False


class UserPreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")

    audio_feedback: bool = False
    voice_provider: str = "elevenlabs"
    voice_id: str = ""
    alert_mode: str = "standard"  # quiet | standard | verbose
    sensitive_flags: SensitiveFlags = Field(default_factory=SensitiveFlags)


class UserDoc(BaseModel):
    email: str | None = None
    password_hash: str | None = None
    email_verified: bool = False
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    theme: str = "dark"
    audio_feedback_settings: dict[str, Any] = Field(default_factory=dict)
    sensitive_privacy_flags: dict[str, bool] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PolicySummary(BaseModel):
    short: str = ""
    bullets: list[str] = Field(default_factory=list)


class ScannedWebsiteDoc(BaseModel):
    domain: str
    risk_score: int = 0
    status: str = "unknown"  # trusted | review | high_risk | unknown
    policy_summary: PolicySummary = Field(default_factory=PolicySummary)
    flags: list[str] = Field(default_factory=list)
    last_scanned: datetime = Field(default_factory=datetime.utcnow)
    gemini_version: str = ""
    policy_hash: str = ""
    raw_ai_response: dict[str, Any] = Field(default_factory=dict)


class UserScanHistoryDoc(BaseModel):
    user_id: str
    domain: str
    visited_at: datetime = Field(default_factory=datetime.utcnow)
    risk_seen: int = 0
    action_taken: str = "none"


class BlockedEntityDoc(BaseModel):
    user_id: str
    domain: str
    blocked_trackers: list[str] = Field(default_factory=list)
    blocked_cookies: list[str] = Field(default_factory=list)
    blocked_scripts: list[str] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AudioLogDoc(BaseModel):
    user_id: str
    domain: str
    text_sent: str
    voice_id: str
    played: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    file_path: str | None = None
