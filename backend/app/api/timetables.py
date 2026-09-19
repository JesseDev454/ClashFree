from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_capability
from app.models.identity import User

router = APIRouter(prefix="/api/timetables", tags=["timetables"])


@router.post("/generate")
def generate(_user: User = Depends(require_capability("generate"))) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Timetable generation is not implemented until Phase 5.",
    )


@router.post("/repair")
def repair(_user: User = Depends(require_capability("approveRepair"))) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Timetable repair is not implemented until Phase 8.",
    )


@router.post("/publish")
def publish(_user: User = Depends(require_capability("publish"))) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Timetable publishing is not implemented until Phase 6.",
    )
