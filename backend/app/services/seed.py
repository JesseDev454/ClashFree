from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.identity import Department, User

SEED_DEPARTMENT = ("SWE", "Software Engineering")

SEED_USERS = (
    {
        "email": "admin@clashfree.test",
        "full_name": "Ada Okonkwo",
        "role": "timetable_administrator",
        "department": False,
    },
    {
        "email": "coordinator@clashfree.test",
        "full_name": "Chinedu Bello",
        "role": "department_coordinator",
        "department": True,
    },
    {
        "email": "lecturer@clashfree.test",
        "full_name": "Dr. Amina Yusuf",
        "role": "lecturer",
        "department": True,
    },
    {
        "email": "facilities@clashfree.test",
        "full_name": "Ibrahim Musa",
        "role": "facilities_manager",
        "department": False,
    },
    {
        "email": "student@clashfree.test",
        "full_name": "Ngozi Eze",
        "role": "student",
        "department": True,
    },
)


def seed_phase2(session: Session) -> None:
    settings = get_settings()
    password_hash = hash_password(settings.seed_password)
    now = datetime.now(UTC)

    department = (
        session.query(Department).filter(Department.code == SEED_DEPARTMENT[0]).one_or_none()
    )
    if department is None:
        department = Department(code=SEED_DEPARTMENT[0], name=SEED_DEPARTMENT[1])
        session.add(department)
        session.flush()

    for spec in SEED_USERS:
        user = session.query(User).filter(User.email == spec["email"]).one_or_none()
        if user is None:
            user = User(
                email=spec["email"],
                password_hash=password_hash,
                full_name=spec["full_name"],
                role=spec["role"],
                department_id=department.id if spec["department"] else None,
                email_verified_at=now,
                created_at=now,
            )
            session.add(user)
        else:
            user.password_hash = password_hash
            user.full_name = spec["full_name"]
            user.role = spec["role"]
            user.department_id = department.id if spec["department"] else None
            if user.email_verified_at is None:
                user.email_verified_at = now
    session.commit()
