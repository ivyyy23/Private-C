from pydantic import BaseModel, Field


class AudioAlertRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    domain: str = Field(default="")
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: str | None = None


class AudioAlertResponse(BaseModel):
    audio_url: str | None
    audio_log_id: str
    message: str = "ok"
