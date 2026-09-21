from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.academic import router as academic_router
from app.api.auth import router as auth_router
from app.api.constraints import router as constraints_router
from app.api.health import router as health_router
from app.api.me import router as me_router
from app.api.timetables import router as timetables_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="ClashFree API",
        version="0.6.0",
        summary="University timetable optimisation and repair service.",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(me_router)
    application.include_router(timetables_router)
    application.include_router(academic_router)
    application.include_router(constraints_router)

    @application.get("/")
    def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "health": "/health",
        }

    return application


app = create_app()
