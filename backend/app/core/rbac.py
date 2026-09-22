from typing import Final

APP_ROLES: Final[tuple[str, ...]] = (
    "timetable_administrator",
    "department_coordinator",
    "lecturer",
    "facilities_manager",
    "student",
)

CAPABILITIES: Final[tuple[str, ...]] = (
    "view",
    "edit",
    "submitRequest",
    "reportDisruption",
    "generate",
    "approveRepair",
    "publish",
)

ROLE_CAPABILITIES: Final[dict[str, frozenset[str]]] = {
    "timetable_administrator": frozenset(
        {
            "view",
            "edit",
            "submitRequest",
            "reportDisruption",
            "generate",
            "approveRepair",
            "publish",
        }
    ),
    "department_coordinator": frozenset(
        {"view", "edit", "submitRequest", "generate", "approveRepair"}
    ),
    "lecturer": frozenset({"view", "edit", "submitRequest", "reportDisruption"}),
    "facilities_manager": frozenset({"view", "edit", "reportDisruption"}),
    "student": frozenset({"view"}),
}

ROLE_HOME_PATH: Final[dict[str, str]] = {
    "timetable_administrator": "/admin/dashboard",
    "department_coordinator": "/coordinator/dashboard",
    "lecturer": "/lecturer/dashboard",
    "facilities_manager": "/facilities/dashboard",
    "student": "/student/dashboard",
}

ROLE_LABELS: Final[dict[str, str]] = {
    "timetable_administrator": "Administrator",
    "department_coordinator": "Department Coordinator",
    "lecturer": "Lecturer",
    "facilities_manager": "Facilities Manager",
    "student": "Student",
}


def capabilities_for(role: str) -> list[str]:
    return sorted(ROLE_CAPABILITIES.get(role, frozenset()))


def has_capability(role: str, capability: str) -> bool:
    return capability in ROLE_CAPABILITIES.get(role, frozenset())
