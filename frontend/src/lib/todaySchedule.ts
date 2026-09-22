import type { TimetableSlot } from '../api/timetables'
import { WEEKDAYS, type Weekday } from './schedule'

const WEEKDAY_FROM_INDEX: Record<number, Weekday | undefined> = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
}

function weekdayFor(isoDate: string): Weekday | null {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }
  const date = new Date(year, month - 1, day)
  return WEEKDAY_FROM_INDEX[date.getDay()] ?? null
}

export function slotsForDate(slots: TimetableSlot[], isoDate: string): TimetableSlot[] {
  const weekday = weekdayFor(isoDate)
  if (!weekday || !WEEKDAYS.includes(weekday)) {
    return []
  }
  return slots
    .filter((slot) => slot.weekday === weekday)
    .sort((left, right) => left.start_period.localeCompare(right.start_period))
}
