import type {
  GridDay,
  GridEvent,
  GridEventState,
  GridTarget,
} from '../components/timetable/types'
import { roomById } from './data'
import {
  cohortLabels,
  courseOf,
  departmentOf,
  enrollment,
  formatRange,
  lecturerName,
  roomName,
  type SlotVerdict,
} from './engine'
import {
  DAY_KEYS,
  DAY_NAMES,
  DAY_SHORT,
  type ClassSession,
  type Conflict,
  type DayKey,
} from './types'

export function gridDays(schedule: ClassSession[], only?: DayKey[]): GridDay[] {
  return (only ?? [...DAY_KEYS]).map((day) => {
    const count = schedule.filter((session) => session.day === day).length
    return {
      key: day,
      label: DAY_NAMES[day],
      short: DAY_SHORT[day],
      note: `${count} ${count === 1 ? 'class' : 'classes'}`,
    }
  })
}

export function conflictIndex(conflicts: Conflict[]) {
  const map = new Map<string, Conflict[]>()
  for (const conflict of conflicts) {
    for (const id of conflict.sessionIds) {
      map.set(id, [...(map.get(id) ?? []), conflict])
    }
  }
  return map
}

export function sessionToEvent(
  session: ClassSession,
  options: {
    conflicts?: Map<string, Conflict[]>
    state?: GridEventState
    badge?: string
    idSuffix?: string
  } = {},
): GridEvent {
  const course = courseOf(session)
  const room = roomById.get(session.roomId)
  const sessionConflicts = options.conflicts?.get(session.id) ?? []
  return {
    id: `${session.id}${options.idSuffix ?? ''}`,
    day: session.day,
    start: session.start,
    duration: session.duration,
    title: session.courseCode,
    subtitle: course?.title,
    meta: `${roomName(session.roomId)} · ${cohortLabels(session).join(', ')}`,
    hue: departmentOf(session).hue,
    conflict: sessionConflicts.length > 0,
    conflictText: sessionConflicts.map((conflict) => conflict.title).join('; '),
    state: options.state,
    badge: options.badge,
    details: [
      {
        label: 'Time',
        value: `${DAY_NAMES[session.day]} ${formatRange(session.start, session.duration)}`,
      },
      {
        label: 'Room',
        value: room
          ? `${room.name} · ${enrollment(session)}/${room.capacity} seats`
          : session.roomId,
      },
      { label: 'Lecturer', value: lecturerName(session) },
      { label: 'Students', value: cohortLabels(session).join(', ') },
      { label: 'Type', value: session.kind },
    ],
  }
}

export function verdictsToTargets(verdicts: SlotVerdict[]): GridTarget[] {
  return verdicts.map((verdict) => ({
    day: verdict.day,
    start: verdict.start,
    status: verdict.status,
    message:
      verdict.status === 'current'
        ? 'Current time'
        : verdict.status === 'valid'
          ? 'Available — all hard constraints satisfied'
          : verdict.status === 'room-change'
            ? `Available in ${roomName(verdict.roomId)} — ${verdict.reasons[0]?.message ?? ''}`
            : (verdict.reasons[0]?.message ?? 'Not available'),
  }))
}
