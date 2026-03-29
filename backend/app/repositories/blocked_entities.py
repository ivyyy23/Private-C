from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


class BlockedEntityRepository:
    collection = "blocked_entities"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._c = db[self.collection]

    async def list_for_user(self, user_id: str, limit: int = 100) -> list[dict[str, Any]]:
        cur = self._c.find({"user_id": user_id}, sort=[("updated_at", -1)], limit=limit)
        rows = await cur.to_list(length=limit)
        for r in rows:
            r["id"] = str(r.pop("_id"))
        return rows
