export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
}

export const WEEKDAY_FULL: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
}

export const PERIODS = ['08-10', '10-12', '12-14', '14-16', '16-18'] as const
export type Period = (typeof PERIODS)[number]

export const PERIOD_LABELS: Record<Period, string> = {
  '08-10': '08:00–10:00',
  '10-12': '10:00–12:00',
  '12-14': '12:00–14:00',
  '14-16': '14:00–16:00',
  '16-18': '16:00–18:00',
}

export const LECTURER_SLOT_STATES = ['available', 'preferred', 'unavailable'] as const
export type LecturerSlotState = (typeof LECTURER_SLOT_STATES)[number]

export const ROOM_SLOT_STATES = ['available', 'reserved', 'unavailable'] as const
export type RoomSlotState = (typeof ROOM_SLOT_STATES)[number]

export const SLOT_COUNT = WEEKDAYS.length * PERIODS.length

export type GridSlot = {
  weekday: string
  period: string
  state: string
}

export function cycleLecturerState(state: string): LecturerSlotState {
  const index = LECTURER_SLOT_STATES.indexOf(state as LecturerSlotState)
  const current = index < 0 ? 0 : index
  return LECTURER_SLOT_STATES[(current + 1) % LECTURER_SLOT_STATES.length]
}

export function cycleRoomState(state: string): RoomSlotState {
  const index = ROOM_SLOT_STATES.indexOf(state as RoomSlotState)
  const current = index < 0 ? 0 : index
  return ROOM_SLOT_STATES[(current + 1) % ROOM_SLOT_STATES.length]
}

export function allSlots(state = 'available'): GridSlot[] {
  return WEEKDAYS.flatMap((weekday) =>
    PERIODS.map((period) => ({ weekday, period, state })),
  )
}

export function slotLookup(slots: GridSlot[]): Map<string, string> {
  return new Map(slots.map((slot) => [`${slot.weekday}:${slot.period}`, slot.state]))
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay()
  const offset = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + offset)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function rangesOverlap(
  startsOn: string,
  endsOn: string,
  weekStart: string,
  weekEnd: string,
): boolean {
  return startsOn <= weekEnd && endsOn >= weekStart
}

export function formatShortDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatPeriodWindow(
  startPeriod: string | null,
  endPeriod: string | null,
): string {
  if (!startPeriod) {
    return 'All day'
  }
  if (!endPeriod || endPeriod === startPeriod) {
    return PERIOD_LABELS[startPeriod as Period] ?? startPeriod
  }
  const start = (PERIOD_LABELS[startPeriod as Period] ?? startPeriod).split('–')[0]
  const end = (PERIOD_LABELS[endPeriod as Period] ?? endPeriod).split('–')[1] ?? endPeriod
  return `${start}–${end}`
}
