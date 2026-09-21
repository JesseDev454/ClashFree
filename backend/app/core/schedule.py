WEEKDAYS = ("mon", "tue", "wed", "thu", "fri")
PERIODS = ("08-10", "10-12", "12-14", "14-16", "16-18")
LECTURER_SLOT_STATES = ("available", "preferred", "unavailable")
ROOM_SLOT_STATES = ("available", "reserved", "unavailable")
CONSTRAINT_KINDS = ("hard", "soft")
EXCEPTION_KINDS = ("unavailable",)
ROOM_BLOCK_KINDS = ("unavailable", "reserved", "maintenance")
WEIGHT_FIELDS = (
    "schedule_stability",
    "student_idle_gaps",
    "room_utilization",
    "lecturer_preferences",
    "daily_balance",
    "building_movement",
)

SLOT_COUNT = len(WEEKDAYS) * len(PERIODS)
