from datetime import date

from sqlalchemy.orm import Session

from app.core.schedule import PERIODS, WEEKDAYS
from app.models.academic import Lecturer, Room
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
from app.services.academic_seed import seed_phase3

SEED_CONSTRAINTS = (
    {
        "code": "no_lecturer_clash",
        "name": "No lecturer clash",
        "description": "A lecturer cannot teach two classes at the same time.",
        "kind": "hard",
        "locked": True,
        "enabled": True,
        "sort_order": 1,
    },
    {
        "code": "no_room_clash",
        "name": "No room clash",
        "description": "A room cannot hold more than one class in the same slot.",
        "kind": "hard",
        "locked": True,
        "enabled": True,
        "sort_order": 2,
    },
    {
        "code": "no_cohort_clash",
        "name": "No cohort clash",
        "description": "Required courses for the same cohort cannot overlap.",
        "kind": "hard",
        "locked": True,
        "enabled": True,
        "sort_order": 3,
    },
    {
        "code": "capacity_requirement",
        "name": "Capacity requirement",
        "description": "Assigned room capacity must meet expected attendance.",
        "kind": "hard",
        "locked": True,
        "enabled": True,
        "sort_order": 4,
    },
    {
        "code": "special_room_compatibility",
        "name": "Special room compatibility",
        "description": "Labs and specialist courses require eligible room types.",
        "kind": "hard",
        "locked": True,
        "enabled": True,
        "sort_order": 5,
    },
    {
        "code": "lecturer_availability",
        "name": "Lecturer availability",
        "description": "Classes may only be placed when assigned lecturers are available.",
        "kind": "hard",
        "locked": True,
        "enabled": True,
        "sort_order": 6,
    },
    {
        "code": "minimize_student_idle_gaps",
        "name": "Minimize student idle gaps",
        "description": "Prefer compact daily schedules for cohorts.",
        "kind": "soft",
        "locked": False,
        "enabled": True,
        "sort_order": 10,
    },
    {
        "code": "respect_lecturer_preferences",
        "name": "Respect lecturer preferences",
        "description": "Prefer submitted days and times where feasible.",
        "kind": "soft",
        "locked": False,
        "enabled": True,
        "sort_order": 11,
    },
    {
        "code": "balance_classes_across_week",
        "name": "Balance classes across week",
        "description": "Avoid overloading individual days.",
        "kind": "soft",
        "locked": False,
        "enabled": True,
        "sort_order": 12,
    },
    {
        "code": "minimize_building_movement",
        "name": "Minimize building movement",
        "description": "Prefer nearby rooms for consecutive cohort classes.",
        "kind": "soft",
        "locked": False,
        "enabled": True,
        "sort_order": 13,
    },
    {
        "code": "preserve_published_assignments",
        "name": "Preserve published assignments",
        "description": "Penalize unnecessary changes during timetable repair.",
        "kind": "soft",
        "locked": False,
        "enabled": True,
        "sort_order": 14,
    },
)

SEED_WEIGHT_PROFILES = (
    {
        "code": "balanced",
        "name": "Balanced",
        "schedule_stability": 9,
        "student_idle_gaps": 7,
        "room_utilization": 6,
        "lecturer_preferences": 5,
        "daily_balance": 4,
        "building_movement": 3,
        "is_current": True,
    },
    {
        "code": "student_experience",
        "name": "Student Experience",
        "schedule_stability": 6,
        "student_idle_gaps": 10,
        "room_utilization": 4,
        "lecturer_preferences": 7,
        "daily_balance": 8,
        "building_movement": 5,
        "is_current": False,
    },
    {
        "code": "resource_efficiency",
        "name": "Resource Efficiency",
        "schedule_stability": 5,
        "student_idle_gaps": 4,
        "room_utilization": 10,
        "lecturer_preferences": 3,
        "daily_balance": 6,
        "building_movement": 8,
        "is_current": False,
    },
    {
        "code": "repair_stability",
        "name": "Repair Stability",
        "schedule_stability": 10,
        "student_idle_gaps": 5,
        "room_utilization": 4,
        "lecturer_preferences": 4,
        "daily_balance": 3,
        "building_movement": 2,
        "is_current": False,
    },
)

AMINA_SLOT_OVERRIDES = {
    ("mon", "08-10"): "preferred",
    ("mon", "14-16"): "preferred",
    ("tue", "10-12"): "preferred",
    ("wed", "08-10"): "unavailable",
    ("wed", "10-12"): "unavailable",
    ("wed", "12-14"): "unavailable",
    ("wed", "14-16"): "unavailable",
    ("wed", "16-18"): "unavailable",
    ("thu", "10-12"): "unavailable",
    ("thu", "14-16"): "preferred",
    ("fri", "16-18"): "unavailable",
}

LT1_SLOT_OVERRIDES = {
    **{("wed", period): "reserved" for period in PERIODS},
    **{("fri", period): "unavailable" for period in PERIODS},
}


def _upsert_constraint(session: Session, spec: dict) -> SchedulingConstraint:
    row = (
        session.query(SchedulingConstraint)
        .filter(SchedulingConstraint.code == spec["code"])
        .one_or_none()
    )
    if row is None:
        row = SchedulingConstraint(**spec)
        session.add(row)
        return row
    for key, value in spec.items():
        if key != "code":
            setattr(row, key, value)
    return row


def _upsert_profile(session: Session, spec: dict) -> ConstraintWeightProfile:
    row = (
        session.query(ConstraintWeightProfile)
        .filter(ConstraintWeightProfile.code == spec["code"])
        .one_or_none()
    )
    if row is None:
        row = ConstraintWeightProfile(**spec)
        session.add(row)
        return row
    for key, value in spec.items():
        if key != "code":
            setattr(row, key, value)
    return row


def _replace_slots(
    session: Session,
    model,
    owner_field: str,
    owner_id: int,
    overrides: dict,
) -> None:
    session.query(model).filter(getattr(model, owner_field) == owner_id).delete()
    for weekday in WEEKDAYS:
        for period in PERIODS:
            state = overrides.get((weekday, period), "available")
            session.add(
                model(
                    **{
                        owner_field: owner_id,
                        "weekday": weekday,
                        "period": period,
                        "state": state,
                    }
                )
            )


def seed_phase4(session: Session) -> None:
    seed_phase3(session)

    for spec in SEED_CONSTRAINTS:
        _upsert_constraint(session, spec)
    for spec in SEED_WEIGHT_PROFILES:
        _upsert_profile(session, spec)
    session.flush()

    amina = session.query(Lecturer).filter(Lecturer.full_name == "Dr. Amina Yusuf").one()
    _replace_slots(
        session,
        LecturerAvailabilitySlot,
        "lecturer_id",
        amina.id,
        AMINA_SLOT_OVERRIDES,
    )
    session.query(LecturerAvailabilityException).filter(
        LecturerAvailabilityException.lecturer_id == amina.id
    ).delete()
    session.add(
        LecturerAvailabilityException(
            lecturer_id=amina.id,
            starts_on=date(2026, 9, 24),
            ends_on=date(2026, 9, 24),
            start_period="10-12",
            end_period="12-14",
            reason="Department meeting",
            kind="unavailable",
        )
    )
    session.add(
        LecturerAvailabilityException(
            lecturer_id=amina.id,
            starts_on=date(2026, 10, 2),
            ends_on=date(2026, 10, 2),
            start_period=None,
            end_period=None,
            reason="Conference attendance",
            kind="unavailable",
        )
    )
    prefs = (
        session.query(LecturerPreference)
        .filter(LecturerPreference.lecturer_id == amina.id)
        .one_or_none()
    )
    values = {
        "prefer_morning": True,
        "avoid_friday_afternoon": True,
        "no_early_after_late": False,
        "max_classes_per_day": 2,
        "max_consecutive_hours": 4,
        "min_break_minutes": 60,
        "preferred_days": ["mon", "tue", "thu", "fri"],
    }
    if prefs is None:
        session.add(LecturerPreference(lecturer_id=amina.id, **values))
    else:
        for key, value in values.items():
            setattr(prefs, key, value)

    session.query(Disruption).update(
        {Disruption.block_id: None},
        synchronize_session=False,
    )
    session.flush()

    rooms = {room.code: room for room in session.query(Room).all()}
    for room in rooms.values():
        overrides = LT1_SLOT_OVERRIDES if room.code == "LT1" else {}
        _replace_slots(session, RoomAvailabilitySlot, "room_id", room.id, overrides)
        session.query(RoomAvailabilityBlock).filter(
            RoomAvailabilityBlock.room_id == room.id
        ).delete()

    lt1 = rooms["LT1"]
    session.add(
        RoomAvailabilityBlock(
            room_id=lt1.id,
            starts_on=date(2026, 9, 25),
            ends_on=date(2026, 9, 25),
            start_period="08-10",
            end_period="10-12",
            reason="Electrical preventive maintenance",
            kind="maintenance",
            recurring=False,
        )
    )
    session.add(
        RoomAvailabilityBlock(
            room_id=lt1.id,
            starts_on=date(2026, 10, 2),
            ends_on=date(2026, 10, 2),
            start_period="16-18",
            end_period="16-18",
            reason="Monthly inspection",
            kind="unavailable",
            recurring=True,
        )
    )
    session.commit()
