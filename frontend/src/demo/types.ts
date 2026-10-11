export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
export type DayKey = (typeof DAY_KEYS)[number]

export const DAY_NAMES: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
}

export const DAY_SHORT: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
}

/** Teaching day in minutes since midnight. */
export const DAY_START = 8 * 60
export const DAY_END = 18 * 60

export type EventHue = 'blue' | 'sky' | 'indigo' | 'teal' | 'slate'

export type DepartmentId = 'SEN' | 'CSC' | 'INS' | 'GST'

export type Department = {
  id: DepartmentId
  name: string
  hue: EventHue
}

export type Equipment = 'projector' | 'workstations' | 'smartboard' | 'audio'

export type RoomType =
  'Lecture theatre' | 'Lecture room' | 'Computer lab' | 'Seminar room'

export type Room = {
  id: string
  name: string
  building: string
  capacity: number
  type: RoomType
  equipment: Equipment[]
}

export type TimeWindow = {
  day: DayKey
  start: number
  end: number
  reason: string
}

export type Lecturer = {
  id: string
  name: string
  department: DepartmentId
  unavailable: TimeWindow[]
  /** Soft preference: teaching inside this window each day. */
  preferred?: { start: number; end: number; label: string }
}

export type Cohort = {
  id: string
  label: string
  department: DepartmentId
  level: number
  section?: string
  size: number
}

export type Course = {
  code: string
  title: string
  department: DepartmentId
  requires: Equipment[]
}

export type ClassSession = {
  id: string
  courseCode: string
  kind: 'Lecture' | 'Lab' | 'Seminar'
  lecturerId: string
  cohortIds: string[]
  roomId: string
  day: DayKey
  start: number
  duration: number
}

export type Placement = Pick<ClassSession, 'day' | 'start' | 'roomId'>

export type RoomClosure = {
  id: string
  roomId: string
  days: DayKey[]
  start: number
  end: number
  reason: string
  reportedBy: string
  reportedAt: string
  status: 'open' | 'repair-approved' | 'repaired'
  /** Classes booked in the room when the closure was reported. */
  affectedCount?: number
}

export type ViolationKind =
  | 'room'
  | 'lecturer'
  | 'cohort'
  | 'capacity'
  | 'availability'
  | 'equipment'
  | 'closure'
  | 'hours'

export type Violation = {
  kind: ViolationKind
  message: string
  otherSessionId?: string
}

export type Conflict = {
  id: string
  kind: ViolationKind
  title: string
  detail: string
  sessionIds: string[]
  day: DayKey
  start: number
}
