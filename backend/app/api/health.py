from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.health import HealthProbePayload, HealthResponse
from app.services.health import write_and_read_probe

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health(session: Session = Depends(get_db)) -> HealthResponse | JSONResponse:
    settings = get_settings()
    try:
        probe = write_and_read_probe(session)
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        return JSONResponse(
            status_code=503,
            content=HealthResponse(
                status="error",
                service=settings.app_name,
                database="unavailable",
                detail="Database is not reachable.",
            ).model_dump(),
        )

    return HealthResponse(
        status="ok",
        service=settings.app_name,
        database="connected",
        probe=HealthProbePayload.model_validate(probe),
    )
