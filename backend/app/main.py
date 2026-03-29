"""
Private-C privacy intelligence API — FastAPI entrypoint.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.database import database_lifespan

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with database_lifespan():
        logger.info("Private-C API startup — Mongo indexes ensured")
        yield
    logger.info("Private-C API shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Private-C Privacy Intelligence API",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health")
    async def health():
        from app.core.database import ping_database

        mongo_ok = await ping_database()
        return {"status": "ok" if mongo_ok else "degraded", "mongodb": mongo_ok}

    return app


app = create_app()
