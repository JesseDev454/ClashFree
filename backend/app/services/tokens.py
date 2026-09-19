from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.security import hash_token, new_token
from app.models.identity import EmailToken, User

TOKEN_TTL_HOURS = 2

_last_raw_tokens: dict[str, dict[str, str]] = {}


def record_debug_token(email: str, purpose: str, raw: str) -> None:
    _last_raw_tokens[email.lower()] = {"purpose": purpose, "token": raw}


def get_debug_token(email: str) -> dict[str, str] | None:
    return _last_raw_tokens.get(email.lower())


def issue_email_token(session: Session, user: User, purpose: str) -> str:
    raw = new_token()
    now = datetime.now(UTC)
    session.add(
        EmailToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=hash_token(raw),
            expires_at=now + timedelta(hours=TOKEN_TTL_HOURS),
            created_at=now,
        )
    )
    record_debug_token(user.email, purpose, raw)
    return raw


def consume_email_token(session: Session, raw: str, purpose: str) -> EmailToken | None:
    record = (
        session.query(EmailToken)
        .filter(
            EmailToken.token_hash == hash_token(raw),
            EmailToken.purpose == purpose,
        )
        .one_or_none()
    )
    if record is None or record.used_at is not None:
        return None
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires < datetime.now(UTC):
        return None
    record.used_at = datetime.now(UTC)
    return record
