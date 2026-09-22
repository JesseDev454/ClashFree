from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.academic import (
    create_assignment,
    create_cohort,
    create_course,
    delete_assignment,
    delete_cohort,
    delete_course,
    list_assignments,
    list_cohorts,
    list_courses,
    load_assignment,
    patch_assignment,
    patch_cohort,
    patch_course,
)
from app.api.deps import require_roles
from app.core.database import get_db
from app.models.academic import Cohort, Course, CourseAssignment, Lecturer
from app.models.identity import User
from app.models.portal import DepartmentConstraint
from app.schemas.academic import (
    AssignmentIn,
    AssignmentOut,
    CohortIn,
    CohortOut,
    CourseIn,
    CourseOut,
)
from app.schemas.portal import (
    DepartmentConstraintIn,
    DepartmentConstraintOut,
    LecturerAvailabilitySummary,
    PublishedConflictOut,
)
from app.services.portals import (
    PortalError,
    availability_summary,
    published_conflicts,
    require_department,
    validate_constraint,
)
from app.services.publish import current_version
from app.services.timetable import active_session

router = APIRouter(prefix="/api/department", tags=["department"])
coordinator_only = require_roles("department_coordinator")


def raise_portal(exc: PortalError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


def department_id_for(user: User) -> int:
    try:
        return require_department(user)
    except PortalError as exc:
        raise_portal(exc)


def forbid_other_department(given: int | None, own: int) -> None:
    if given is not None and given != own:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )


def owned_course(db: Session, course_id: int, own: int) -> Course:
    row = db.get(Course, course_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    forbid_other_department(row.department_id, own)
    return row


def owned_cohort(db: Session, cohort_id: int, own: int) -> Cohort:
    row = db.get(Cohort, cohort_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")
    forbid_other_department(row.department_id, own)
    return row


@router.get("/courses", response_model=list[CourseOut])
def department_courses(
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> list[CourseOut]:
    return list_courses(department_id=department_id_for(user), db=db, _user=user)


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def department_create_course(
    payload: CourseIn,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> CourseOut:
    own = department_id_for(user)
    forbid_other_department(payload.department_id, own)
    return create_course(payload.model_copy(update={"department_id": own}), db, user)


@router.patch("/courses/{course_id}", response_model=CourseOut)
def department_patch_course(
    course_id: int,
    payload: CourseIn,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> CourseOut:
    own = department_id_for(user)
    owned_course(db, course_id, own)
    forbid_other_department(payload.department_id, own)
    return patch_course(course_id, payload.model_copy(update={"department_id": own}), db, user)


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def department_delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> Response:
    own = department_id_for(user)
    owned_course(db, course_id, own)
    return delete_course(course_id, db, user)


@router.get("/cohorts", response_model=list[CohortOut])
def department_cohorts(
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> list[CohortOut]:
    return list_cohorts(department_id=department_id_for(user), db=db, _user=user)


@router.post("/cohorts", response_model=CohortOut, status_code=status.HTTP_201_CREATED)
def department_create_cohort(
    payload: CohortIn,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> CohortOut:
    own = department_id_for(user)
    forbid_other_department(payload.department_id, own)
    return create_cohort(payload.model_copy(update={"department_id": own}), db, user)


@router.patch("/cohorts/{cohort_id}", response_model=CohortOut)
def department_patch_cohort(
    cohort_id: int,
    payload: CohortIn,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> CohortOut:
    own = department_id_for(user)
    owned_cohort(db, cohort_id, own)
    forbid_other_department(payload.department_id, own)
    return patch_cohort(cohort_id, payload.model_copy(update={"department_id": own}), db, user)


@router.delete("/cohorts/{cohort_id}", status_code=status.HTTP_204_NO_CONTENT)
def department_delete_cohort(
    cohort_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> Response:
    own = department_id_for(user)
    owned_cohort(db, cohort_id, own)
    return delete_cohort(cohort_id, db, user)


def assignment_in_department(db: Session, payload: AssignmentIn, own: int) -> None:
    course = db.get(Course, payload.course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    forbid_other_department(course.department_id, own)
    cohort = db.get(Cohort, payload.cohort_id)
    if cohort is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")
    forbid_other_department(cohort.department_id, own)
    if payload.lecturer_id is not None:
        lecturer = db.get(Lecturer, payload.lecturer_id)
        if lecturer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecturer not found")
        forbid_other_department(lecturer.department_id, own)


@router.get("/assignments", response_model=list[AssignmentOut])
def department_assignments(
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> list[AssignmentOut]:
    return list_assignments(department_id=department_id_for(user), db=db, _user=user)


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def department_create_assignment(
    payload: AssignmentIn,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> AssignmentOut:
    own = department_id_for(user)
    assignment_in_department(db, payload, own)
    return create_assignment(payload, db, user)


@router.patch("/assignments/{assignment_id}", response_model=AssignmentOut)
def department_patch_assignment(
    assignment_id: int,
    payload: AssignmentIn,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> AssignmentOut:
    own = department_id_for(user)
    row = db.get(CourseAssignment, assignment_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    course = db.get(Course, row.course_id)
    if course is None or course.department_id != own:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
    assignment_in_department(db, payload, own)
    return patch_assignment(assignment_id, payload, db, user)


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def department_delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> Response:
    own = department_id_for(user)
    row = load_assignment(db, assignment_id)
    course = row.course
    if course is None or course.department_id != own:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
    return delete_assignment(assignment_id, db, user)


@router.get("/lecturer-availability", response_model=list[LecturerAvailabilitySummary])
def department_lecturer_availability(
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> list[LecturerAvailabilitySummary]:
    rows = availability_summary(db, department_id_for(user))
    return [LecturerAvailabilitySummary.model_validate(row) for row in rows]


@router.get("/constraints", response_model=list[DepartmentConstraintOut])
def list_constraints(
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> list[DepartmentConstraintOut]:
    own = department_id_for(user)
    rows = (
        db.query(DepartmentConstraint)
        .filter(DepartmentConstraint.department_id == own)
        .order_by(DepartmentConstraint.id)
        .all()
    )
    return [DepartmentConstraintOut.model_validate(row) for row in rows]


@router.post(
    "/constraints", response_model=DepartmentConstraintOut, status_code=status.HTTP_201_CREATED
)
def create_constraint(
    payload: DepartmentConstraintIn,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> DepartmentConstraintOut:
    own = department_id_for(user)
    try:
        validate_constraint(payload)
    except PortalError as exc:
        raise_portal(exc)
    row = DepartmentConstraint(
        department_id=own,
        kind=payload.kind,
        weekday=payload.weekday,
        period=payload.period,
        room_type=payload.room_type,
        note=payload.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return DepartmentConstraintOut.model_validate(row)


@router.patch("/constraints/{constraint_id}", response_model=DepartmentConstraintOut)
def patch_constraint(
    constraint_id: int,
    payload: DepartmentConstraintIn,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> DepartmentConstraintOut:
    own = department_id_for(user)
    row = db.get(DepartmentConstraint, constraint_id)
    if row is None or row.department_id != own:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Constraint not found")
    try:
        validate_constraint(payload)
    except PortalError as exc:
        raise_portal(exc)
    row.kind = payload.kind
    row.weekday = payload.weekday
    row.period = payload.period
    row.room_type = payload.room_type
    row.note = payload.note
    db.commit()
    db.refresh(row)
    return DepartmentConstraintOut.model_validate(row)


@router.delete("/constraints/{constraint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_constraint(
    constraint_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> Response:
    own = department_id_for(user)
    row = db.get(DepartmentConstraint, constraint_id)
    if row is None or row.department_id != own:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Constraint not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/conflicts", response_model=list[PublishedConflictOut])
def department_conflicts(
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> list[PublishedConflictOut]:
    own = department_id_for(user)
    session = active_session(db)
    version = current_version(db, session.id if session is not None else None)
    if version is None:
        return []
    rows = published_conflicts(version.slots, own)
    return [PublishedConflictOut.model_validate(row) for row in rows]
