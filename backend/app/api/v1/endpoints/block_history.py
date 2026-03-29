from fastapi import APIRouter, Query

from app.core.deps import DbDep
from app.repositories.blocked_entities import BlockedEntityRepository

router = APIRouter()


@router.get("/block-history")
async def get_block_history(user_id: str = Query(..., min_length=1), db: DbDep) -> dict:
    repo = BlockedEntityRepository(db)
    items = await repo.list_for_user(user_id, limit=200)
    trackers: set[str] = set()
    cookies: set[str] = set()
    scripts: set[str] = set()
    for e in items:
        for x in e.get("blocked_trackers") or []:
            trackers.add(x)
        for x in e.get("blocked_cookies") or []:
            cookies.add(x)
        for x in e.get("blocked_scripts") or []:
            scripts.add(x)
    return {
        "user_id": user_id,
        "blocked_trackers": sorted(trackers),
        "blocked_cookies": sorted(cookies),
        "blocked_scripts": sorted(scripts),
        "entities": items,
    }
