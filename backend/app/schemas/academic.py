from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class FacultyIn(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=128)


class FacultyOut(BaseModel):
    id: int
    code: str
    name: str
    department_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class DepartmentIn(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=128)
    faculty_id: int


class DepartmentOut(BaseModel):
    id: int
    code: str
    name: str
    faculty_id: int | None
    faculty_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AcademicSessionIn(BaseModel):
    label: str = Field(min_length=1, max_length=32)
    semester: str
    starts_on: date
    ends_on: date
    status: str = "draft"
    draft_opens_on: date | None = None
    publish_deadline_on: date | None = None


class AcademicSessionOut(BaseModel):
    id: int
    label: str
    semester: str
    starts_on: date
    ends_on: date
    status: str
    draft_opens_on: date | None
    publish_deadline_on: date | None
    duration_days: int = 0

    model_config = ConfigDict(from_attributes=True)


class CourseIn(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    title: str = Field(min_length=1, max_length=255)
    department_id: int
    level: int
    units: int = Field(ge=1, le=12)
    expected_size: int = Field(ge=1)
    room_type: str


class CourseOut(BaseModel):
    id: int
    code: str
    title: str
    department_id: int
    department_name: str | None = None
    level: int
    units: int
    expected_size: int
    room_type: str
    status: str
    lecturer_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CohortIn(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    department_id: int
    level: int
    size: int = Field(ge=1)
    status: str = "complete"


class CohortOut(BaseModel):
    id: int
    code: str
    department_id: int
    department_name: str | None = None
    level: int
    size: int
    status: str
    course_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class LecturerIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    department_id: int
    user_id: int | None = None
    max_weekly_hours: int = Field(default=24, ge=1, le=40)
    status: str = "available"


class LecturerOut(BaseModel):
    id: int
    full_name: str
    department_id: int
    department_name: str | None = None
    user_id: int | None
    max_weekly_hours: int
    status: str
    course_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class RoomIn(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    building: str = Field(min_length=1, max_length=128)
    room_type: str
    capacity: int = Field(ge=1)
    equipment: str | None = None
    status: str = "available"


class RoomOut(BaseModel):
    id: int
    code: str
    building: str
    room_type: str
    capacity: int
    equipment: str | None
    status: str

    model_config = ConfigDict(from_attributes=True)


class AssignmentIn(BaseModel):
    course_id: int
    cohort_id: int
    lecturer_id: int | None = None
    contact_pattern: str = Field(min_length=1, max_length=64)


class AssignmentOut(BaseModel):
    id: int
    course_id: int
    course_code: str | None = None
    course_title: str | None = None
    cohort_id: int
    cohort_code: str | None = None
    lecturer_id: int | None
    lecturer_name: str | None = None
    contact_pattern: str
    room_type: str | None = None
    expected_size: int | None = None
    status: str = "draft"
    department_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class AcademicSummary(BaseModel):
    courses: int
    lecturers: int
    cohorts: int
    rooms: int
    faculties: int
    departments: int
    active_session_label: str | None
    active_semester: str | None
