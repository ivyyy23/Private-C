"""MongoDB Motor client, database handle, and index bootstrap."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None


def get_motor_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=5000,
        )
    return _client


def get_database() -> AsyncIOMotorDatabase:
    settings = get_settings()
    return get_motor_client()[settings.mongodb_db_name]


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create indexes for query paths; safe to run on startup (idempotent)."""
    await db.users.create_index("email", unique=True, sparse=True)
    await db.scanned_websites.create_index("domain", unique=True)
    await db.user_scan_history.create_index([("user_id", 1), ("visited_at", -1)])
    await db.user_scan_history.create_index("domain")
    await db.blocked_entities.create_index([("user_id", 1), ("domain", 1)])
    await db.audio_logs.create_index([("user_id", 1), ("created_at", -1)])
    await db.audio_logs.create_index("domain")
    await db.browser_events.create_index([("user_id", 1), ("received_at", -1)])


async def ping_database() -> bool:
    try:
        await get_motor_client().admin.command("ping")
        return True
    except Exception:
        return False


@asynccontextmanager
async def database_lifespan() -> AsyncIterator[None]:
    """FastAPI lifespan: connect, ensure indexes, yield, (optional) close."""
    settings = get_settings()
    client = get_motor_client()
    db = client[settings.mongodb_db_name]
    await ensure_indexes(db)
    yield
    # Motor client pools are process-wide; do not close aggressively in dev
    if settings.environment == "production":
        client.close()
