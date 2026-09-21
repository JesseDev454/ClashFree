import type { TimetableSlot } from '../api/timetables'
import { PERIODS, WEEKDAY_FULL, type Period, type Weekday } from './schedule'
import type { TimetableEntry } from '../types/timetable'

const GRID_PERIOD: Record<string, string> = {
  '08-10': '08:00-10:00',
  '10-12': '10:00-12:00',
  '12-14': '12:00-14:00',
  '14-16': '14:00-16:00',
  '16-18': '16:00-18:00',
}

const COLORS: Array<NonNullable<TimetableEntry['color']>> = [
  'blue',
  'green',
  'purple',
  'amber',
  'rose',
]

function occupiedPeriods(slot: TimetableSlot): string[] {
  const start = PERIODS.indexOf(slot.start_period as Period)
  const end = PERIODS.indexOf(slot.end_period as Period)
  if (start < 0) {
    return [slot.start_period]
  }
  const finish = end < start ? start : end
  return PERIODS.slice(start, finish + 1)
}

export function slotsToEntries(slots: TimetableSlot[]): TimetableEntry[] {
  const colorFor = new Map<string, NonNullable<TimetableEntry['color']>>()
  return slots.flatMap((slot) => {
    const code = slot.course_code ?? `assignment-${slot.assignment_id}`
    if (!colorFor.has(code)) {
      colorFor.set(code, COLORS[colorFor.size % COLORS.length])
    }
    const day = WEEKDAY_FULL[slot.weekday as Weekday] ?? slot.weekday
    return occupiedPeriods(slot).map((period) => ({
      id: `${slot.id}-${period}`,
      courseCode: code,
      courseTitle: slot.course_title ?? '',
      day,
      period: GRID_PERIOD[period] ?? period,
      room: slot.room_code ?? '',
      lecturer: slot.lecturer_name ?? '',
      cohort: slot.cohort_code ?? '',
      color: colorFor.get(code),
    }))
  })
}
