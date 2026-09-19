from sqlalchemy.orm import Session, joinedload

from app.models.identity import User


def get_user_by_email(session: Session, email: str) -> User | None:
    return (
        session.query(User)
        .options(joinedload(User.department))
        .filter(User.email == email.lower().strip())
        .one_or_none()
    )
