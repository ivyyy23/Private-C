from fastapi import APIRouter, Query

from app.core.deps import DbDep
from app.schemas.dashboard import DashboardResponse, RecentScanItem, TrustListItem
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(user_id: str = Query(..., min_length=1), db: DbDep) -> DashboardResponse:
    svc = DashboardService(db)
    data = await svc.build_dashboard(user_id)
    return DashboardResponse(
        recent_scans=[RecentScanItem(**x) for x in data["recent_scans"]],
        blocked_entities=data["blocked_entities"],
        trust_list=[TrustListItem(**x) for x in data["trust_list"]],
    )
