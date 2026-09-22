from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class GenerateIn(BaseModel):
    time_limit_seconds: int = Field(default=30, ge=5, le=120)
    alternative_count: int = Field(default=1, ge=1, le=3)
    random_seed: int | None = Field(default=None, ge=0, le=1_000_000)
    faculty_id: int | None = None
    department_id: int | None = None

    @model_validator(mode="after")
    def one_scope(self):
        if self.faculty_id is not None and self.department_id is not None:
            raise ValueError("Set faculty or department, not both")
        return self


class RepairIn(GenerateIn):
    disruption_id: int


class PreflightOut(BaseModel):
    session_label: str | None
    semester: str | None
    profile_name: str | None
    ready_assignments: int
    incomplete_assignments: int
    incomplete_codes: list[str]
    rooms_total: int
    rooms_usable: int
    rooms_excluded: int
    lecturers_total: int
    lecturers_submitted: int
    hard_constraints: int
    soft_constraints: int
    soft_enabled: int
    can_generate: bool


class SlotOut(BaseModel):
    id: int
    assignment_id: int
    meeting_index: int
    weekday: str
    start_period: str
    end_period: str
    room_id: int
    room_code: str | None = None
    course_code: str | None = None
    course_title: str | None = None
    lecturer_id: int | None = None
    lecturer_name: str | None = None
    cohort_id: int | None = None
    cohort_code: str | None = None
    department_id: int | None = None
    department_name: str | None = None
    building: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ConflictOut(BaseModel):
    id: int
    kind: str
    severity: str
    title: str
    detail: str
    weekday: str | None
    period: str | None
    assignment_ids: list[int]

    model_config = ConfigDict(from_attributes=True)


class SolutionOut(BaseModel):
    id: int
    run_id: int
    label: str
    objective: int
    hard_violations: int
    soft_penalty: int
    room_utilization_percent: int
    student_gap_hours: float
    is_selected: bool
    moved_count: int = 0
    preserved_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class RunOut(BaseModel):
    id: int
    session_id: int
    weight_profile_id: int
    status: str
    time_limit_seconds: int
    alternative_count: int
    random_seed: int | None
    started_at: datetime
    finished_at: datetime | None
    solve_time_ms: int | None
    message: str | None
    created_by: int
    purpose: str = "generate"
    disruption_id: int | None = None
    profile_name: str | None = None
    session_label: str | None = None
    solutions: list[SolutionOut] = []

    model_config = ConfigDict(from_attributes=True)


class DraftOut(BaseModel):
    run: RunOut
    solution: SolutionOut
    slots: list[SlotOut]
    conflicts: list[ConflictOut]


class PublishIn(BaseModel):
    notes: str | None = Field(default=None, max_length=500)


class VersionOut(BaseModel):
    id: int
    session_id: int
    solution_id: int
    run_id: int
    version_number: int
    status: str
    is_current: bool
    notes: str | None
    published_at: datetime
    published_by: int
    publisher_name: str | None = None
    session_label: str | None = None
    slot_count: int
    hard_violations: int
    soft_penalty: int
    room_utilization_percent: int
    slots: list[SlotOut] = []

    model_config = ConfigDict(from_attributes=True)


class ChangeOut(BaseModel):
    kind: str
    assignment_id: int
    meeting_index: int
    course_code: str | None = None
    from_weekday: str | None = None
    from_start_period: str | None = None
    from_room_code: str | None = None
    to_weekday: str | None = None
    to_start_period: str | None = None
    to_room_code: str | None = None
