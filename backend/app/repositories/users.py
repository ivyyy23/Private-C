from datetime import datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class UserRepository:
    collection = "users"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._c = db[self.collection]

    async def find_by_id(self, user_id: str) -> dict[str, Any] | None:
        try:
            oid = ObjectId(user_id)
        except Exception:
            oid = None
        if oid:
            doc = await self._c.find_one({"_id": oid})
            if doc:
                doc["id"] = str(doc.pop("_id"))
                return doc
        doc = await self._c.find_one({"external_id": user_id})
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def find_by_email(self, email: str) -> dict[str, Any] | None:
        doc = await self._c.find_one({"email": email.lower().strip()})
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def find_by_external_id(self, user_id: str) -> dict[str, Any] | None:
        return await self._c.find_one({"external_id": user_id})

    async def upsert_by_external_id(self, user_id: str, defaults: dict[str, Any]) -> dict[str, Any]:
        """Ensure a user row exists for extension-provided opaque ids (stored as external_id)."""
        now = datetime.utcnow()
        existing = await self._c.find_one({"external_id": user_id})
        if existing:
            return existing
        doc = {
            "external_id": user_id,
            "created_at": now,
            "updated_at": now,
            **defaults,
        }
        res = await self._c.insert_one(doc)
        doc["_id"] = res.inserted_id
        return doc

    async def update_by_external_id(self, user_id: str, patch: dict[str, Any]) -> bool:
        patch = {**patch, "updated_at": datetime.utcnow()}
        r = await self._c.update_one({"external_id": user_id}, {"$set": patch})
        return r.modified_count > 0 or r.matched_count > 0
