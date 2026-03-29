from __future__ import annotations

from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.blocked_entities import BlockedEntityRepository
from app.repositories.scanned_websites import ScannedWebsiteRepository
from app.repositories.user_scan_history import UserScanHistoryRepository


class DashboardService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._history = UserScanHistoryRepository(db)
        self._blocked = BlockedEntityRepository(db)
        self._sites = ScannedWebsiteRepository(db)

    async def build_dashboard(self, user_id: str) -> dict[str, Any]:
        recent = await self._history.recent_for_user(user_id, limit=25)
        recent_scans = [
            {
                "domain": r["domain"],
                "visited_at": r["visited_at"],
                "risk_seen": r.get("risk_seen", 0),
                "action_taken": r.get("action_taken", "none"),
            }
            for r in recent
        ]

        blocked_entities = await self._blocked.list_for_user(user_id, limit=50)

        trust_raw = await self._sites.list_trusted_low_risk(max_risk=30, limit=40)
        trust_list = []
        for s in trust_raw:
            ls = s.get("last_scanned")
            if isinstance(ls, datetime):
                pass
            trust_list.append(
                {
                    "domain": s.get("domain", ""),
                    "status": s.get("status", "unknown"),
                    "risk_score": int(s.get("risk_score", 0)),
                    "last_scanned": ls,
                }
            )

        return {
            "recent_scans": recent_scans,
            "blocked_entities": blocked_entities,
            "trust_list": trust_list,
        }
