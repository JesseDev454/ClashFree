from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_capability, require_roles
from app.core.database import get_db
from app.models.identity import User
from app.models.timetable import TimetableConflict, TimetableRun, TimetableSolution
from app.schemas.timetable import (
    ConflictOut,
    DraftOut,
    GenerateIn,
    PreflightOut,
    RunOut,
    SlotOut,
    SolutionOut,
)
from app.services.timetable import (
    active_session,
    build_preflight,
    current_profile,
    recompute_conflicts,
    run_generation,
    select_solution,
    selected_solution,
)

admin_only = require_roles("timetable_administrator")
generate_cap = require_capability("generate")

router = APIRouter(prefix="/api/timetables", tags=["timetables"])


def not_found(entity: str) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} not found")


def run_out(row: TimetableRun) -> RunOut:
    solutions = sorted(row.solutions, key=lambda item: item.label)
    return RunOut(
        id=row.id,
        session_id=row.session_id,
        weight_profile_id=row.weight_profile_id,
        status=row.status,
        time_limit_seconds=row.time_limit_seconds,
        alternative_count=row.alternative_count,
        random_seed=row.random_seed,
        started_at=row.started_at,
        finished_at=row.finished_at,
        solve_time_ms=row.solve_time_ms,
        message=row.message,
        created_by=row.created_by,
        profile_name=row.weight_profile.name if row.weight_profile is not None else None,
        session_label=row.session.label if row.session is not None else None,
        solutions=[SolutionOut.model_validate(item) for item in solutions],
    )


def slot_out(slot) -> SlotOut:
    assignment = slot.assignment
    course = assignment.course if assignment is not None else None
    cohort = assignment.cohort if assignment is not None else None
    lecturer = assignment.lecturer if assignment is not None else None
    department = None
    if course is not None:
        department = course.department
    return SlotOut(
        id=slot.id,
        assignment_id=slot.assignment_id,
        meeting_index=slot.meeting_index,
        weekday=slot.weekday,
        start_period=slot.start_period,
        end_period=slot.end_period,
        room_id=slot.room_id,
        room_code=slot.room.code if slot.room is not None else None,
        course_code=course.code if course is not None else None,
        course_title=course.title if course is not None else None,
        lecturer_name=lecturer.full_name if lecturer is not None else None,
        cohort_code=cohort.code if cohort is not None else None,
        department_id=department.id if department is not None else None,
        department_name=department.name if department is not None else None,
        building=slot.room.building if slot.room is not None else None,
    )


def load_run(db: Session, run_id: int) -> TimetableRun | None:
    return (
        db.query(TimetableRun)
        .options(
            joinedload(TimetableRun.solutions),
            joinedload(TimetableRun.session),
            joinedload(TimetableRun.weight_profile),
        )
        .filter(TimetableRun.id == run_id)
        .one_or_none()
    )


@router.get("/preflight", response_model=PreflightOut)
def preflight(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> PreflightOut:
    return PreflightOut.model_validate(build_preflight(db))


@router.post("/generate", response_model=RunOut)
def generate(
    payload: GenerateIn = GenerateIn(),
    db: Session = Depends(get_db),
    user: User = Depends(generate_cap),
) -> RunOut:
    if active_session(db) is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active academic session",
        )
    if current_profile(db) is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No current constraint weight profile",
        )
    try:
        run = run_generation(
            db,
            user.id,
            payload.time_limit_seconds,
            payload.alternative_count,
            payload.random_seed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    loaded = load_run(db, run.id)
    if loaded is None:
        not_found("Timetable run")
        raise AssertionError
    return run_out(loaded)


@router.get("/runs", response_model=list[RunOut])
def list_runs(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[RunOut]:
    rows = (
        db.query(TimetableRun)
        .options(
            joinedload(TimetableRun.solutions),
            joinedload(TimetableRun.session),
            joinedload(TimetableRun.weight_profile),
        )
        .order_by(TimetableRun.id.desc())
        .all()
    )
    return [run_out(row) for row in rows]


@router.get("/runs/{run_id}", response_model=RunOut)
def get_run(
    run_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> RunOut:
    row = load_run(db, run_id)
    if row is None:
        not_found("Timetable run")
        raise AssertionError
    return run_out(row)


@router.post("/solutions/{solution_id}/select", response_model=SolutionOut)
def activate_solution(
    solution_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> SolutionOut:
    row = db.get(TimetableSolution, solution_id)
    if row is None:
        not_found("Solution")
        raise AssertionError
    select_solution(db, row)
    db.commit()
    db.refresh(row)
    return SolutionOut.model_validate(row)


@router.get("/draft", response_model=DraftOut)
def get_draft(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> DraftOut:
    solution = selected_solution(db)
    if solution is None:
        not_found("Draft timetable")
        raise AssertionError
    run = load_run(db, solution.run_id)
    if run is None:
        not_found("Timetable run")
        raise AssertionError
    return DraftOut(
        run=run_out(run),
        solution=SolutionOut.model_validate(solution),
        slots=[slot_out(slot) for slot in solution.slots],
        conflicts=[ConflictOut.model_validate(item) for item in solution.conflicts],
    )


@router.get("/conflicts", response_model=list[ConflictOut])
def list_conflicts(
    solution_id: int | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[ConflictOut]:
    if solution_id is None:
        selected = selected_solution(db)
        if selected is None:
            return []
        solution_id = selected.id
    rows = (
        db.query(TimetableConflict)
        .filter(TimetableConflict.solution_id == solution_id)
        .order_by(TimetableConflict.id)
        .all()
    )
    return [ConflictOut.model_validate(row) for row in rows]


@router.post("/validate", response_model=list[ConflictOut])
def validate_draft(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[ConflictOut]:
    solution = selected_solution(db)
    if solution is None:
        not_found("Draft timetable")
        raise AssertionError
    rows = recompute_conflicts(db, solution)
    db.commit()
    return [ConflictOut.model_validate(row) for row in rows]


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
