from fastapi import APIRouter, Query

from app.core.deps import DbDep
from app.core.errors import not_found
from app.models.documents import UserPreferences
from app.repositories.users import UserRepository
from app.schemas.user import UserPreferencesResponse, UserPreferencesUpdate

router = APIRouter()


@router.get("/user-preferences", response_model=UserPreferencesResponse)
async def get_user_preferences(user_id: str = Query(..., min_length=1), db: DbDep) -> UserPreferencesResponse:
    repo = UserRepository(db)
    doc = await repo.find_by_external_id(user_id)
    if not doc:
        raise not_found("User not found")
    prefs_raw = doc.get("preferences") or {}
    prefs = UserPreferences.model_validate(prefs_raw)
    return UserPreferencesResponse(user_id=user_id, preferences=prefs, theme=doc.get("theme", "dark"))


@router.put("/user-preferences", response_model=UserPreferencesResponse)
async def put_user_preferences(
    body: UserPreferencesUpdate,
    user_id: str = Query(..., min_length=1),
    db: DbDep,
) -> UserPreferencesResponse:
    repo = UserRepository(db)
    doc = await repo.find_by_external_id(user_id)
    if not doc:
        await repo.upsert_by_external_id(user_id, {"preferences": UserPreferences().model_dump(), "theme": "dark"})
        doc = await repo.find_by_external_id(user_id)

    patch: dict = {}
    if body.preferences is not None:
        patch["preferences"] = body.preferences.model_dump()
    if body.theme is not None:
        patch["theme"] = body.theme
    if body.sensitive_privacy_flags is not None:
        patch["sensitive_privacy_flags"] = body.sensitive_privacy_flags

    if patch:
        await repo.update_by_external_id(user_id, patch)

    doc = await repo.find_by_external_id(user_id)
    assert doc is not None
    prefs = UserPreferences.model_validate(doc.get("preferences") or {})
    return UserPreferencesResponse(user_id=user_id, preferences=prefs, theme=doc.get("theme", "dark"))
