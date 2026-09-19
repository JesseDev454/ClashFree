from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.rbac import has_capability
from app.core.security import get_session_by_raw_token
from app.models.identity import User


def get_current_user(
    db: Session = Depends(get_db),
    clashfree_session: Annotated[str | None, Cookie()] = None,
) -> User:
    raw = clashfree_session
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    record = get_session_by_raw_token(db, raw)
    if record is None:
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = (
        db.query(User)
        .options(joinedload(User.department))
        .filter(User.id == record.user_id)
        .one_or_none()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_capability(capability: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if not has_capability(user.role, capability):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return user

    return dependency


def require_roles(*roles: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return user

    return dependency
