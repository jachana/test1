"""FastAPI application entry point."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__
from .api.routes import router
from .config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("starmap")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Star-Map Laser MVP",
        version=__version__,
        description="Generate historically accurate, laser-ready custom star maps as SVG.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def limit_body_size(request: Request, call_next):
        max_bytes = settings.max_request_bytes
        cl = request.headers.get("content-length")
        if cl is not None and cl.isdigit() and int(cl) > max_bytes:
            return JSONResponse(
                status_code=413,
                content={"error": "request_too_large", "detail": f"Body exceeds {max_bytes} bytes."},
            )
        return await call_next(request)

    app.include_router(router)

    @app.get("/")
    def root() -> dict:
        return {"service": "starmap-laser-mvp", "version": __version__, "docs": "/docs"}

    return app


app = create_app()
