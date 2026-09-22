from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.identity import User
from app.models.portal import ScheduleRequest
from app.schemas.portal import RequestCreate, RequestOut, RequestUpdate
from app.services.portals import PortalError, create_request, decide_request, list_requests

router = APIRouter(prefix="/api/requests", tags=["requests"])


def raise_portal(exc: PortalError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


def request_out(row: ScheduleRequest) -> RequestOut:
    return RequestOut(
        id=row.id,
        session_id=row.session_id,
        department_id=row.department_id,
        requester_id=row.requester_id,
        requester_name=row.requester.full_name if row.requester is not None else None,
        kind=row.kind,
        status=row.status,
        title=row.title,
        detail=row.detail,
        assignment_id=row.assignment_id,
        created_at=row.created_at,
        decided_at=row.decided_at,
        decided_by=row.decided_by,
    )


def load_request(db: Session, request_id: int) -> ScheduleRequest:
    row = (
        db.query(ScheduleRequest)
        .options(joinedload(ScheduleRequest.requester))
        .filter(ScheduleRequest.id == request_id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Request not found")
    return row


@router.get("", response_model=list[RequestOut])
def get_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[RequestOut]:
    try:
        rows = list_requests(db, user)
    except PortalError as exc:
        raise_portal(exc)
    loaded = [load_request(db, row.id) for row in rows]
    return [request_out(row) for row in loaded]


@router.post("", response_model=RequestOut, status_code=201)
def post_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RequestOut:
    try:
        row = create_request(db, user, payload)
    except PortalError as exc:
        raise_portal(exc)
    return request_out(load_request(db, row.id))


@router.patch("/{request_id}", response_model=RequestOut)
def patch_request(
    request_id: int,
    payload: RequestUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RequestOut:
    try:
        row = decide_request(db, user, request_id, payload.status)
    except PortalError as exc:
        raise_portal(exc)
    return request_out(load_request(db, row.id))
