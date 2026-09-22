from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.rbac import ROLE_HOME_PATH, capabilities_for
from app.core.security import create_session, hash_token, verify_password
from app.models.identity import Session as SessionModel
from app.models.identity import User
from app.schemas.auth import (
    AuthResponse,
    DebugTokenResponse,
    ForgotPasswordRequest,
    LoginRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserOut,
)
from app.services.mailer import mailer
from app.services.tokens import consume_email_token, get_debug_token, issue_email_token
from app.services.users import get_user_by_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


def serialize_user(user: User) -> UserOut:
    department_name = user.department.name if user.department is not None else None
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department_id=user.department_id,
        department_name=department_name,
        cohort_id=user.cohort_id,
        is_active=user.is_active,
        capabilities=capabilities_for(user.role),
        home_path=ROLE_HOME_PATH[user.role],
    )


def set_session_cookie(response: Response, raw_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=raw_token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
        max_age=settings.session_ttl_hours * 3600,
    )


def clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(key=settings.session_cookie_name, path="/")


def send_link(user: User, purpose: str, raw_token: str) -> None:
    settings = get_settings()
    if purpose == "reset":
        path = f"/auth/reset-password?token={raw_token}"
        subject = "Reset your ClashFree password"
    else:
        path = f"/auth/verify-email?token={raw_token}"
        subject = "Verify your ClashFree email"
    link = f"{settings.app_origin.rstrip('/')}{path}"
    mailer.send(user.email, subject, f"Use this link: {link}")


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    user = get_user_by_email(db, payload.email)
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user.email_verified_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email is not verified",
        )
    raw = create_session(db, user.id)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, raw)
    return AuthResponse(user=serialize_user(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    clashfree_session: Annotated[str | None, Cookie()] = None,
) -> None:
    if clashfree_session:
        record = (
            db.query(SessionModel)
            .filter(SessionModel.token_hash == hash_token(clashfree_session))
            .one_or_none()
        )
        if record is not None:
            db.delete(record)
            db.commit()
    clear_session_cookie(response)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> None:
    user = get_user_by_email(db, payload.email)
    if user is None:
        return
    raw = issue_email_token(db, user, "reset")
    db.commit()
    send_link(user, "reset", raw)


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)) -> None:
    user = get_user_by_email(db, payload.email)
    if user is None:
        return
    raw = issue_email_token(db, user, "verify")
    db.commit()
    send_link(user, "verify", raw)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> None:
    from app.core.security import hash_password

    token = consume_email_token(db, payload.token, "reset")
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired",
        )
    user = db.get(User, token.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired",
        )
    user.password_hash = hash_password(payload.password)
    for session_row in list(user.sessions):
        db.delete(session_row)
    db.commit()


@router.get("/debug/last-token", response_model=DebugTokenResponse)
def debug_last_token(email: str) -> DebugTokenResponse:
    settings = get_settings()
    if not settings.auth_debug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    stored = get_debug_token(email)
    if stored is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No token issued")
    return DebugTokenResponse(email=email.lower(), purpose=stored["purpose"], token=stored["token"])
