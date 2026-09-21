from __future__ import annotations

import re
from dataclasses import dataclass, field

from ortools.sat.python import cp_model

from app.core.schedule import PERIODS, WEEKDAYS

CONTACT_RE = re.compile(r"(\d+)\s*[x×]\s*(\d+)\s*h", re.IGNORECASE)
LABELS = ("A", "B", "C")
MORNING_PERIODS = {"08-10", "10-12"}
FRIDAY_AFTERNOON = {("fri", "14-16"), ("fri", "16-18")}


@dataclass
class MeetingDemand:
    assignment_id: int
    meeting_index: int
    span: int
    lecturer_id: int
    cohort_id: int
    expected_size: int
    room_type: str
    course_code: str
    cohort_code: str
    lecturer_name: str


@dataclass
class RoomOption:
    id: int
    code: str
    building: str
    room_type: str
    capacity: int
    forbidden: set[tuple[str, str]]


@dataclass
class LecturerOption:
    id: int
    name: str
    forbidden: set[tuple[str, str]]
    preferred: set[tuple[str, str]]
    prefer_morning: bool = False
    avoid_friday_afternoon: bool = False


@dataclass
class SoftFlags:
    idle_gaps: bool = True
    lecturer_preferences: bool = True
    daily_balance: bool = True
    building_movement: bool = True
    room_utilization: bool = True
    preserve_published: bool = False


@dataclass
class Weights:
    student_idle_gaps: int = 7
    lecturer_preferences: int = 5
    daily_balance: int = 4
    building_movement: int = 3
    room_utilization: int = 6
    schedule_stability: int = 9


@dataclass
class SolverSnapshot:
    meetings: list[MeetingDemand]
    rooms: list[RoomOption]
    lecturers: dict[int, LecturerOption]
    incomplete: list[str]
    weights: Weights
    flags: SoftFlags
    time_limit_seconds: int = 30
    alternative_count: int = 1
    random_seed: int | None = None
    published: dict[tuple[int, int], tuple[str, str, int]] = field(default_factory=dict)


@dataclass
class Placement:
    assignment_id: int
    meeting_index: int
    weekday: str
    start_period: str
    end_period: str
    room_id: int
    room_code: str = ""
    building: str = ""


@dataclass
class ConflictDraft:
    kind: str
    severity: str
    title: str
    detail: str
    weekday: str | None = None
    period: str | None = None
    assignment_ids: list[int] = field(default_factory=list)


@dataclass
class SolverSolution:
    placements: list[Placement]
    objective: int
    hard_violations: int
    soft_penalty: int
    room_utilization_percent: int
    student_gap_hours: float
    conflicts: list[ConflictDraft]


@dataclass
class SolverResult:
    status: str
    message: str
    solve_time_ms: int
    solutions: list[SolverSolution]


def parse_contact_pattern(value: str) -> tuple[int, int]:
    match = CONTACT_RE.search(value or "")
    if match is None:
        return 1, 1
    count = max(1, int(match.group(1)))
    hours = max(1, int(match.group(2)))
    span = 2 if hours > 2 else 1
    return count, span


def occupied_periods(start_index: int, span: int) -> list[int]:
    return list(range(start_index, start_index + span))


def score_placements(
    snapshot: SolverSnapshot,
    placements: list[Placement],
) -> SolverSolution:
    rooms = {room.id: room for room in snapshot.rooms}
    meetings = {(item.assignment_id, item.meeting_index): item for item in snapshot.meetings}
    occupancy: dict[tuple[str, str, str], list[Placement]] = {}
    lecturer_busy: dict[tuple[int, str, str], list[Placement]] = {}
    cohort_busy: dict[tuple[int, str, str], list[Placement]] = {}
    conflicts: list[ConflictDraft] = []
    hard = 0
    soft = 0

    for placement in placements:
        meeting = meetings[(placement.assignment_id, placement.meeting_index)]
        room = rooms[placement.room_id]
        start = PERIODS.index(placement.start_period)
        end = PERIODS.index(placement.end_period)
        for period in PERIODS[start : end + 1]:
            occupancy.setdefault((placement.room_id, placement.weekday, period), []).append(
                placement
            )
            lecturer_busy.setdefault(
                (meeting.lecturer_id, placement.weekday, period),
                [],
            ).append(placement)
            cohort_busy.setdefault(
                (meeting.cohort_id, placement.weekday, period),
                [],
            ).append(placement)
            if (placement.weekday, period) in room.forbidden:
                hard += 1
                conflicts.append(
                    ConflictDraft(
                        kind="availability",
                        severity="high",
                        title="Room unavailable",
                        detail=f"{room.code} cannot be used {placement.weekday} {period}.",
                        weekday=placement.weekday,
                        period=period,
                        assignment_ids=[meeting.assignment_id],
                    )
                )
            lecturer = snapshot.lecturers[meeting.lecturer_id]
            if (placement.weekday, period) in lecturer.forbidden:
                hard += 1
                conflicts.append(
                    ConflictDraft(
                        kind="availability",
                        severity="high",
                        title="Lecturer unavailable",
                        detail=(f"{lecturer.name} is unavailable {placement.weekday} {period}."),
                        weekday=placement.weekday,
                        period=period,
                        assignment_ids=[meeting.assignment_id],
                    )
                )
        if room.room_type != meeting.room_type:
            hard += 1
            conflicts.append(
                ConflictDraft(
                    kind="capacity",
                    severity="high",
                    title="Room type mismatch",
                    detail=f"{meeting.course_code} needs {meeting.room_type}, got {room.code}.",
                    assignment_ids=[meeting.assignment_id],
                )
            )
        if room.capacity < meeting.expected_size:
            hard += 1
            conflicts.append(
                ConflictDraft(
                    kind="capacity",
                    severity="high",
                    title="Capacity shortfall",
                    detail=(
                        f"{room.code} holds {room.capacity}, {meeting.course_code} expects "
                        f"{meeting.expected_size}."
                    ),
                    assignment_ids=[meeting.assignment_id],
                )
            )

    def clash(kind: str, groups: dict) -> None:
        nonlocal hard
        for key, group in groups.items():
            if len(group) < 2:
                continue
            hard += len(group) - 1
            weekday, period = key[-2], key[-1]
            ids = sorted({item.assignment_id for item in group})
            conflicts.append(
                ConflictDraft(
                    kind=kind,
                    severity="high",
                    title=f"{kind.capitalize()} clash",
                    detail=f"{len(group)} classes share {weekday} {period}.",
                    weekday=weekday,
                    period=period,
                    assignment_ids=ids,
                )
            )

    clash("room", occupancy)
    clash("lecturer", lecturer_busy)
    clash("cohort", cohort_busy)

    waste = 0
    demand = 0
    preference_hits = 0
    preserve_hits = 0
    for placement in placements:
        meeting = meetings[(placement.assignment_id, placement.meeting_index)]
        room = rooms[placement.room_id]
        lecturer = snapshot.lecturers[meeting.lecturer_id]
        demand += meeting.expected_size
        waste += max(0, room.capacity - meeting.expected_size)
        slot = (placement.weekday, placement.start_period)
        if snapshot.flags.lecturer_preferences:
            if slot not in lecturer.preferred and slot not in lecturer.forbidden:
                preference_hits += 1
                soft += snapshot.weights.lecturer_preferences
            if lecturer.prefer_morning and placement.start_period not in MORNING_PERIODS:
                preference_hits += 1
                soft += snapshot.weights.lecturer_preferences
            if lecturer.avoid_friday_afternoon and slot in FRIDAY_AFTERNOON:
                preference_hits += 1
                soft += snapshot.weights.lecturer_preferences * 2
        if snapshot.flags.room_utilization:
            soft += (
                snapshot.weights.room_utilization
                * max(
                    0,
                    room.capacity - meeting.expected_size,
                )
                // 20
            )
        if snapshot.flags.preserve_published:
            published = snapshot.published.get((placement.assignment_id, placement.meeting_index))
            if published is not None and published != (
                placement.weekday,
                placement.start_period,
                placement.room_id,
            ):
                preserve_hits += 1
                soft += snapshot.weights.schedule_stability

    if preference_hits and snapshot.flags.lecturer_preferences:
        conflicts.append(
            ConflictDraft(
                kind="preference",
                severity="soft",
                title="Lecturer preferences",
                detail=f"{preference_hits} placements sit outside preferred windows.",
                assignment_ids=[],
            )
        )

    if preserve_hits and snapshot.flags.preserve_published:
        conflicts.append(
            ConflictDraft(
                kind="stability",
                severity="soft",
                title="Published assignment moved",
                detail=f"{preserve_hits} meetings left their published slot.",
                assignment_ids=[],
            )
        )

    cohort_days: dict[int, dict[str, set[int]]] = {}
    cohort_buildings: dict[tuple[int, str], list[tuple[int, str]]] = {}
    for placement in placements:
        meeting = meetings[(placement.assignment_id, placement.meeting_index)]
        start = PERIODS.index(placement.start_period)
        end = PERIODS.index(placement.end_period)
        day_map = cohort_days.setdefault(meeting.cohort_id, {})
        used = day_map.setdefault(placement.weekday, set())
        for index in range(start, end + 1):
            used.add(index)
        cohort_buildings.setdefault((meeting.cohort_id, placement.weekday), []).append(
            (start, rooms[placement.room_id].building)
        )

    gap_hours = 0.0
    if snapshot.flags.idle_gaps:
        for _cohort_id, days in cohort_days.items():
            for weekday, used in days.items():
                if not used:
                    continue
                low, high = min(used), max(used)
                holes = [index for index in range(low, high + 1) if index not in used]
                gap_hours += 2.0 * len(holes)
                if holes:
                    conflicts.append(
                        ConflictDraft(
                            kind="idle_gap",
                            severity="soft",
                            title="Student idle gap",
                            detail=f"Cohort has {len(holes)} idle period(s) on {weekday}.",
                            weekday=weekday,
                            assignment_ids=[],
                        )
                    )
                    soft += snapshot.weights.student_idle_gaps * len(holes)
                if snapshot.flags.daily_balance and len(used) > 2:
                    conflicts.append(
                        ConflictDraft(
                            kind="balance",
                            severity="soft",
                            title="Daily imbalance",
                            detail=f"Cohort has {len(used)} periods on {weekday}.",
                            weekday=weekday,
                            assignment_ids=[],
                        )
                    )
                    soft += snapshot.weights.daily_balance * (len(used) - 2)

    if snapshot.flags.building_movement:
        for (_cohort_id, weekday), items in cohort_buildings.items():
            ordered = sorted(items, key=lambda item: item[0])
            moves = sum(
                1 for left, right in zip(ordered, ordered[1:], strict=False) if left[1] != right[1]
            )
            if moves:
                conflicts.append(
                    ConflictDraft(
                        kind="movement",
                        severity="soft",
                        title="Building movement",
                        detail=f"{moves} building change(s) on {weekday}.",
                        weekday=weekday,
                        assignment_ids=[],
                    )
                )
                soft += snapshot.weights.building_movement * moves

    if snapshot.flags.room_utilization and waste:
        conflicts.append(
            ConflictDraft(
                kind="utilization",
                severity="soft",
                title="Room-fit inefficiency",
                detail=f"{waste} unused seats across placed classes.",
                assignment_ids=[],
            )
        )

    for title in snapshot.incomplete:
        conflicts.append(
            ConflictDraft(
                kind="incomplete",
                severity="medium",
                title="Incomplete assignment",
                detail=f"{title} has no lecturer and was not scheduled.",
                assignment_ids=[],
            )
        )

    utilization = 0
    if demand:
        utilization = max(0, min(100, round(100 * demand / (demand + waste))))

    return SolverSolution(
        placements=placements,
        objective=hard * 10_000 + soft,
        hard_violations=hard,
        soft_penalty=soft,
        room_utilization_percent=utilization,
        student_gap_hours=round(gap_hours, 1),
        conflicts=conflicts,
    )


def solve_snapshot(snapshot: SolverSnapshot) -> SolverResult:
    if not snapshot.meetings:
        return SolverResult(
            status="infeasible",
            message="No ready course assignments to schedule.",
            solve_time_ms=0,
            solutions=[],
        )

    rooms_by_type: dict[str, list[RoomOption]] = {}
    for room in snapshot.rooms:
        rooms_by_type.setdefault(room.room_type, []).append(room)

    for meeting in snapshot.meetings:
        if not rooms_by_type.get(meeting.room_type):
            return SolverResult(
                status="infeasible",
                message=f"No usable {meeting.room_type} room for {meeting.course_code}.",
                solve_time_ms=0,
                solutions=[],
            )

    wanted = max(1, min(3, snapshot.alternative_count))
    seeds: list[int] = []
    base = snapshot.random_seed if snapshot.random_seed is not None else 1
    for offset in range(wanted * 3):
        candidate = base + offset * 17
        if candidate not in seeds:
            seeds.append(candidate)
        if len(seeds) >= wanted:
            break

    collected: list[SolverSolution] = []
    seen: set[tuple] = set()
    total_ms = 0
    last_status = "infeasible"
    last_message = "No feasible timetable was found."

    for seed in seeds:
        result, elapsed = _solve_once(snapshot, seed)
        total_ms += elapsed
        last_status = result[0]
        last_message = result[1]
        solution = result[2]
        if solution is None:
            continue
        signature = tuple(
            sorted(
                (
                    item.assignment_id,
                    item.meeting_index,
                    item.weekday,
                    item.start_period,
                    item.room_id,
                )
                for item in solution.placements
            )
        )
        if signature in seen:
            continue
        seen.add(signature)
        collected.append(solution)
        if len(collected) >= wanted:
            break

    collected.sort(key=lambda item: (item.hard_violations, item.objective))
    if collected:
        return SolverResult(
            status="feasible",
            message="Feasible timetable generated.",
            solve_time_ms=total_ms,
            solutions=collected,
        )
    return SolverResult(
        status=last_status if last_status in {"infeasible", "failed"} else "infeasible",
        message=last_message,
        solve_time_ms=total_ms,
        solutions=[],
    )


def _solve_once(
    snapshot: SolverSnapshot,
    seed: int,
) -> tuple[tuple[str, str, SolverSolution | None], int]:
    model = cp_model.CpModel()
    meetings = snapshot.meetings
    rooms = snapshot.rooms
    choices: dict[tuple[int, int], list[tuple[int, int, int, cp_model.IntVar]]] = {}
    # meeting key -> list of (weekday_idx, start_idx, room_id, var)

    for meeting in meetings:
        options: list[tuple[int, int, int, cp_model.IntVar]] = []
        eligible = [
            room
            for room in rooms
            if room.room_type == meeting.room_type and room.capacity >= meeting.expected_size
        ]
        lecturer = snapshot.lecturers[meeting.lecturer_id]
        max_start = len(PERIODS) - meeting.span
        for day_idx, weekday in enumerate(WEEKDAYS):
            for start_idx in range(max_start + 1):
                occupied = occupied_periods(start_idx, meeting.span)
                forbidden = False
                for period_idx in occupied:
                    period = PERIODS[period_idx]
                    if (weekday, period) in lecturer.forbidden:
                        forbidden = True
                        break
                if forbidden:
                    continue
                for room in eligible:
                    blocked = False
                    for period_idx in occupied:
                        period = PERIODS[period_idx]
                        if (weekday, period) in room.forbidden:
                            blocked = True
                            break
                    if blocked:
                        continue
                    var = model.NewBoolVar(
                        f"m{meeting.assignment_id}_{meeting.meeting_index}_"
                        f"{weekday}_{PERIODS[start_idx]}_r{room.id}"
                    )
                    options.append((day_idx, start_idx, room.id, var))
        if not options:
            return (
                (
                    "infeasible",
                    f"No legal slot remains for {meeting.course_code}.",
                    None,
                ),
                0,
            )
        model.AddExactlyOne(option[3] for option in options)
        choices[(meeting.assignment_id, meeting.meeting_index)] = options

    def add_resource_limit(owner_attr: str) -> None:
        owners: dict[int, list[MeetingDemand]] = {}
        for meeting in meetings:
            owners.setdefault(getattr(meeting, owner_attr), []).append(meeting)
        for _owner_id, owned in owners.items():
            for day_idx, _weekday in enumerate(WEEKDAYS):
                for period_idx, _period in enumerate(PERIODS):
                    occupying: list[cp_model.IntVar] = []
                    for meeting in owned:
                        for d_idx, start_idx, _room_id, var in choices[
                            (meeting.assignment_id, meeting.meeting_index)
                        ]:
                            if d_idx != day_idx:
                                continue
                            if period_idx in occupied_periods(start_idx, meeting.span):
                                occupying.append(var)
                    if occupying:
                        model.Add(sum(occupying) <= 1)

    add_resource_limit("lecturer_id")
    add_resource_limit("cohort_id")

    for room in rooms:
        for day_idx, _weekday in enumerate(WEEKDAYS):
            for period_idx, _period in enumerate(PERIODS):
                occupying: list[cp_model.IntVar] = []
                for meeting in meetings:
                    for d_idx, start_idx, room_id, var in choices[
                        (meeting.assignment_id, meeting.meeting_index)
                    ]:
                        if d_idx != day_idx or room_id != room.id:
                            continue
                        if period_idx in occupied_periods(start_idx, meeting.span):
                            occupying.append(var)
                if occupying:
                    model.Add(sum(occupying) <= 1)

    penalties: list[tuple[cp_model.IntVar, int]] = []
    room_lookup = {room.id: room for room in rooms}

    for meeting in meetings:
        lecturer = snapshot.lecturers[meeting.lecturer_id]
        for day_idx, start_idx, room_id, var in choices[
            (meeting.assignment_id, meeting.meeting_index)
        ]:
            weekday = WEEKDAYS[day_idx]
            period = PERIODS[start_idx]
            room = room_lookup[room_id]
            cost = 0
            if snapshot.flags.lecturer_preferences:
                if (weekday, period) not in lecturer.preferred:
                    cost += snapshot.weights.lecturer_preferences
                if lecturer.prefer_morning and period not in MORNING_PERIODS:
                    cost += snapshot.weights.lecturer_preferences
                if lecturer.avoid_friday_afternoon and (weekday, period) in FRIDAY_AFTERNOON:
                    cost += snapshot.weights.lecturer_preferences * 2
            if snapshot.flags.room_utilization:
                waste = max(0, room.capacity - meeting.expected_size)
                cost += snapshot.weights.room_utilization * waste // 20
            if snapshot.flags.preserve_published:
                published = snapshot.published.get((meeting.assignment_id, meeting.meeting_index))
                if published is not None and published != (weekday, period, room_id):
                    cost += snapshot.weights.schedule_stability
            if cost:
                penalties.append((var, cost))

    if snapshot.flags.idle_gaps or snapshot.flags.daily_balance:
        cohorts: dict[int, list[MeetingDemand]] = {}
        for meeting in meetings:
            cohorts.setdefault(meeting.cohort_id, []).append(meeting)
        for cohort_id, owned in cohorts.items():
            for day_idx, weekday in enumerate(WEEKDAYS):
                has_period: list[cp_model.IntVar] = []
                for period_idx, period in enumerate(PERIODS):
                    occupying = []
                    for meeting in owned:
                        for d_idx, start_idx, _room_id, var in choices[
                            (meeting.assignment_id, meeting.meeting_index)
                        ]:
                            if d_idx == day_idx and period_idx in occupied_periods(
                                start_idx,
                                meeting.span,
                            ):
                                occupying.append(var)
                    flag = model.NewBoolVar(f"c{cohort_id}_{weekday}_{period}")
                    if occupying:
                        model.AddMaxEquality(flag, occupying)
                    else:
                        model.Add(flag == 0)
                    has_period.append(flag)
                if snapshot.flags.idle_gaps:
                    for index in range(1, 4):
                        hole = model.NewBoolVar(f"gap_c{cohort_id}_{weekday}_{index}")
                        before = model.NewBoolVar(f"before_c{cohort_id}_{weekday}_{index}")
                        after = model.NewBoolVar(f"after_c{cohort_id}_{weekday}_{index}")
                        model.AddMaxEquality(before, has_period[:index])
                        model.AddMaxEquality(after, has_period[index + 1 :])
                        model.AddBoolAnd([before, after, has_period[index].Not()]).OnlyEnforceIf(
                            hole
                        )
                        model.AddBoolOr([before.Not(), after.Not(), has_period[index], hole.Not()])
                        penalties.append((hole, snapshot.weights.student_idle_gaps))
                if snapshot.flags.daily_balance:
                    load = model.NewIntVar(0, len(PERIODS), f"load_c{cohort_id}_{weekday}")
                    model.Add(load == sum(has_period))
                    extra = model.NewIntVar(0, len(PERIODS), f"extra_c{cohort_id}_{weekday}")
                    model.Add(extra >= load - 2)
                    model.Add(extra >= 0)
                    scaled = model.NewIntVar(0, 500, f"bal_c{cohort_id}_{weekday}")
                    model.Add(scaled == extra * snapshot.weights.daily_balance)
                    penalties.append((scaled, 1))

    if penalties:
        model.Minimize(sum(var * weight for var, weight in penalties))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(snapshot.time_limit_seconds)
    solver.parameters.random_seed = seed
    solver.parameters.num_search_workers = 1
    status = solver.Solve(model)
    elapsed = int(solver.WallTime() * 1000)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        if status == cp_model.INFEASIBLE:
            return (("infeasible", "The solver found no feasible timetable.", None), elapsed)
        return (("failed", "The solver stopped before finding a solution.", None), elapsed)

    room_lookup = {room.id: room for room in rooms}
    placements: list[Placement] = []
    for meeting in meetings:
        for day_idx, start_idx, room_id, var in choices[
            (meeting.assignment_id, meeting.meeting_index)
        ]:
            if solver.Value(var) != 1:
                continue
            end_idx = start_idx + meeting.span - 1
            room = room_lookup[room_id]
            placements.append(
                Placement(
                    assignment_id=meeting.assignment_id,
                    meeting_index=meeting.meeting_index,
                    weekday=WEEKDAYS[day_idx],
                    start_period=PERIODS[start_idx],
                    end_period=PERIODS[end_idx],
                    room_id=room_id,
                    room_code=room.code,
                    building=room.building,
                )
            )
            break

    scored = score_placements(snapshot, placements)
    scored.objective = int(solver.ObjectiveValue()) if penalties else scored.soft_penalty
    return (("feasible", "Feasible timetable generated.", scored), elapsed)
