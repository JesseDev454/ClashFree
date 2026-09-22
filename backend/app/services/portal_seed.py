from sqlalchemy.orm import Session

from app.models.academic import Cohort
from app.models.identity import Department, User
from app.models.portal import DepartmentConstraint
from app.services.repair_seed import seed_phase8

STUDENT_EMAIL = "student@clashfree.test"
STUDENT_COHORT = "SWE-300-A"
DEMO_NOTE = "Phase 9 departmental lab need"


def seed_phase9(session: Session) -> None:
    """Link the seed student to a cohort and record one department rule."""
    seed_phase8(session)
    cohort = session.query(Cohort).filter(Cohort.code == STUDENT_COHORT).one_or_none()
    student = session.query(User).filter(User.email == STUDENT_EMAIL).one_or_none()
    if student is not None and cohort is not None and student.cohort_id is None:
        student.cohort_id = cohort.id
        session.commit()

    department = session.query(Department).filter(Department.code == "SWE").one_or_none()
    if department is None:
        return
    existing = (
        session.query(DepartmentConstraint)
        .filter(DepartmentConstraint.note == DEMO_NOTE)
        .one_or_none()
    )
    if existing is None:
        session.add(
            DepartmentConstraint(
                department_id=department.id,
                kind="lab_need",
                room_type="lab",
                note=DEMO_NOTE,
            )
        )
        session.commit()
