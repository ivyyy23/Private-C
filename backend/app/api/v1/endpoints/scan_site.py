from fastapi import APIRouter

from app.core.deps import DbDep, SettingsDep
from app.schemas.scan import ScanSiteRequest, ScanSiteResponse
from app.services.scan_service import ScanSiteService

router = APIRouter()


@router.post("/scan-site", response_model=ScanSiteResponse)
async def scan_site(body: ScanSiteRequest, db: DbDep, settings: SettingsDep) -> ScanSiteResponse:
    svc = ScanSiteService(db, settings)
    result = await svc.scan_site(body.user_id, body.domain)
    return ScanSiteResponse(**result)
