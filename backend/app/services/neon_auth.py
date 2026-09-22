"""Neon Auth token checks. Tests replace verify_neon_token."""

from __future__ import annotations

from app.core.config import get_settings


def neon_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.neon_auth_issuer and settings.neon_auth_audience and settings.neon_auth_jwks_url
    )


def verify_neon_token(token: str) -> dict:
    import jwt
    from jwt import PyJWKClient

    settings = get_settings()
    if not neon_configured():
        raise ValueError("Neon Auth is not configured")
    client = PyJWKClient(settings.neon_auth_jwks_url)
    key = client.get_signing_key_from_jwt(token)
    claims = jwt.decode(
        token,
        key.key,
        algorithms=["RS256"],
        audience=settings.neon_auth_audience,
        issuer=settings.neon_auth_issuer,
    )
    if not isinstance(claims, dict) or not claims.get("sub"):
        raise ValueError("Neon token is missing a subject")
    return claims
