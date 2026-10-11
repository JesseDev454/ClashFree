import type { TimetableConflict, TimetableSlot } from '../api/timetables'
import type { GridDay, GridEvent } from '../components/timetable/types'
import type { EventHue } from '../demo/types'
import { WEEKDAY_FULL, WEEKDAY_LABELS, WEEKDAYS, type Weekday } from './schedule'

const HUES: EventHue[] = ['blue', 'sky', 'indigo', 'teal', 'slate']

function periodStart(period: string) {
  return Number(period.slice(0, 2)) * 60
}

function periodEnd(period: string) {
  return Number(period.slice(3, 5)) * 60
}

/** Maps API timetable slots onto the shared week grid. Hue follows the department. */
export function slotsToGridEvents(
  slots: TimetableSlot[],
  conflicts: TimetableConflict[] = [],
): GridEvent[] {
  const hueByDepartment = new Map<string, EventHue>()
  const conflicted = new Map<number, string[]>()
  for (const conflict of conflicts) {
    for (const id of conflict.assignment_ids) {
      conflicted.set(id, [...(conflicted.get(id) ?? []), conflict.title])
    }
  }
  return slots.map((slot) => {
    const key = String(slot.department_id ?? slot.department_name ?? 'other')
    if (!hueByDepartment.has(key)) {
      hueByDepartment.set(key, HUES[hueByDepartment.size % HUES.length])
    }
    const start = periodStart(slot.start_period)
    const end = Math.max(periodEnd(slot.end_period), start + 60)
    const titles = conflicted.get(slot.assignment_id) ?? []
    const day = WEEKDAY_FULL[slot.weekday as Weekday] ?? slot.weekday
    return {
      id: String(slot.id),
      day: slot.weekday,
      start,
      duration: end - start,
      title: slot.course_code ?? `Assignment ${slot.assignment_id}`,
      subtitle: slot.course_title ?? undefined,
      meta: [slot.room_code, slot.cohort_code].filter(Boolean).join(' · '),
      hue: hueByDepartment.get(key) ?? 'blue',
      conflict: titles.length > 0,
      conflictText: titles.join('; '),
      details: [
        { label: 'Day', value: day },
        { label: 'Room', value: slot.room_code ?? '—' },
        { label: 'Lecturer', value: slot.lecturer_name ?? '—' },
        { label: 'Cohort', value: slot.cohort_code ?? '—' },
      ],
    }
  })
}

export function weekdayGridDays(slots: { weekday: string }[]): GridDay[] {
  return WEEKDAYS.map((day) => {
    const count = slots.filter((slot) => slot.weekday === day).length
    return {
      key: day,
      label: WEEKDAY_FULL[day],
      short: WEEKDAY_LABELS[day],
      note: `${count} ${count === 1 ? 'class' : 'classes'}`,
    }
  })
}
