from app.models.academic import (
    AcademicSession,
    Cohort,
    Course,
    CourseAssignment,
    Faculty,
    Lecturer,
    Room,
)
from app.models.activity import AuditEvent, Notification
from app.models.constraints import (
    ConstraintWeightProfile,
    LecturerAvailabilityException,
    LecturerAvailabilitySlot,
    LecturerPreference,
    RoomAvailabilityBlock,
    RoomAvailabilitySlot,
    SchedulingConstraint,
)
from app.models.disruption import Disruption
from app.models.health_probe import HealthProbe
from app.models.identity import Department, EmailToken, Session, User
from app.models.portal import DepartmentConstraint, ScheduleRequest, UserSettings
from app.models.timetable import (
    TimetableConflict,
    TimetableRun,
    TimetableSlot,
    TimetableSolution,
    TimetableVersion,
    TimetableVersionSlot,
)

__all__ = [
    "AcademicSession",
    "AuditEvent",
    "Cohort",
    "ConstraintWeightProfile",
    "Course",
    "CourseAssignment",
    "Department",
    "DepartmentConstraint",
    "Disruption",
    "EmailToken",
    "Faculty",
    "HealthProbe",
    "Lecturer",
    "LecturerAvailabilityException",
    "LecturerAvailabilitySlot",
    "LecturerPreference",
    "Notification",
    "Room",
    "RoomAvailabilityBlock",
    "RoomAvailabilitySlot",
    "SchedulingConstraint",
    "ScheduleRequest",
    "Session",
    "TimetableConflict",
    "TimetableRun",
    "TimetableSlot",
    "TimetableSolution",
    "TimetableVersion",
    "TimetableVersionSlot",
    "User",
    "UserSettings",
]
