from datetime import UTC, datetime
from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.auth import serialize_user
from app.api.deps import require_roles
from app.core.database import get_db
from app.models.identity import User
from app.schemas.auth import UserOut
from app.schemas.portal import UserCreate, UserUpdate
from app.services.portals import (
    PortalError,
    apply_password,
    assert_keeps_an_admin,
    ensure_role,
    ensure_scope,
    link_lecturer,
)

router = APIRouter(prefix="/api/users", tags=["users"])
admin_only = require_roles("timetable_administrator")


def raise_portal(exc: PortalError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


def load_user(db: Session, user_id: int) -> User:
    row = (
        db.query(User).options(joinedload(User.department)).filter(User.id == user_id).one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return row


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[UserOut]:
    rows = db.query(User).options(joinedload(User.department)).order_by(User.full_name).all()
    return [serialize_user(row) for row in rows]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> UserOut:
    try:
        role = ensure_role(payload.role)
        department_id, cohort_id = ensure_scope(db, role, payload.department_id, payload.cohort_id)
    except PortalError as exc:
        raise_portal(exc)
    existing = db.query(User).filter(User.email == payload.email).one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use")
    row = User(
        email=payload.email,
        full_name=payload.full_name.strip(),
        role=role,
        department_id=department_id,
        cohort_id=cohort_id,
        is_active=True,
        email_verified_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
        password_hash="pending",
    )
    apply_password(row, payload.password)
    db.add(row)
    db.flush()
    try:
        link_lecturer(db, row, payload.lecturer_id)
    except PortalError as exc:
        db.rollback()
        raise_portal(exc)
    from app.services.activity import add_audit

    add_audit(
        db,
        actor_id=_user.id,
        action="user.created",
        entity_type="user",
        entity_id=row.id,
        summary=f"Created {row.email}",
    )
    db.commit()
    return serialize_user(load_user(db, row.id))


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> UserOut:
    row = load_user(db, user_id)
    fields = payload.model_fields_set
    next_role = payload.role if "role" in fields and payload.role is not None else row.role
    next_active = (
        payload.is_active
        if "is_active" in fields and payload.is_active is not None
        else row.is_active
    )
    next_department = row.department_id
    if "department_id" in fields:
        next_department = payload.department_id
    next_cohort = row.cohort_id
    if "cohort_id" in fields:
        next_cohort = payload.cohort_id
    try:
        next_role = ensure_role(next_role)
        next_department, next_cohort = ensure_scope(db, next_role, next_department, next_cohort)
        assert_keeps_an_admin(db, row, next_role, next_active)
    except PortalError as exc:
        raise_portal(exc)
    row.role = next_role
    row.department_id = next_department
    row.cohort_id = next_cohort
    row.is_active = next_active
    if "full_name" in fields and payload.full_name is not None:
        row.full_name = payload.full_name.strip()
    if "password" in fields:
        apply_password(row, payload.password)
    try:
        if "lecturer_id" in fields or next_role != "lecturer":
            link_lecturer(db, row, payload.lecturer_id if "lecturer_id" in fields else None)
    except PortalError as exc:
        db.rollback()
        raise_portal(exc)
    if "role" in fields or "is_active" in fields:
        from app.services.activity import add_audit

        add_audit(
            db,
            actor_id=_user.id,
            action="user.updated",
            entity_type="user",
            entity_id=row.id,
            summary=f"Updated {row.email}",
        )
    db.commit()
    return serialize_user(load_user(db, row.id))
