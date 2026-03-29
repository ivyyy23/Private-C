"""FastAPI dependencies: DB session, settings, optional future Redis."""

from typing import Annotated

from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import Settings, get_settings
from app.core.database import get_database


async def get_db() -> AsyncIOMotorDatabase:
    return get_database()


DbDep = Annotated[AsyncIOMotorDatabase, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


# Placeholder for future Redis cache (policy_hash → summary TTL)
async def get_redis():  # pragma: no cover - stub
    """Resolve Redis client when REDIS_URL is set. Not used yet."""
    settings = get_settings()
    if not settings.redis_url:
        return None
    # import redis.asyncio as aioredis
    # return await aioredis.from_url(settings.redis_url)
    return None
