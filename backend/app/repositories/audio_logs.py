from datetime import datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class AudioLogRepository:
    collection = "audio_logs"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._c = db[self.collection]

    async def create(
        self,
        user_id: str,
        domain: str,
        text_sent: str,
        voice_id: str,
        file_path: str | None,
    ) -> str:
        doc = {
            "user_id": user_id,
            "domain": domain,
            "text_sent": text_sent,
            "voice_id": voice_id,
            "played": False,
            "created_at": datetime.utcnow(),
            "file_path": file_path,
        }
        res = await self._c.insert_one(doc)
        return str(res.inserted_id)

    async def get(self, log_id: str) -> dict[str, Any] | None:
        try:
            oid = ObjectId(log_id)
        except Exception:
            return None
        return await self._c.find_one({"_id": oid})
