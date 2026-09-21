from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.schedule import (
    EXCEPTION_KINDS,
    PERIODS,
    ROOM_BLOCK_KINDS,
    SLOT_COUNT,
    WEEKDAYS,
    WEIGHT_FIELDS,
)
from app.models.academic import Lecturer, Room
from app.models.constraints import (
    ConstraintWeightProfile,
    LecturerAvailabilityException,
    LecturerAvailabilitySlot,
    LecturerPreference,
    RoomAvailabilityBlock,
    RoomAvailabilitySlot,
    SchedulingConstraint,
)
from app.models.identity import User
from app.schemas.constraints import (
    AvailabilityExceptionIn,
    AvailabilityExceptionOut,
    AvailabilitySlotsIn,
    ConstraintEnabledIn,
    ConstraintOut,
    ConstraintSummary,
    LecturerAvailabilityOut,
    LecturerPreferenceIn,
    LecturerPreferenceOut,
    RoomAvailabilityOut,
    RoomBlockIn,
    RoomBlockOut,
    SlotIn,
    SlotOut,
    WeightProfileIn,
    WeightProfileOut,
)
from app.services.academic import ConflictError, commit_or_conflict
from app.services.constraints import (
    activate_weight_profile,
    ensure_lecturer_state,
    ensure_period,
    ensure_room_state,
    ensure_weekday,
    ensure_weight,
    resolve_lecturer_for_user,
)

admin_only = require_roles("timetable_administrator")
lecturer_only = require_roles("lecturer")
room_editors = require_roles("timetable_administrator", "facilities_manager")

router = APIRouter(prefix="/api", tags=["constraints"])


def conflict(exc: ConflictError) -> None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc


def not_found(entity: str) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} not found")


def merge_slots(rows: list, default_state: str = "available") -> list[SlotOut]:
    lookup = {(row.weekday, row.period): row.state for row in rows}
    return [
        SlotOut(
            weekday=weekday,
            period=period,
            state=lookup.get((weekday, period), default_state),
        )
        for weekday in WEEKDAYS
        for period in PERIODS
    ]


def availability_metrics(slots: list[SlotOut]) -> tuple[int, int, int, int]:
    available = sum(1 for slot in slots if slot.state == "available")
    preferred = sum(1 for slot in slots if slot.state == "preferred")
    unavailable = sum(1 for slot in slots if slot.state in {"unavailable", "reserved"})
    coverage = round(100 * (available + preferred) / SLOT_COUNT) if SLOT_COUNT else 0
    return available, preferred, unavailable, coverage


def lecturer_availability_out(
    lecturer: Lecturer,
    slots: list[LecturerAvailabilitySlot],
    exceptions: list[LecturerAvailabilityException],
) -> LecturerAvailabilityOut:
    merged = merge_slots(slots)
    available, preferred, unavailable, coverage = availability_metrics(merged)
    submitted = len(slots) > 0
    return LecturerAvailabilityOut(
        lecturer_id=lecturer.id,
        lecturer_name=lecturer.full_name,
        submitted=submitted,
        coverage_percent=coverage,
        available_slots=available,
        preferred_slots=preferred,
        unavailable_slots=unavailable,
        slots=merged,
        exceptions=[AvailabilityExceptionOut.model_validate(item) for item in exceptions],
    )


def replace_owner_slots(
    db: Session,
    model,
    owner_field: str,
    owner_id: int,
    slots: list[SlotIn],
    state_guard,
) -> None:
    seen: set[tuple[str, str]] = set()
    validated: list[tuple[str, str, str]] = []
    for slot in slots:
        weekday = ensure_weekday(slot.weekday)
        period = ensure_period(slot.period, required=True)
        state = state_guard(slot.state)
        key = (weekday, period)
        if key in seen:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Duplicate weekday and period in slots",
            )
        seen.add(key)
        validated.append((weekday, period, state))
    db.query(model).filter(getattr(model, owner_field) == owner_id).delete()
    for weekday, period, state in validated:
        db.add(
            model(
                **{
                    owner_field: owner_id,
                    "weekday": weekday,
                    "period": period,
                    "state": state,
                }
            )
        )


def validate_window(
    start_period: str | None, end_period: str | None
) -> tuple[str | None, str | None]:
    start = ensure_period(start_period)
    end = ensure_period(end_period)
    return start, end


@router.get("/constraints/summary", response_model=ConstraintSummary)
def constraints_summary(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> ConstraintSummary:
    rows = db.query(SchedulingConstraint).all()
    hard = [row for row in rows if row.kind == "hard"]
    soft = [row for row in rows if row.kind == "soft"]
    current = (
        db.query(ConstraintWeightProfile)
        .filter(ConstraintWeightProfile.is_current.is_(True))
        .one_or_none()
    )
    valid = all(row.kind in {"hard", "soft"} and row.code for row in rows)
    return ConstraintSummary(
        hard=len(hard),
        soft=len(soft),
        soft_enabled=sum(1 for row in soft if row.enabled),
        department_rules=0,
        current_profile=current.name if current is not None else None,
        validation_percent=100 if rows and valid else 0,
    )


@router.get("/constraints", response_model=list[ConstraintOut])
def list_constraints(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[ConstraintOut]:
    rows = db.query(SchedulingConstraint).order_by(SchedulingConstraint.sort_order).all()
    return [ConstraintOut.model_validate(row) for row in rows]


@router.patch("/constraints/{constraint_id}", response_model=ConstraintOut)
def patch_constraint(
    constraint_id: int,
    payload: ConstraintEnabledIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> ConstraintOut:
    row = db.get(SchedulingConstraint, constraint_id)
    if row is None:
        not_found("Constraint")
        raise AssertionError
    if row.locked and not payload.enabled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Locked hard constraints cannot be disabled",
        )
    row.enabled = payload.enabled
    db.commit()
    db.refresh(row)
    return ConstraintOut.model_validate(row)


@router.get("/constraint-weights", response_model=list[WeightProfileOut])
def list_weight_profiles(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[WeightProfileOut]:
    rows = db.query(ConstraintWeightProfile).order_by(ConstraintWeightProfile.id).all()
    return [WeightProfileOut.model_validate(row) for row in rows]


@router.patch("/constraint-weights/{profile_id}", response_model=WeightProfileOut)
def patch_weight_profile(
    profile_id: int,
    payload: WeightProfileIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> WeightProfileOut:
    row = db.get(ConstraintWeightProfile, profile_id)
    if row is None:
        not_found("Weight profile")
        raise AssertionError
    for field in WEIGHT_FIELDS:
        value = ensure_weight(getattr(payload, field), field)
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return WeightProfileOut.model_validate(row)


@router.post("/constraint-weights/{profile_id}/activate", response_model=WeightProfileOut)
def activate_weights(
    profile_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> WeightProfileOut:
    row = db.get(ConstraintWeightProfile, profile_id)
    if row is None:
        not_found("Weight profile")
        raise AssertionError
    activate_weight_profile(db, row)
    db.commit()
    db.refresh(row)
    return WeightProfileOut.model_validate(row)


@router.get("/me/availability", response_model=LecturerAvailabilityOut)
def my_availability(
    db: Session = Depends(get_db),
    user: User = Depends(lecturer_only),
) -> LecturerAvailabilityOut:
    lecturer = resolve_lecturer_for_user(db, user)
    slots = (
        db.query(LecturerAvailabilitySlot)
        .filter(LecturerAvailabilitySlot.lecturer_id == lecturer.id)
        .all()
    )
    exceptions = (
        db.query(LecturerAvailabilityException)
        .filter(LecturerAvailabilityException.lecturer_id == lecturer.id)
        .order_by(LecturerAvailabilityException.starts_on)
        .all()
    )
    return lecturer_availability_out(lecturer, slots, exceptions)


@router.put("/me/availability", response_model=LecturerAvailabilityOut)
def put_my_availability(
    payload: AvailabilitySlotsIn,
    db: Session = Depends(get_db),
    user: User = Depends(lecturer_only),
) -> LecturerAvailabilityOut:
    lecturer = resolve_lecturer_for_user(db, user)
    replace_owner_slots(
        db,
        LecturerAvailabilitySlot,
        "lecturer_id",
        lecturer.id,
        payload.slots,
        ensure_lecturer_state,
    )
    try:
        commit_or_conflict(db, "Could not save availability")
    except ConflictError as exc:
        conflict(exc)
    return my_availability(db, user)


@router.post(
    "/me/availability/exceptions",
    response_model=AvailabilityExceptionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_my_exception(
    payload: AvailabilityExceptionIn,
    db: Session = Depends(get_db),
    user: User = Depends(lecturer_only),
) -> AvailabilityExceptionOut:
    lecturer = resolve_lecturer_for_user(db, user)
    if payload.kind not in EXCEPTION_KINDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"kind must be one of: {', '.join(EXCEPTION_KINDS)}",
        )
    start, end = validate_window(payload.start_period, payload.end_period)
    row = LecturerAvailabilityException(
        lecturer_id=lecturer.id,
        starts_on=payload.starts_on,
        ends_on=payload.ends_on,
        start_period=start,
        end_period=end,
        reason=payload.reason.strip(),
        kind=payload.kind,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return AvailabilityExceptionOut.model_validate(row)


@router.delete("/me/availability/exceptions/{exception_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_exception(
    exception_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(lecturer_only),
) -> Response:
    lecturer = resolve_lecturer_for_user(db, user)
    row = db.get(LecturerAvailabilityException, exception_id)
    if row is None or row.lecturer_id != lecturer.id:
        not_found("Exception")
        raise AssertionError
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/preferences", response_model=LecturerPreferenceOut)
def my_preferences(
    db: Session = Depends(get_db),
    user: User = Depends(lecturer_only),
) -> LecturerPreferenceOut:
    lecturer = resolve_lecturer_for_user(db, user)
    row = (
        db.query(LecturerPreference)
        .filter(LecturerPreference.lecturer_id == lecturer.id)
        .one_or_none()
    )
    if row is None:
        return LecturerPreferenceOut(
            lecturer_id=lecturer.id,
            prefer_morning=True,
            avoid_friday_afternoon=True,
            no_early_after_late=False,
            max_classes_per_day=2,
            max_consecutive_hours=4,
            min_break_minutes=60,
            preferred_days=["mon", "tue", "wed", "thu", "fri"],
        )
    return LecturerPreferenceOut.model_validate(row)


@router.put("/me/preferences", response_model=LecturerPreferenceOut)
def put_my_preferences(
    payload: LecturerPreferenceIn,
    db: Session = Depends(get_db),
    user: User = Depends(lecturer_only),
) -> LecturerPreferenceOut:
    lecturer = resolve_lecturer_for_user(db, user)
    days = [ensure_weekday(day) for day in payload.preferred_days]
    row = (
        db.query(LecturerPreference)
        .filter(LecturerPreference.lecturer_id == lecturer.id)
        .one_or_none()
    )
    values = payload.model_dump()
    values["preferred_days"] = days
    if row is None:
        row = LecturerPreference(lecturer_id=lecturer.id, **values)
        db.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return LecturerPreferenceOut.model_validate(row)


@router.get("/lecturers/{lecturer_id}/availability", response_model=LecturerAvailabilityOut)
def get_lecturer_availability(
    lecturer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("timetable_administrator", "lecturer")),
) -> LecturerAvailabilityOut:
    lecturer = db.get(Lecturer, lecturer_id)
    if lecturer is None:
        not_found("Lecturer")
        raise AssertionError
    if user.role == "lecturer" and lecturer.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
    slots = (
        db.query(LecturerAvailabilitySlot)
        .filter(LecturerAvailabilitySlot.lecturer_id == lecturer.id)
        .all()
    )
    exceptions = (
        db.query(LecturerAvailabilityException)
        .filter(LecturerAvailabilityException.lecturer_id == lecturer.id)
        .order_by(LecturerAvailabilityException.starts_on)
        .all()
    )
    return lecturer_availability_out(lecturer, slots, exceptions)


@router.put("/lecturers/{lecturer_id}/availability", response_model=LecturerAvailabilityOut)
def put_lecturer_availability(
    lecturer_id: int,
    payload: AvailabilitySlotsIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> LecturerAvailabilityOut:
    lecturer = db.get(Lecturer, lecturer_id)
    if lecturer is None:
        not_found("Lecturer")
        raise AssertionError
    replace_owner_slots(
        db,
        LecturerAvailabilitySlot,
        "lecturer_id",
        lecturer.id,
        payload.slots,
        ensure_lecturer_state,
    )
    try:
        commit_or_conflict(db, "Could not save availability")
    except ConflictError as exc:
        conflict(exc)
    slots = (
        db.query(LecturerAvailabilitySlot)
        .filter(LecturerAvailabilitySlot.lecturer_id == lecturer.id)
        .all()
    )
    exceptions = (
        db.query(LecturerAvailabilityException)
        .filter(LecturerAvailabilityException.lecturer_id == lecturer.id)
        .all()
    )
    return lecturer_availability_out(lecturer, slots, exceptions)


@router.get("/rooms/{room_id}/availability", response_model=RoomAvailabilityOut)
def get_room_availability(
    room_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(room_editors),
) -> RoomAvailabilityOut:
    room = db.get(Room, room_id)
    if room is None:
        not_found("Room")
        raise AssertionError
    slots = db.query(RoomAvailabilitySlot).filter(RoomAvailabilitySlot.room_id == room.id).all()
    blocks = (
        db.query(RoomAvailabilityBlock)
        .filter(RoomAvailabilityBlock.room_id == room.id)
        .order_by(RoomAvailabilityBlock.starts_on)
        .all()
    )
    return RoomAvailabilityOut(
        room_id=room.id,
        room_code=room.code,
        slots=merge_slots(slots),
        blocks=[RoomBlockOut.model_validate(item) for item in blocks],
    )


@router.put("/rooms/{room_id}/availability", response_model=RoomAvailabilityOut)
def put_room_availability(
    room_id: int,
    payload: AvailabilitySlotsIn,
    db: Session = Depends(get_db),
    _user: User = Depends(room_editors),
) -> RoomAvailabilityOut:
    room = db.get(Room, room_id)
    if room is None:
        not_found("Room")
        raise AssertionError
    replace_owner_slots(
        db,
        RoomAvailabilitySlot,
        "room_id",
        room.id,
        payload.slots,
        ensure_room_state,
    )
    try:
        commit_or_conflict(db, "Could not save room availability")
    except ConflictError as exc:
        conflict(exc)
    return get_room_availability(room_id, db, _user)


@router.post(
    "/rooms/{room_id}/availability/blocks",
    response_model=RoomBlockOut,
    status_code=status.HTTP_201_CREATED,
)
def create_room_block(
    room_id: int,
    payload: RoomBlockIn,
    db: Session = Depends(get_db),
    _user: User = Depends(room_editors),
) -> RoomBlockOut:
    room = db.get(Room, room_id)
    if room is None:
        not_found("Room")
        raise AssertionError
    if payload.kind not in ROOM_BLOCK_KINDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"kind must be one of: {', '.join(ROOM_BLOCK_KINDS)}",
        )
    start, end = validate_window(payload.start_period, payload.end_period)
    row = RoomAvailabilityBlock(
        room_id=room.id,
        starts_on=payload.starts_on,
        ends_on=payload.ends_on,
        start_period=start,
        end_period=end,
        reason=payload.reason.strip(),
        kind=payload.kind,
        recurring=payload.recurring,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return RoomBlockOut.model_validate(row)


@router.delete(
    "/rooms/{room_id}/availability/blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_room_block(
    room_id: int,
    block_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(room_editors),
) -> Response:
    row = db.get(RoomAvailabilityBlock, block_id)
    if row is None or row.room_id != room_id:
        not_found("Block")
        raise AssertionError
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
