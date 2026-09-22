from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.academic import list_assignments
from app.api.auth import serialize_user
from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.identity import User
from app.schemas.academic import AssignmentOut
from app.schemas.auth import UserOut
from app.schemas.portal import ProfileUpdate, SettingsIn, SettingsOut
from app.services.portals import PortalError, lecturer_for_user, save_settings, settings_for

router = APIRouter(prefix="/api", tags=["me"])
lecturer_only = require_roles("lecturer")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return serialize_user(user)


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.get("/me/settings", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SettingsOut:
    return SettingsOut.model_validate(settings_for(db, user.id))


@router.put("/me/settings", response_model=SettingsOut)
def put_settings(
    payload: SettingsIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SettingsOut:
    return SettingsOut.model_validate(save_settings(db, user.id, payload))


@router.get("/me/courses", response_model=list[AssignmentOut])
def my_courses(
    db: Session = Depends(get_db),
    user: User = Depends(lecturer_only),
) -> list[AssignmentOut]:
    try:
        lecturer = lecturer_for_user(db, user)
    except PortalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    rows = list_assignments(db=db, _user=user)
    return [row for row in rows if row.lecturer_id == lecturer.id]
