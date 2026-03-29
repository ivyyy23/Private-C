from fastapi import APIRouter

from app.api.v1.endpoints import (
    audio_alert,
    block_history,
    browser_events,
    dashboard,
    scan_site,
    user_preferences,
)

api_router = APIRouter()
api_router.include_router(scan_site.router, tags=["scan"])
api_router.include_router(user_preferences.router, tags=["user-preferences"])
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(audio_alert.router, tags=["audio"])
api_router.include_router(block_history.router, tags=["block-history"])
api_router.include_router(browser_events.router, tags=["browser"])
