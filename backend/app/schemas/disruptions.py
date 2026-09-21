from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DisruptionImpactClass(BaseModel):
    assignment_id: int
    meeting_index: int
    course_code: str | None = None
    course_title: str | None = None
    cohort_code: str | None = None
    cohort_size: int = 0
    weekday: str
    start_period: str
    end_period: str
    room_code: str | None = None
    lecturer_name: str | None = None


class DisruptionImpact(BaseModel):
    classes_affected: int
    students_affected: int
    published: bool
    classes: list[DisruptionImpactClass] = Field(default_factory=list)


class DisruptionIn(BaseModel):
    kind: str
    room_id: int | None = None
    lecturer_id: int | None = None
    reason: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    severity: str = "medium"
    starts_on: date
    ends_on: date
    start_period: str | None = None
    end_period: str | None = None
    create_block: bool = False


class DisruptionPatch(BaseModel):
    status: str | None = None
    reason: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    severity: str | None = None
    starts_on: date | None = None
    ends_on: date | None = None
    start_period: str | None = None
    end_period: str | None = None


class DisruptionOut(BaseModel):
    id: int
    code: str
    session_id: int
    kind: str
    room_id: int | None
    lecturer_id: int | None
    resource_label: str
    reason: str
    description: str | None
    severity: str
    starts_on: date
    ends_on: date
    start_period: str | None
    end_period: str | None
    status: str
    reported_by: int
    reporter_name: str | None
    reporter_role: str | None
    block_id: int | None
    classes_affected: int
    students_affected: int
    created_at: str
    updated_at: str
    impact: DisruptionImpact | None = None

    model_config = ConfigDict(from_attributes=True)


class DisruptionSummaryOut(BaseModel):
    active: int
    scheduled: int
    open: int
    in_review: int
    room_active: int
    lecturer_active: int
    classes_affected: int
    students_affected: int
    published: bool
