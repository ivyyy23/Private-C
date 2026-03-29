"""Application configuration from environment (Pydantic Settings)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "private_c"

    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "*"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    elevenlabs_api_key: str = ""
    elevenlabs_default_voice_id: str = "21m00Tcm4TlvDq8ikWAM"

    audio_storage_dir: str = "./data/audio"
    public_base_url: str = "http://127.0.0.1:8000"

    redis_url: str | None = None

    environment: Literal["development", "staging", "production"] = "development"

    @field_validator("public_base_url")
    @classmethod
    def strip_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
