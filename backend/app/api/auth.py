from datetime import UTC, datetime
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
    AuthConfigOut,
    AuthResponse,
    DebugTokenResponse,
    ForgotPasswordRequest,
    LoginRequest,
    NeonLoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserOut,
    VerifyEmailRequest,
)
from app.services.mailer import get_mailer
from app.services.neon_auth import neon_configured, verify_neon_token
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


def reject_if_neon() -> None:
    if neon_configured():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Password accounts are disabled while Neon Auth is configured",
        )


def send_link(user: User, purpose: str, raw_token: str) -> None:
    settings = get_settings()
    if purpose == "reset":
        path = f"/auth/reset-password?token={raw_token}"
        subject = "Reset your ClashFree password"
    else:
        path = f"/auth/verify-email?token={raw_token}"
        subject = "Verify your ClashFree email"
    link = f"{settings.app_origin.rstrip('/')}{path}"
    get_mailer().send(user.email, subject, f"Use this link: {link}")


@router.get("/config", response_model=AuthConfigOut)
def auth_config() -> AuthConfigOut:
    return AuthConfigOut(neon=neon_configured())


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    reject_if_neon()
    from app.core.security import hash_password
    from app.services.activity import add_audit

    if get_user_by_email(db, payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
        )
    now = datetime.now(UTC)
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role="student",
        department_id=None,
        cohort_id=None,
        is_active=True,
        email_verified_at=None,
        created_at=now,
    )
    db.add(user)
    db.flush()
    raw = issue_email_token(db, user, "verify")
    add_audit(
        db,
        actor_id=None,
        action="user.registered",
        entity_type="user",
        entity_id=user.id,
        summary=f"Student registered {user.email}",
    )
    db.commit()
    db.refresh(user)
    send_link(user, "verify", raw)
    return AuthResponse(user=serialize_user(user))


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> None:
    token = consume_email_token(db, payload.token, "verify")
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired",
        )
    user = db.get(User, token.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired",
        )
    user.email_verified_at = datetime.now(UTC)
    db.commit()


@router.post("/neon", response_model=AuthResponse)
def neon_login(
    payload: NeonLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    if not neon_configured():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Neon Auth is not configured",
        )
    try:
        claims = verify_neon_token(payload.token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Neon token",
        ) from exc
    subject = str(claims.get("sub") or "")
    user = db.query(User).filter(User.auth_subject == subject).one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown account")
    raw = create_session(db, user.id)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, raw)
    return AuthResponse(user=serialize_user(user))


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
    reject_if_neon()
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
    reject_if_neon()
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
