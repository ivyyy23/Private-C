from pydantic import BaseModel, Field

from app.models.documents import SensitiveFlags, UserPreferences


class UserPreferencesResponse(BaseModel):
    user_id: str
    preferences: UserPreferences
    theme: str = "dark"


class UserPreferencesUpdate(BaseModel):
    preferences: UserPreferences | None = None
    theme: str | None = None
    sensitive_privacy_flags: dict[str, bool] | None = None
