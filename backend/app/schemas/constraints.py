from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ConstraintOut(BaseModel):
    id: int
    code: str
    name: str
    description: str
    kind: str
    locked: bool
    enabled: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class ConstraintEnabledIn(BaseModel):
    enabled: bool


class WeightProfileOut(BaseModel):
    id: int
    code: str
    name: str
    schedule_stability: int
    student_idle_gaps: int
    room_utilization: int
    lecturer_preferences: int
    daily_balance: int
    building_movement: int
    is_current: bool

    model_config = ConfigDict(from_attributes=True)


class WeightProfileIn(BaseModel):
    schedule_stability: int = Field(ge=0, le=10)
    student_idle_gaps: int = Field(ge=0, le=10)
    room_utilization: int = Field(ge=0, le=10)
    lecturer_preferences: int = Field(ge=0, le=10)
    daily_balance: int = Field(ge=0, le=10)
    building_movement: int = Field(ge=0, le=10)


class SlotIn(BaseModel):
    weekday: str
    period: str
    state: str


class SlotOut(BaseModel):
    weekday: str
    period: str
    state: str

    model_config = ConfigDict(from_attributes=True)


class AvailabilityExceptionIn(BaseModel):
    starts_on: date
    ends_on: date
    start_period: str | None = None
    end_period: str | None = None
    reason: str = Field(min_length=1, max_length=255)
    kind: str = "unavailable"


class AvailabilityExceptionOut(BaseModel):
    id: int
    starts_on: date
    ends_on: date
    start_period: str | None
    end_period: str | None
    reason: str
    kind: str

    model_config = ConfigDict(from_attributes=True)


class LecturerAvailabilityOut(BaseModel):
    lecturer_id: int
    lecturer_name: str
    submitted: bool
    coverage_percent: int
    available_slots: int
    preferred_slots: int
    unavailable_slots: int
    slots: list[SlotOut]
    exceptions: list[AvailabilityExceptionOut]


class AvailabilitySlotsIn(BaseModel):
    slots: list[SlotIn]


class LecturerPreferenceIn(BaseModel):
    prefer_morning: bool
    avoid_friday_afternoon: bool
    no_early_after_late: bool
    max_classes_per_day: int = Field(ge=1, le=8)
    max_consecutive_hours: int = Field(ge=1, le=10)
    min_break_minutes: int = Field(ge=0, le=240)
    preferred_days: list[str]


class LecturerPreferenceOut(LecturerPreferenceIn):
    lecturer_id: int

    model_config = ConfigDict(from_attributes=True)


class RoomBlockIn(BaseModel):
    starts_on: date
    ends_on: date
    start_period: str | None = None
    end_period: str | None = None
    reason: str = Field(min_length=1, max_length=255)
    kind: str
    recurring: bool = False


class RoomBlockOut(BaseModel):
    id: int
    starts_on: date
    ends_on: date
    start_period: str | None
    end_period: str | None
    reason: str
    kind: str
    recurring: bool

    model_config = ConfigDict(from_attributes=True)


class RoomAvailabilityOut(BaseModel):
    room_id: int
    room_code: str
    slots: list[SlotOut]
    blocks: list[RoomBlockOut]


class ConstraintSummary(BaseModel):
    hard: int
    soft: int
    soft_enabled: int
    department_rules: int = 0
    current_profile: str | None
    validation_percent: int
