from fastapi import APIRouter, status

from app.browser.browser_intake_service import BrowserIntakeService
from app.core.deps import DbDep
from app.schemas.browser import BrowserEventRequest

router = APIRouter()


@router.post("/browser/events", status_code=status.HTTP_202_ACCEPTED)
async def ingest_browser_event(body: BrowserEventRequest, db: DbDep) -> dict:
    svc = BrowserIntakeService(db)
    await svc.record_event(
        body.user_id,
        body.domain,
        body.event_type,
        url=body.url,
        metadata=body.metadata,
    )
    return {"ok": True, "accepted": True}
