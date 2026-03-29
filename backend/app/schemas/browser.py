from typing import Literal

from pydantic import BaseModel, Field


class BrowserEventRequest(BaseModel):
    """Extension-reported navigation signals (future: login/signup heuristics)."""

    user_id: str = Field(..., min_length=1)
    domain: str = Field(..., min_length=1)
    event_type: Literal["visit", "login_page", "signup_page", "policy_link_found"] = "visit"
    url: str | None = None
    metadata: dict | None = None
