import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from pwdlib import PasswordHash
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.models.identity import Session

password_hasher = PasswordHash.recommended()


def hash_password(plain: str) -> str:
    return password_hasher.hash(plain)


def verify_password(plain: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return password_hasher.verify(plain, password_hash)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(32)


def create_session(db: DbSession, user_id: int) -> str:
    settings = get_settings()
    raw = new_token()
    now = datetime.now(UTC)
    db.add(
        Session(
            user_id=user_id,
            token_hash=hash_token(raw),
            expires_at=now + timedelta(hours=settings.session_ttl_hours),
            created_at=now,
        )
    )
    return raw


def get_session_by_raw_token(db: DbSession, raw: str) -> Session | None:
    if not raw:
        return None
    record = db.query(Session).filter(Session.token_hash == hash_token(raw)).one_or_none()
    if record is None:
        return None
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires < datetime.now(UTC):
        db.delete(record)
        return None
    return record
