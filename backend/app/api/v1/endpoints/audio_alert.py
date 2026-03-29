import os
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.audio.elevenlabs_service import ElevenLabsAudioService
from app.core.deps import DbDep, SettingsDep
from app.core.errors import not_found
from app.repositories.audio_logs import AudioLogRepository
from app.schemas.audio import AudioAlertRequest, AudioAlertResponse

router = APIRouter()


@router.post("/audio-alert", response_model=AudioAlertResponse)
async def create_audio_alert(body: AudioAlertRequest, db: DbDep, settings: SettingsDep) -> AudioAlertResponse:
    eleven = ElevenLabsAudioService(settings.elevenlabs_api_key)
    voice = body.voice_id or settings.elevenlabs_default_voice_id
    audio_bytes = await eleven.synthesize(body.text, voice)

    Path(settings.audio_storage_dir).mkdir(parents=True, exist_ok=True)
    repo = AudioLogRepository(db)
    log_id = await repo.create(body.user_id, body.domain, body.text, voice, None)
    path = os.path.join(settings.audio_storage_dir, f"{log_id}.mp3")
    with open(path, "wb") as f:
        f.write(audio_bytes)
    await db["audio_logs"].update_one({"_id": ObjectId(log_id)}, {"$set": {"file_path": path}})

    url = f"{settings.public_base_url}/api/v1/audio/stream/{log_id}"
    return AudioAlertResponse(audio_url=url, audio_log_id=log_id)


@router.get("/audio/stream/{log_id}")
async def stream_audio(log_id: str, db: DbDep) -> FileResponse:
    repo = AudioLogRepository(db)
    doc = await repo.get(log_id)
    if not doc or not doc.get("file_path"):
        raise not_found("Audio not found")
    path = doc["file_path"]
    if not os.path.isfile(path):
        raise not_found("Audio file missing")
    return FileResponse(path, media_type="audio/mpeg", filename=f"{log_id}.mp3")
