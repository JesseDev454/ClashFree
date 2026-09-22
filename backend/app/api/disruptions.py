from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_capability
from app.core.database import get_db
from app.models.identity import User
from app.schemas.disruptions import (
    DisruptionImpact,
    DisruptionIn,
    DisruptionOut,
    DisruptionPatch,
    DisruptionSummaryOut,
)
from app.services.disruptions import (
    VIEW_ROLES,
    DisruptionError,
    can_view,
    create_disruption,
    display_code,
    impact_for,
    list_disruptions,
    load_disruption,
    patch_disruption,
    preview_impact,
    resource_label,
    summarise,
)

report_cap = require_capability("reportDisruption")

router = APIRouter(prefix="/api/disruptions", tags=["disruptions"])


def require_disruption_viewer(user: User = Depends(get_current_user)) -> User:
    if user.role not in VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
    return user


def raise_disruption(exc: DisruptionError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


def disruption_out(db: Session, row, *, include_impact: bool = False) -> DisruptionOut:
    impact = impact_for(db, row)
    payload = DisruptionOut(
        id=row.id,
        code=display_code(row.id),
        session_id=row.session_id,
        kind=row.kind,
        room_id=row.room_id,
        lecturer_id=row.lecturer_id,
        resource_label=resource_label(row),
        reason=row.reason,
        description=row.description,
        severity=row.severity,
        starts_on=row.starts_on,
        ends_on=row.ends_on,
        start_period=row.start_period,
        end_period=row.end_period,
        status=row.status,
        reported_by=row.reported_by,
        reporter_name=row.reporter.full_name if row.reporter is not None else None,
        reporter_role=row.reporter.role if row.reporter is not None else None,
        block_id=row.block_id,
        classes_affected=impact["classes_affected"],
        students_affected=impact["students_affected"],
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
        impact=DisruptionImpact.model_validate(impact) if include_impact else None,
    )
    return payload


@router.get("", response_model=list[DisruptionOut])
def list_rows(
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    kind: Annotated[str | None, Query()] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_disruption_viewer),
) -> list[DisruptionOut]:
    rows = list_disruptions(db, user, status=status_filter, kind=kind)
    return [disruption_out(db, row) for row in rows]


@router.get("/summary", response_model=DisruptionSummaryOut)
def summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_disruption_viewer),
) -> DisruptionSummaryOut:
    if user.role == "lecturer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
    return DisruptionSummaryOut.model_validate(summarise(db, user))


@router.post("/preview", response_model=DisruptionImpact)
def preview(
    payload: DisruptionIn,
    db: Session = Depends(get_db),
    user: User = Depends(report_cap),
) -> DisruptionImpact:
    try:
        impact = preview_impact(db, user, payload.model_dump())
    except DisruptionError as exc:
        raise_disruption(exc)
    return DisruptionImpact.model_validate(impact)


@router.post("", response_model=DisruptionOut, status_code=status.HTTP_201_CREATED)
def create_row(
    payload: DisruptionIn,
    db: Session = Depends(get_db),
    user: User = Depends(report_cap),
) -> DisruptionOut:
    try:
        row = create_disruption(db, user, payload.model_dump())
    except DisruptionError as exc:
        raise_disruption(exc)
    return disruption_out(db, row, include_impact=True)


@router.get("/{disruption_id}", response_model=DisruptionOut)
def get_row(
    disruption_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_disruption_viewer),
) -> DisruptionOut:
    row = load_disruption(db, disruption_id)
    if row is None or not can_view(user, row):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disruption not found")
    return disruption_out(db, row, include_impact=True)


@router.get("/{disruption_id}/impact", response_model=DisruptionImpact)
def get_impact(
    disruption_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_disruption_viewer),
) -> DisruptionImpact:
    row = load_disruption(db, disruption_id)
    if row is None or not can_view(user, row):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disruption not found")
    return DisruptionImpact.model_validate(impact_for(db, row))


@router.patch("/{disruption_id}", response_model=DisruptionOut)
def patch_row(
    disruption_id: int,
    payload: DisruptionPatch,
    db: Session = Depends(get_db),
    user: User = Depends(report_cap),
) -> DisruptionOut:
    row = load_disruption(db, disruption_id)
    if row is None or not can_view(user, row):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disruption not found")
    try:
        updated = patch_disruption(db, user, row, payload.model_dump(exclude_unset=True))
    except DisruptionError as exc:
        raise_disruption(exc)
    return disruption_out(db, updated, include_impact=True)
