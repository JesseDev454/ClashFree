from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.schedule import LECTURER_SLOT_STATES, PERIODS, ROOM_SLOT_STATES, WEEKDAYS
from app.models.academic import Lecturer
from app.models.constraints import ConstraintWeightProfile
from app.models.identity import User


def activate_weight_profile(
    db: Session, target: ConstraintWeightProfile
) -> ConstraintWeightProfile:
    for row in db.query(ConstraintWeightProfile).all():
        row.is_current = row.id == target.id
    target.is_current = True
    return target


def resolve_lecturer_for_user(db: Session, user: User) -> Lecturer:
    row = db.query(Lecturer).filter(Lecturer.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No lecturer record is linked to this account",
        )
    return row


def ensure_weekday(value: str) -> str:
    if value not in WEEKDAYS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"weekday must be one of: {', '.join(WEEKDAYS)}",
        )
    return value


def ensure_period(value: str | None, required: bool = False) -> str | None:
    if value is None:
        if required:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="period is required",
            )
        return None
    if value not in PERIODS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"period must be one of: {', '.join(PERIODS)}",
        )
    return value


def ensure_lecturer_state(value: str) -> str:
    if value not in LECTURER_SLOT_STATES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"state must be one of: {', '.join(LECTURER_SLOT_STATES)}",
        )
    return value


def ensure_room_state(value: str) -> str:
    if value not in ROOM_SLOT_STATES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"state must be one of: {', '.join(ROOM_SLOT_STATES)}",
        )
    return value


def ensure_weight(value: int, label: str) -> int:
    if value < 0 or value > 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{label} must be between 0 and 10",
        )
    return value
