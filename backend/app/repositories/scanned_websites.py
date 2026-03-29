from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


class ScannedWebsiteRepository:
    collection = "scanned_websites"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._c = db[self.collection]

    async def find_by_domain(self, domain: str) -> dict[str, Any] | None:
        return await self._c.find_one({"domain": domain.lower().strip()})

    async def upsert_scan(self, domain: str, document: dict[str, Any]) -> None:
        domain = domain.lower().strip()
        document["domain"] = domain
        document["last_scanned"] = datetime.utcnow()
        await self._c.update_one(
            {"domain": domain},
            {"$set": document},
            upsert=True,
        )

    async def list_trusted_low_risk(self, max_risk: int = 25, limit: int = 50) -> list[dict[str, Any]]:
        cur = (
            self._c.find(
                {"risk_score": {"$lte": max_risk}, "status": {"$in": ["trusted", "review"]}},
                sort=[("last_scanned", -1)],
                limit=limit,
            )
        )
        return await cur.to_list(length=limit)
