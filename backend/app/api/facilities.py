from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.constraints import RoomAvailabilityBlock
from app.models.identity import User
from app.schemas.activity import FacilityHistoryOut, RoomUtilizationOut
from app.schemas.portal import MaintenanceBlockOut
from app.services.activity import facility_history, room_utilization

router = APIRouter(prefix="/api/facilities", tags=["facilities"])
facilities_only = require_roles("facilities_manager", "timetable_administrator")


@router.get("/maintenance-blocks", response_model=list[MaintenanceBlockOut])
def list_maintenance_blocks(
    db: Session = Depends(get_db),
    _user: User = Depends(facilities_only),
) -> list[MaintenanceBlockOut]:
    rows = (
        db.query(RoomAvailabilityBlock)
        .options(joinedload(RoomAvailabilityBlock.room))
        .filter(RoomAvailabilityBlock.kind == "maintenance")
        .order_by(RoomAvailabilityBlock.starts_on)
        .all()
    )
    return [
        MaintenanceBlockOut(
            id=row.id,
            room_id=row.room_id,
            room_code=row.room.code if row.room is not None else None,
            starts_on=row.starts_on,
            ends_on=row.ends_on,
            start_period=row.start_period,
            end_period=row.end_period,
            reason=row.reason,
            kind=row.kind,
        )
        for row in rows
    ]


@router.get("/utilization", response_model=list[RoomUtilizationOut])
def list_utilization(
    db: Session = Depends(get_db),
    _user: User = Depends(facilities_only),
) -> list[RoomUtilizationOut]:
    return [RoomUtilizationOut(**row) for row in room_utilization(db)]


@router.get("/history", response_model=list[FacilityHistoryOut])
def list_history(
    db: Session = Depends(get_db),
    _user: User = Depends(facilities_only),
) -> list[FacilityHistoryOut]:
    return [FacilityHistoryOut(**row) for row in facility_history(db)]
