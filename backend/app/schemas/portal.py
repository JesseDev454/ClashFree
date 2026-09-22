from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import EmailAddress

DisplayDensity = Literal["comfortable", "compact"]
WeekStart = Literal["mon", "sun"]


class UserCreate(BaseModel):
    email: EmailAddress
    full_name: str = Field(min_length=1, max_length=255)
    role: str
    password: str = Field(min_length=8, max_length=128)
    department_id: int | None = None
    cohort_id: int | None = None
    lecturer_id: int | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    department_id: int | None = None
    cohort_id: int | None = None
    lecturer_id: int | None = None
    is_active: bool | None = None


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)


class SettingsIn(BaseModel):
    display_density: DisplayDensity = "comfortable"
    week_starts_on: WeekStart = "mon"
    notify_timetable_changes: bool = True
    notify_requests: bool = True


class SettingsOut(SettingsIn):
    pass


class DepartmentConstraintIn(BaseModel):
    kind: str
    weekday: str | None = None
    period: str | None = None
    room_type: str | None = None
    note: str | None = Field(default=None, max_length=255)


class DepartmentConstraintOut(BaseModel):
    id: int
    department_id: int
    kind: str
    weekday: str | None
    period: str | None
    room_type: str | None
    note: str | None

    model_config = ConfigDict(from_attributes=True)


class LecturerAvailabilitySummary(BaseModel):
    lecturer_id: int
    full_name: str
    slot_count: int
    submitted: bool


class RequestCreate(BaseModel):
    kind: str
    title: str = Field(min_length=1, max_length=255)
    detail: str = Field(min_length=1, max_length=2000)
    assignment_id: int | None = None


class RequestUpdate(BaseModel):
    status: str


class RequestOut(BaseModel):
    id: int
    session_id: int
    department_id: int
    requester_id: int
    requester_name: str | None = None
    kind: str
    status: str
    title: str
    detail: str
    assignment_id: int | None
    created_at: datetime
    decided_at: datetime | None
    decided_by: int | None


class PublishedConflictOut(BaseModel):
    kind: str
    severity: str
    title: str
    detail: str
    weekday: str | None = None
    period: str | None = None
    assignment_ids: list[int]


class MaintenanceBlockOut(BaseModel):
    id: int
    room_id: int
    room_code: str | None = None
    starts_on: date
    ends_on: date
    start_period: str | None
    end_period: str | None
    reason: str
    kind: str
