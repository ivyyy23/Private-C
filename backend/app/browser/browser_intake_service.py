"""
Browser extension intake: domain visits and page-type hints.

Future: correlate login/signup URL patterns with scan pipeline and user alerts.
"""

from __future__ import annotations

import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class BrowserIntakeService:
    """Lightweight event log in Mongo (collection browser_events) for analytics / future ML."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._c = db["browser_events"]

    async def record_event(
        self,
        user_id: str,
        domain: str,
        event_type: str,
        url: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        from datetime import datetime

        doc = {
            "user_id": user_id,
            "domain": domain.lower().strip(),
            "event_type": event_type,
            "url": url,
            "metadata": metadata or {},
            "received_at": datetime.utcnow(),
        }
        await self._c.insert_one(doc)
        logger.debug("browser_event %s %s %s", user_id, domain, event_type)
