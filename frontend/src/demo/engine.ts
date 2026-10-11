import {
  cohortById,
  courseByCode,
  departments,
  lecturerById,
  roomById,
  rooms,
} from './data'
import {
  DAY_END,
  DAY_KEYS,
  DAY_NAMES,
  DAY_START,
  type ClassSession,
  type Conflict,
  type DayKey,
  type Placement,
  type Room,
  type RoomClosure,
  type Violation,
  type ViolationKind,
} from './types'

/*
 * A small, deterministic constraint checker for the design-lab dataset.
 * It is real computation — every verdict, option and count shown in the demo
 * screens comes from here — but it is not the CP-SAT solver the production
 * API uses, and the UI says so.
 */

const EQUIPMENT_LABEL = {
  projector: 'a projector',
  workstations: 'computer workstations',
  smartboard: 'a smartboard',
  audio: 'a sound system',
} as const

export function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function formatRange(start: number, duration: number) {
  return `${formatTime(start)}–${formatTime(start + duration)}`
}

export function formatPlacement(placement: Placement, duration: number) {
  return `${DAY_NAMES[placement.day].slice(0, 3)} ${formatRange(placement.start, duration)} · ${roomName(placement.roomId)}`
}

export function roomName(roomId: string) {
  return roomById.get(roomId)?.name ?? roomId
}

export function courseOf(session: ClassSession) {
  return courseByCode.get(session.courseCode)
}

export function departmentOf(session: ClassSession) {
  const course = courseOf(session)
  return course ? departments[course.department] : departments.GST
}

export function lecturerName(session: ClassSession) {
  return lecturerById.get(session.lecturerId)?.name ?? session.lecturerId
}

export function cohortLabels(session: ClassSession) {
  return session.cohortIds.map((id) => cohortById.get(id)?.label ?? id)
}

export function enrollment(session: ClassSession) {
  return session.cohortIds.reduce((sum, id) => sum + (cohortById.get(id)?.size ?? 0), 0)
}

export function sessionTitle(session: ClassSession) {
  return `${session.courseCode} ${courseOf(session)?.title ?? ''}`.trim()
}

function overlapsTime(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

function sessionsOverlap(
  a: { day: DayKey; start: number; duration: number },
  b: { day: DayKey; start: number; duration: number },
) {
  return (
    a.day === b.day &&
    overlapsTime(a.start, a.start + a.duration, b.start, b.start + b.duration)
  )
}

export function closureCovers(
  closure: RoomClosure,
  day: DayKey,
  start: number,
  end: number,
) {
  return (
    closure.days.includes(day) && overlapsTime(start, end, closure.start, closure.end)
  )
}

/** Every hard-constraint problem with placing `session` at `placement`. */
export function checkPlacement(
  session: ClassSession,
  placement: Placement,
  schedule: ClassSession[],
  closures: RoomClosure[] = [],
): Violation[] {
  const violations: Violation[] = []
  const end = placement.start + session.duration
  const candidate = { ...session, ...placement }
  const room = roomById.get(placement.roomId)
  const lecturer = lecturerById.get(session.lecturerId)
  const course = courseOf(session)
  const size = enrollment(session)
  const dayName = DAY_NAMES[placement.day]

  if (placement.start < DAY_START || end > DAY_END) {
    violations.push({
      kind: 'hours',
      message: `Classes must run between ${formatTime(DAY_START)} and ${formatTime(DAY_END)}.`,
    })
  }

  // A closure blocks the room whatever the state of its repair.
  for (const closure of closures) {
    if (
      closure.roomId === placement.roomId &&
      closureCovers(closure, placement.day, placement.start, end)
    ) {
      violations.push({
        kind: 'closure',
        message: `${roomName(placement.roomId)} is closed on ${dayName} (${closure.reason.toLowerCase()}).`,
      })
    }
  }

  if (room && size > room.capacity) {
    violations.push({
      kind: 'capacity',
      message: `${room.name} seats ${room.capacity}; ${session.courseCode} expects ${size} students.`,
    })
  }

  if (room && course) {
    const missing = course.requires.filter((item) => !room.equipment.includes(item))
    if (missing.length > 0) {
      violations.push({
        kind: 'equipment',
        message: `${session.courseCode} needs ${missing.map((item) => EQUIPMENT_LABEL[item]).join(' and ')}, which ${room.name} doesn't have.`,
      })
    }
  }

  if (lecturer) {
    const blocked = lecturer.unavailable.find(
      (window) =>
        window.day === placement.day &&
        overlapsTime(placement.start, end, window.start, window.end),
    )
    if (blocked) {
      violations.push({
        kind: 'availability',
        message: `${lecturer.name} is unavailable on ${dayName} ${formatRange(blocked.start, blocked.end - blocked.start)} (${blocked.reason}).`,
      })
    }
  }

  for (const other of schedule) {
    if (other.id === session.id || !sessionsOverlap(candidate, other)) {
      continue
    }
    const when = formatRange(other.start, other.duration)
    if (other.roomId === placement.roomId) {
      violations.push({
        kind: 'room',
        message: `${roomName(placement.roomId)} is already booked for ${other.courseCode} (${when}).`,
        otherSessionId: other.id,
      })
    }
    if (other.lecturerId === session.lecturerId) {
      violations.push({
        kind: 'lecturer',
        message: `${lecturer?.name ?? 'The lecturer'} is teaching ${other.courseCode} at this time (${when}).`,
        otherSessionId: other.id,
      })
    }
    const sharedCohort = session.cohortIds.find((id) => other.cohortIds.includes(id))
    if (sharedCohort) {
      violations.push({
        kind: 'cohort',
        message: `${cohortById.get(sharedCohort)?.label ?? sharedCohort} already has ${other.courseCode} at this time (${when}).`,
        otherSessionId: other.id,
      })
    }
  }

  return violations
}

const CONFLICT_TITLE: Record<
  ViolationKind,
  (session: ClassSession, other?: ClassSession) => string
> = {
  room: (session) => `${roomName(session.roomId)} double-booked`,
  lecturer: (session) => `${lecturerName(session)} double-booked`,
  cohort: (session, other) => {
    const shared = session.cohortIds.find((id) => other?.cohortIds.includes(id))
    return `${cohortById.get(shared ?? '')?.label ?? 'Student group'} timetable clash`
  },
  capacity: (session) =>
    `${roomName(session.roomId)} too small for ${session.courseCode}`,
  availability: (session) => `${lecturerName(session)} unavailable`,
  equipment: (session) =>
    `${roomName(session.roomId)} lacks equipment for ${session.courseCode}`,
  closure: (session) => `${session.courseCode} is in a closed room`,
  hours: (session) => `${session.courseCode} is outside teaching hours`,
}

/** All hard-constraint conflicts in a schedule, de-duplicated per pair. */
export function detectConflicts(
  schedule: ClassSession[],
  closures: RoomClosure[] = [],
): Conflict[] {
  const conflicts = new Map<string, Conflict>()
  const byId = new Map(schedule.map((session) => [session.id, session]))
  for (const session of schedule) {
    for (const violation of checkPlacement(session, session, schedule, closures)) {
      const other = violation.otherSessionId
        ? byId.get(violation.otherSessionId)
        : undefined
      const ids = other ? [session.id, other.id].sort() : [session.id]
      const key = `${violation.kind}:${ids.join('+')}`
      if (conflicts.has(key)) {
        continue
      }
      const first = other && other.id < session.id ? other : session
      const second = first === session ? other : session
      conflicts.set(key, {
        id: key,
        kind: violation.kind,
        title: CONFLICT_TITLE[violation.kind](first, second),
        detail: second ? pairDetail(violation.kind, first, second) : violation.message,
        sessionIds: ids,
        day: session.day,
        start: Math.min(first.start, second?.start ?? first.start),
      })
    }
  }
  return [...conflicts.values()].sort(
    (a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day) || a.start - b.start,
  )
}

function pairDetail(kind: ViolationKind, first: ClassSession, second: ClassSession) {
  const start = Math.max(first.start, second.start)
  const end = Math.min(first.start + first.duration, second.start + second.duration)
  const when = `${DAY_NAMES[first.day]} ${formatRange(start, end - start)}`
  if (kind === 'lecturer') {
    return `${lecturerName(first)} is scheduled to teach ${first.courseCode} and ${second.courseCode} at the same time on ${when}.`
  }
  if (kind === 'cohort') {
    const shared = first.cohortIds.find((id) => second.cohortIds.includes(id)) ?? ''
    return `${cohortById.get(shared)?.label ?? 'A student group'} is expected at ${first.courseCode} and ${second.courseCode} at the same time on ${when}.`
  }
  return `${first.courseCode} and ${second.courseCode} are both booked in ${roomName(first.roomId)} on ${when}.`
}
const ROOM_KINDS: ViolationKind[] = ['room', 'closure', 'capacity', 'equipment']

/** Free rooms that satisfy every constraint, best fit first. */
export function availableRooms(
  session: ClassSession,
  day: DayKey,
  start: number,
  schedule: ClassSession[],
  closures: RoomClosure[] = [],
): Room[] {
  const currentBuilding = roomById.get(session.roomId)?.building
  return rooms
    .filter(
      (room) =>
        checkPlacement(session, { day, start, roomId: room.id }, schedule, closures)
          .length === 0,
    )
    .sort(
      (a, b) =>
        a.capacity - b.capacity ||
        Number(b.building === currentBuilding) - Number(a.building === currentBuilding),
    )
}

export type SlotVerdict = {
  day: DayKey
  start: number
  status: 'current' | 'valid' | 'room-change' | 'invalid'
  roomId: string
  reasons: Violation[]
}

/** Verdict for every start time a session could be dragged to. */
export function slotVerdicts(
  session: ClassSession,
  schedule: ClassSession[],
  closures: RoomClosure[] = [],
): SlotVerdict[] {
  const verdicts: SlotVerdict[] = []
  for (const day of DAY_KEYS) {
    for (let start = DAY_START; start + session.duration <= DAY_END; start += 60) {
      if (day === session.day && start === session.start) {
        verdicts.push({
          day,
          start,
          status: 'current',
          roomId: session.roomId,
          reasons: [],
        })
        continue
      }
      const reasons = checkPlacement(
        session,
        { day, start, roomId: session.roomId },
        schedule,
        closures,
      )
      if (reasons.length === 0) {
        verdicts.push({ day, start, status: 'valid', roomId: session.roomId, reasons })
        continue
      }
      const onlyRoom = reasons.every((reason) => ROOM_KINDS.includes(reason.kind))
      const alternative = onlyRoom
        ? availableRooms(session, day, start, schedule, closures)[0]
        : undefined
      verdicts.push(
        alternative
          ? { day, start, status: 'room-change', roomId: alternative.id, reasons }
          : { day, start, status: 'invalid', roomId: session.roomId, reasons },
      )
    }
  }
  return verdicts
}

export function moveSession(
  schedule: ClassSession[],
  sessionId: string,
  placement: Placement,
): ClassSession[] {
  return schedule.map((session) =>
    session.id === sessionId ? { ...session, ...placement } : session,
  )
}

export type ScheduleChange = {
  sessionId: string
  from: Placement
  to: Placement
  change: 'room' | 'time' | 'room-and-time'
}

export function diffSchedules(
  before: ClassSession[],
  after: ClassSession[],
): ScheduleChange[] {
  const previous = new Map(before.map((session) => [session.id, session]))
  const changes: ScheduleChange[] = []
  for (const session of after) {
    const old = previous.get(session.id)
    if (!old) {
      continue
    }
    const timeChanged = old.day !== session.day || old.start !== session.start
    const roomChanged = old.roomId !== session.roomId
    if (!timeChanged && !roomChanged) {
      continue
    }
    changes.push({
      sessionId: session.id,
      from: { day: old.day, start: old.start, roomId: old.roomId },
      to: { day: session.day, start: session.start, roomId: session.roomId },
      change:
        timeChanged && roomChanged ? 'room-and-time' : timeChanged ? 'time' : 'room',
    })
  }
  return changes
}

export function affectedByClosure(schedule: ClassSession[], closure: RoomClosure) {
  return schedule.filter(
    (session) =>
      session.roomId === closure.roomId &&
      closure.days.includes(session.day) &&
      overlapsTime(
        session.start,
        session.start + session.duration,
        closure.start,
        closure.end,
      ),
  )
}

/** Idle minutes between a group's first and last class on a day. */
export function cohortGapMinutes(
  schedule: ClassSession[],
  cohortId: string,
  day: DayKey,
) {
  const classes = schedule
    .filter((session) => session.day === day && session.cohortIds.includes(cohortId))
    .sort((a, b) => a.start - b.start)
  let gap = 0
  for (let index = 1; index < classes.length; index += 1) {
    const previousEnd = classes[index - 1].start + classes[index - 1].duration
    gap += Math.max(0, classes[index].start - previousEnd)
  }
  return gap
}

function totalGapMinutes(schedule: ClassSession[], cohortIds: string[], days: DayKey[]) {
  let total = 0
  for (const cohortId of cohortIds) {
    for (const day of days) {
      total += cohortGapMinutes(schedule, cohortId, day)
    }
  }
  return total
}

function breaksPreference(session: ClassSession, placement: Placement) {
  const preferred = lecturerById.get(session.lecturerId)?.preferred
  if (!preferred) {
    return false
  }
  return (
    placement.start < preferred.start ||
    placement.start + session.duration > preferred.end
  )
}

export type ConstraintCheck = {
  kind: ViolationKind
  label: string
  passed: boolean
  detail: string
}

const HARD_CHECKS: Array<{ kinds: ViolationKind[]; label: string; ok: string }> = [
  {
    kinds: ['room'],
    label: 'No room double-booking',
    ok: 'Every moved class has its room to itself.',
  },
  {
    kinds: ['lecturer'],
    label: 'No lecturer double-booking',
    ok: 'No lecturer is in two places at once.',
  },
  {
    kinds: ['cohort'],
    label: 'No student-group overlaps',
    ok: 'No student group has two classes at once.',
  },
  {
    kinds: ['capacity'],
    label: 'Sufficient room capacity',
    ok: 'Every new room seats the full class.',
  },
  {
    kinds: ['availability'],
    label: 'Lecturer availability',
    ok: 'All moves respect lecturers’ unavailable times.',
  },
  {
    kinds: ['equipment'],
    label: 'Required room equipment',
    ok: 'Projectors, labs and audio needs are met.',
  },
  {
    kinds: ['closure', 'hours'],
    label: 'Avoids the closed room',
    ok: 'Nothing is left in a closed room or outside teaching hours.',
  },
]

export function checkChanges(
  schedule: ClassSession[],
  sessionIds: string[],
  closures: RoomClosure[],
): ConstraintCheck[] {
  const violations = sessionIds.flatMap((id) => {
    const session = schedule.find((item) => item.id === id)
    return session ? checkPlacement(session, session, schedule, closures) : []
  })
  return HARD_CHECKS.map((check) => {
    const failing = violations.filter((violation) => check.kinds.includes(violation.kind))
    return {
      kind: check.kinds[0],
      label: check.label,
      passed: failing.length === 0,
      detail: failing.length === 0 ? check.ok : failing[0].message,
    }
  })
}

export type RepairMove = ScheduleChange & { note?: string }

export type RepairOption = {
  id: string
  title: string
  summary: string
  moves: RepairMove[]
  unresolvedIds: string[]
  schedule: ClassSession[]
  checks: ConstraintCheck[]
  hardViolations: number
  metrics: {
    classesMoved: number
    timeChanges: number
    roomChanges: number
    buildingChanges: number
    studentsAffected: number
    lecturersAffected: number
    seatFitPercent: number
    gapMinutesAdded: number
    preferenceBreaks: number
  }
  softNotes: string[]
  score: number
  recommended: boolean
}

type Strategy = {
  id: string
  title: string
  summary: string
  candidates: (session: ClassSession) => Placement[]
  cost: (session: ClassSession, placement: Placement, working: ClassSession[]) => number
}

function seatWasteCost(session: ClassSession, placement: Placement) {
  const capacity = roomById.get(placement.roomId)?.capacity ?? 1
  return (capacity - enrollment(session)) / capacity
}

function anywhereCandidates(session: ClassSession): Placement[] {
  const placements: Placement[] = []
  for (const day of DAY_KEYS) {
    for (let start = DAY_START; start + session.duration <= DAY_END; start += 60) {
      for (const room of rooms) {
        placements.push({ day, start, roomId: room.id })
      }
    }
  }
  return placements
}

function distanceCost(session: ClassSession, placement: Placement) {
  const dayGap = Math.abs(DAY_KEYS.indexOf(placement.day) - DAY_KEYS.indexOf(session.day))
  const timeGap = Math.abs(placement.start - session.start) / 60
  const roomChange = placement.roomId === session.roomId ? 0 : 1
  return dayGap * 10 + timeGap + roomChange * 4 + seatWasteCost(session, placement)
}

function buildStrategies(closure: RoomClosure): Strategy[] {
  const closedRoom = roomById.get(closure.roomId)
  const largest = [...rooms]
    .filter((room) => room.id !== closure.roomId)
    .sort((a, b) => b.capacity - a.capacity)[0]
  return [
    {
      id: 'same-time',
      title: 'Same times, new rooms',
      summary:
        'Every class keeps its day and time. Affected classes move to the best-fitting free room.',
      candidates: (session) =>
        rooms.map((room) => ({
          day: session.day,
          start: session.start,
          roomId: room.id,
        })),
      cost: (session, placement) => {
        const sameBuilding =
          roomById.get(placement.roomId)?.building ===
          roomById.get(session.roomId)?.building
        return seatWasteCost(session, placement) + (sameBuilding ? 0 : 0.15)
      },
    },
    {
      id: 'keep-room',
      title: `Keep ${closedRoom?.name ?? 'the room'}, change the day`,
      summary: `Classes stay in their usual room and move to the nearest day it is open. Students see new times.`,
      candidates: (session) =>
        anywhereCandidates(session).filter(
          (placement) => placement.roomId === closure.roomId,
        ),
      cost: (session, placement, working) => {
        const trial = moveSession(working, session.id, placement)
        const gaps =
          totalGapMinutes(trial, session.cohortIds, [placement.day]) -
          totalGapMinutes(working, session.cohortIds, [placement.day])
        return (
          distanceCost(session, placement) +
          Math.max(0, gaps) / 30 +
          (breaksPreference(session, placement) ? 3 : 0)
        )
      },
    },
    {
      id: 'consolidate',
      title: `Consolidate in ${largest.name}`,
      summary: `Affected classes keep their times and share ${largest.name} wherever it is free — one venue to sign-post.`,
      candidates: (session) => [
        { day: session.day, start: session.start, roomId: largest.id },
      ],
      cost: () => 0,
    },
  ]
}

function runStrategy(
  strategy: Strategy,
  schedule: ClassSession[],
  closures: RoomClosure[],
  affected: ClassSession[],
): Omit<RepairOption, 'recommended'> {
  let working = schedule
  const unresolvedIds: string[] = []
  const notes = new Map<string, string>()
  const ordered = [...affected].sort((a, b) => enrollment(b) - enrollment(a))

  for (const session of ordered) {
    const current = working.find((item) => item.id === session.id) ?? session
    const pick = (placements: Placement[], cost: (placement: Placement) => number) =>
      placements
        .filter(
          (placement) =>
            checkPlacement(current, placement, working, closures).length === 0,
        )
        .map((placement) => ({ placement, cost: cost(placement) }))
        .sort((a, b) => a.cost - b.cost)[0]?.placement

    let chosen = pick(strategy.candidates(current), (placement) =>
      strategy.cost(current, placement, working),
    )
    if (!chosen) {
      // Nothing fits the strategy: take the least disruptive valid slot anywhere.
      const preferred = strategy.candidates(current)[0]
      const blocker = preferred
        ? checkPlacement(current, preferred, working, closures)[0]?.message
        : undefined
      chosen = pick(anywhereCandidates(current), (placement) =>
        distanceCost(current, placement),
      )
      if (chosen && blocker) {
        notes.set(
          session.id,
          `${session.courseCode} could not follow this plan: ${blocker}`,
        )
      }
    }
    if (!chosen) {
      unresolvedIds.push(session.id)
      continue
    }
    working = moveSession(working, session.id, chosen)
  }

  const moves: RepairMove[] = diffSchedules(schedule, working).map((change) => ({
    ...change,
    note: notes.get(change.sessionId),
  }))
  const movedSessions = moves
    .map((move) => working.find((session) => session.id === move.sessionId))
    .filter((session): session is ClassSession => Boolean(session))

  const checks = checkChanges(
    working,
    [...moves.map((move) => move.sessionId), ...unresolvedIds],
    closures,
  )
  const hardViolations = checks.filter((check) => !check.passed).length

  const touchedDays = [
    ...new Set(moves.flatMap((move) => [move.from.day, move.to.day])),
  ] as DayKey[]
  const touchedCohorts = [
    ...new Set(movedSessions.flatMap((session) => session.cohortIds)),
  ]
  const gapMinutesAdded = Math.max(
    0,
    totalGapMinutes(working, touchedCohorts, touchedDays) -
      totalGapMinutes(schedule, touchedCohorts, touchedDays),
  )
  const preferenceBreaks = movedSessions.filter((session) =>
    breaksPreference(session, session),
  )
  const timeChanges = moves.filter((move) => move.change !== 'room').length
  const roomChanges = moves.filter((move) => move.change !== 'time').length
  const buildingChanges = moves.filter(
    (move) =>
      roomById.get(move.from.roomId)?.building !== roomById.get(move.to.roomId)?.building,
  ).length
  const seatFitPercent = movedSessions.length
    ? Math.round(
        (movedSessions.reduce(
          (sum, session) =>
            sum + enrollment(session) / (roomById.get(session.roomId)?.capacity ?? 1),
          0,
        ) /
          movedSessions.length) *
          100,
      )
    : 100

  const softNotes: string[] = []
  if (timeChanges > 0) {
    softNotes.push(
      `${timeChanges} ${timeChanges === 1 ? 'class changes' : 'classes change'} day or time — students must adjust their week.`,
    )
  }
  if (gapMinutesAdded > 0) {
    softNotes.push(
      `Adds ${gapMinutesAdded / 60} h of idle gaps for affected student groups.`,
    )
  }
  for (const session of preferenceBreaks) {
    const lecturer = lecturerById.get(session.lecturerId)
    softNotes.push(
      `${lecturer?.name} ${lecturer?.preferred?.label}; ${session.courseCode} now runs ${formatRange(session.start, session.duration)}.`,
    )
  }
  if (seatFitPercent < 50) {
    softNotes.push(
      `Rooms are under-used: classes fill ${seatFitPercent}% of seats on average.`,
    )
  }
  if (buildingChanges > 0 && timeChanges === 0) {
    softNotes.push(
      `${buildingChanges} ${buildingChanges === 1 ? 'class moves' : 'classes move'} to a different building.`,
    )
  }
  for (const note of notes.values()) {
    softNotes.push(note)
  }

  const score =
    unresolvedIds.length * 1000 +
    hardViolations * 500 +
    timeChanges * 30 +
    roomChanges * 10 +
    buildingChanges * 4 +
    (gapMinutesAdded / 60) * 10 +
    preferenceBreaks.length * 15 +
    (100 - seatFitPercent) * 0.6

  return {
    id: strategy.id,
    title: strategy.title,
    summary: strategy.summary,
    moves,
    unresolvedIds,
    schedule: working,
    checks,
    hardViolations,
    metrics: {
      classesMoved: moves.length,
      timeChanges,
      roomChanges,
      buildingChanges,
      studentsAffected: movedSessions.reduce(
        (sum, session) => sum + enrollment(session),
        0,
      ),
      lecturersAffected: new Set(movedSessions.map((session) => session.lecturerId)).size,
      seatFitPercent,
      gapMinutesAdded,
      preferenceBreaks: preferenceBreaks.length,
    },
    softNotes,
    score: Math.round(score),
  }
}

/** Feasible repair alternatives for one closure, best first. */
export function planRepairOptions(
  schedule: ClassSession[],
  closures: RoomClosure[],
  closure: RoomClosure,
): RepairOption[] {
  const affected = affectedByClosure(schedule, closure)
  if (affected.length === 0) {
    return []
  }
  const seen = new Set<string>()
  const options = buildStrategies(closure)
    .map((strategy) => runStrategy(strategy, schedule, closures, affected))
    .filter((option) => {
      const signature = option.moves
        .map(
          (move) => `${move.sessionId}@${move.to.day}${move.to.start}${move.to.roomId}`,
        )
        .join('|')
      if (seen.has(signature)) {
        return false
      }
      seen.add(signature)
      return true
    })
    .sort((a, b) => a.score - b.score)
  return options.map((option, index) => ({
    ...option,
    recommended: index === 0 && option.hardViolations === 0,
  }))
}

export type MoveProposal = {
  session: ClassSession
  from: Placement
  to: Placement
  change: ScheduleChange['change']
  checks: ConstraintCheck[]
  notes: string[]
}

/** Before/after summary, hard checks and soft side-effects of one manual move. */
export function proposeMove(
  schedule: ClassSession[],
  closures: RoomClosure[],
  sessionId: string,
  to: Placement,
): MoveProposal | null {
  const session = schedule.find((item) => item.id === sessionId)
  if (!session) {
    return null
  }
  const trial = moveSession(schedule, sessionId, to)
  const moved = { ...session, ...to }
  const timeChanged = session.day !== to.day || session.start !== to.start
  const roomChanged = session.roomId !== to.roomId
  const notes: string[] = []
  const days = [...new Set([session.day, to.day])]
  for (const cohortId of session.cohortIds) {
    const delta =
      days.reduce((sum, day) => sum + cohortGapMinutes(trial, cohortId, day), 0) -
      days.reduce((sum, day) => sum + cohortGapMinutes(schedule, cohortId, day), 0)
    const label = cohortById.get(cohortId)?.label ?? cohortId
    if (delta > 0) {
      notes.push(`${label} gains ${delta / 60} h of idle time between classes.`)
    } else if (delta < 0) {
      notes.push(`${label} loses ${-delta / 60} h of idle time between classes.`)
    }
  }
  if (breaksPreference(session, to)) {
    const lecturer = lecturerById.get(session.lecturerId)
    notes.push(`${lecturer?.name} ${lecturer?.preferred?.label}.`)
  }
  const room = roomById.get(to.roomId)
  if (roomChanged && room) {
    notes.push(
      `${room.name} (${room.building}) fills ${Math.round((enrollment(session) / room.capacity) * 100)}% of its ${room.capacity} seats.`,
    )
  }
  if (timeChanged) {
    notes.push(
      `${enrollment(session)} students and ${lecturerName(session)} will see a new time once published.`,
    )
  }
  return {
    session,
    from: { day: session.day, start: session.start, roomId: session.roomId },
    to,
    change: timeChanged && roomChanged ? 'room-and-time' : timeChanged ? 'time' : 'room',
    checks: checkChanges(trial, [moved.id], closures),
    notes,
  }
}
