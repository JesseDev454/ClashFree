from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, BaseModel, ConfigDict, Field


def normalize_email(value: str) -> str:
    try:
        result = validate_email(value, check_deliverability=False, test_environment=True)
    except EmailNotValidError as exc:
        raise ValueError("Enter a valid email address") from exc
    return result.normalized


EmailAddress = Annotated[str, AfterValidator(normalize_email)]


class LoginRequest(BaseModel):
    email: EmailAddress
    password: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailAddress


class ResendVerificationRequest(BaseModel):
    email: EmailAddress


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailAddress
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=255)


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1)


class NeonLoginRequest(BaseModel):
    token: str = Field(min_length=1)


class AuthConfigOut(BaseModel):
    neon: bool


class DepartmentOut(BaseModel):
    id: int
    code: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department_id: int | None
    department_name: str | None
    cohort_id: int | None = None
    is_active: bool = True
    capabilities: list[str]
    home_path: str


class AuthResponse(BaseModel):
    user: UserOut


class DebugTokenResponse(BaseModel):
    email: str
    purpose: str
    token: str
