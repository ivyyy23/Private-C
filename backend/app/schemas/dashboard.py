from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RecentScanItem(BaseModel):
    domain: str
    visited_at: datetime
    risk_seen: int
    action_taken: str


class TrustListItem(BaseModel):
    domain: str
    status: str
    risk_score: int = 0
    last_scanned: datetime | None = None

    model_config = ConfigDict(extra="ignore")


class DashboardResponse(BaseModel):
    recent_scans: list[RecentScanItem] = Field(default_factory=list)
    blocked_entities: list[dict[str, Any]] = Field(default_factory=list)
    trust_list: list[TrustListItem] = Field(default_factory=list)
