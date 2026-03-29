from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


class UserScanHistoryRepository:
    collection = "user_scan_history"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._c = db[self.collection]

    async def append(
        self,
        user_id: str,
        domain: str,
        risk_seen: int,
        action_taken: str = "none",
    ) -> None:
        await self._c.insert_one(
            {
                "user_id": user_id,
                "domain": domain.lower().strip(),
                "visited_at": datetime.utcnow(),
                "risk_seen": risk_seen,
                "action_taken": action_taken,
            }
        )

    async def recent_for_user(self, user_id: str, limit: int = 30) -> list[dict[str, Any]]:
        cur = self._c.find({"user_id": user_id}, sort=[("visited_at", -1)], limit=limit)
        return await cur.to_list(length=limit)
