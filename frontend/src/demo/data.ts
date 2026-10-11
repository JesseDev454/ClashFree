import type {
  ClassSession,
  Cohort,
  Course,
  Department,
  DepartmentId,
  Lecturer,
  Room,
  RoomClosure,
} from './types'

/*
 * ClashFree demonstration dataset.
 *
 * Everything here is sample data for the design lab. It is internally
 * consistent (sizes fit rooms, lecturers are free when they teach) except
 * for one deliberate room double-booking in Room A08 on Tuesday afternoon,
 * so the conflict tooling has something real to find. Results computed from
 * this data run in the browser and are labelled as demo output.
 */

const h = (hour: number) => hour * 60

export const DEMO_SESSION_LABEL = '2026/2027 · First Semester'
export const DEMO_WEEK_LABEL = 'Week 6 · 12–16 Oct 2026'

export const departments: Record<DepartmentId, Department> = {
  SEN: { id: 'SEN', name: 'Software Engineering', hue: 'blue' },
  CSC: { id: 'CSC', name: 'Computer Science', hue: 'sky' },
  INS: { id: 'INS', name: 'Information Systems', hue: 'indigo' },
  GST: { id: 'GST', name: 'General Studies', hue: 'slate' },
}

export const rooms: Room[] = [
  {
    id: 'A12',
    name: 'Room A12',
    building: 'Block A',
    capacity: 120,
    type: 'Lecture theatre',
    equipment: ['projector', 'audio'],
  },
  {
    id: 'A08',
    name: 'Room A08',
    building: 'Block A',
    capacity: 60,
    type: 'Lecture room',
    equipment: ['projector'],
  },
  {
    id: 'B12',
    name: 'Room B12',
    building: 'Block B',
    capacity: 90,
    type: 'Lecture room',
    equipment: ['projector', 'smartboard'],
  },
  {
    id: 'B04',
    name: 'Room B04',
    building: 'Block B',
    capacity: 40,
    type: 'Seminar room',
    equipment: ['smartboard'],
  },
  {
    id: 'C05',
    name: 'Lab C05',
    building: 'Block C',
    capacity: 45,
    type: 'Computer lab',
    equipment: ['workstations', 'projector'],
  },
  {
    id: 'C11',
    name: 'Lab C11',
    building: 'Block C',
    capacity: 50,
    type: 'Computer lab',
    equipment: ['workstations'],
  },
  {
    id: 'LT1',
    name: 'Main Auditorium LT1',
    building: 'Senate Building',
    capacity: 250,
    type: 'Lecture theatre',
    equipment: ['projector', 'audio'],
  },
]

export const lecturers: Lecturer[] = [
  {
    id: 'bello',
    name: 'Dr. Amina Bello',
    department: 'SEN',
    unavailable: [],
    preferred: { start: h(8), end: h(13), label: 'prefers to teach before 1 pm' },
  },
  {
    id: 'eze',
    name: 'Mrs. Ngozi Eze',
    department: 'SEN',
    unavailable: [
      { day: 'mon', start: h(8), end: h(18), reason: 'part-time — teaches Tue & Thu' },
      { day: 'wed', start: h(8), end: h(18), reason: 'part-time — teaches Tue & Thu' },
      { day: 'fri', start: h(8), end: h(18), reason: 'part-time — teaches Tue & Thu' },
    ],
  },
  { id: 'bakare', name: 'Dr. Tunde Bakare', department: 'SEN', unavailable: [] },
  {
    id: 'okafor',
    name: 'Prof. Daniel Okafor',
    department: 'CSC',
    unavailable: [{ day: 'wed', start: h(14), end: h(18), reason: 'Senate meetings' }],
  },
  {
    id: 'musa',
    name: 'Dr. Ibrahim Musa',
    department: 'CSC',
    unavailable: [{ day: 'fri', start: h(14), end: h(18), reason: 'research afternoon' }],
  },
  { id: 'sule', name: 'Dr. Fatima Sule', department: 'CSC', unavailable: [] },
  {
    id: 'adeyemi',
    name: 'Dr. Grace Adeyemi',
    department: 'INS',
    unavailable: [{ day: 'thu', start: h(14), end: h(18), reason: 'external examining' }],
  },
  { id: 'obi', name: 'Mr. Kelechi Obi', department: 'GST', unavailable: [] },
]

export const cohorts: Cohort[] = [
  { id: 'SEN-400', label: 'SEN 400L', department: 'SEN', level: 400, size: 78 },
  { id: 'SEN-300', label: 'SEN 300L', department: 'SEN', level: 300, size: 85 },
  {
    id: 'CSC-400A',
    label: 'CSC 400L · A',
    department: 'CSC',
    level: 400,
    section: 'A',
    size: 64,
  },
  {
    id: 'CSC-400B',
    label: 'CSC 400L · B',
    department: 'CSC',
    level: 400,
    section: 'B',
    size: 44,
  },
  { id: 'CSC-300', label: 'CSC 300L', department: 'CSC', level: 300, size: 96 },
  { id: 'INS-400', label: 'INS 400L', department: 'INS', level: 400, size: 48 },
]

export const courses: Course[] = [
  {
    code: 'SEN 401',
    title: 'Software Architecture',
    department: 'SEN',
    requires: ['projector'],
  },
  {
    code: 'SEN 403',
    title: 'Software Project Management',
    department: 'SEN',
    requires: ['projector'],
  },
  {
    code: 'SEN 405',
    title: 'Human–Computer Interaction',
    department: 'SEN',
    requires: ['projector'],
  },
  {
    code: 'SEN 301',
    title: 'Software Testing',
    department: 'SEN',
    requires: ['projector'],
  },
  {
    code: 'SEN 303',
    title: 'Requirements Engineering',
    department: 'SEN',
    requires: ['projector'],
  },
  {
    code: 'CSC 401',
    title: 'Artificial Intelligence',
    department: 'CSC',
    requires: ['projector'],
  },
  {
    code: 'CSC 403',
    title: 'Compiler Construction',
    department: 'CSC',
    requires: ['projector'],
  },
  {
    code: 'CSC 405',
    title: 'Distributed Systems Lab',
    department: 'CSC',
    requires: ['workstations'],
  },
  {
    code: 'CSC 301',
    title: 'Operating Systems',
    department: 'CSC',
    requires: ['projector'],
  },
  {
    code: 'CSC 305',
    title: 'Database Systems',
    department: 'CSC',
    requires: ['projector'],
  },
  {
    code: 'CSC 307',
    title: 'Computer Networks',
    department: 'CSC',
    requires: ['projector'],
  },
  {
    code: 'INS 401',
    title: 'Enterprise Systems',
    department: 'INS',
    requires: ['projector'],
  },
  {
    code: 'INS 403',
    title: 'Data Warehousing Lab',
    department: 'INS',
    requires: ['workstations'],
  },
  {
    code: 'INS 405',
    title: 'IS Audit & Governance',
    department: 'INS',
    requires: ['projector'],
  },
  { code: 'GST 401', title: 'Entrepreneurship', department: 'GST', requires: ['audio'] },
]

type Row = [
  id: string,
  courseCode: string,
  kind: ClassSession['kind'],
  lecturerId: string,
  cohortIds: string[],
  roomId: string,
  day: ClassSession['day'],
  startHour: number,
  hours: number,
]

const rows: Row[] = [
  ['s01', 'SEN 401', 'Lecture', 'bello', ['SEN-400'], 'A12', 'mon', 8, 2],
  ['s02', 'CSC 301', 'Lecture', 'okafor', ['CSC-300'], 'A12', 'mon', 10, 2],
  ['s03', 'INS 401', 'Lecture', 'adeyemi', ['INS-400'], 'B12', 'mon', 10, 2],
  ['s04', 'CSC 401', 'Lecture', 'musa', ['CSC-400A'], 'B12', 'mon', 14, 2],
  ['s05', 'CSC 305', 'Lecture', 'sule', ['CSC-300'], 'A12', 'mon', 14, 1],
  ['s06', 'INS 403', 'Lab', 'adeyemi', ['INS-400'], 'C11', 'mon', 14, 2],
  ['s07', 'CSC 403', 'Lecture', 'okafor', ['CSC-400A', 'CSC-400B'], 'A12', 'tue', 8, 2],
  ['s08', 'SEN 403', 'Lecture', 'eze', ['SEN-400'], 'B12', 'tue', 10, 2],
  ['s09', 'SEN 303', 'Lecture', 'eze', ['SEN-300'], 'A12', 'tue', 12, 2],
  ['s10', 'CSC 401', 'Lecture', 'musa', ['CSC-400B'], 'A08', 'tue', 14, 2],
  ['s11', 'INS 405', 'Lecture', 'bakare', ['INS-400'], 'A08', 'tue', 14, 2],
  ['s12', 'CSC 405', 'Lab', 'sule', ['CSC-400B'], 'C05', 'tue', 10, 2],
  ['s13', 'SEN 405', 'Lecture', 'bakare', ['SEN-400'], 'B12', 'wed', 10, 2],
  ['s14', 'SEN 301', 'Lecture', 'bello', ['SEN-300'], 'B12', 'wed', 8, 2],
  ['s15', 'CSC 403', 'Seminar', 'okafor', ['CSC-400A', 'CSC-400B'], 'LT1', 'wed', 10, 1],
  [
    's16',
    'GST 401',
    'Lecture',
    'obi',
    ['SEN-400', 'CSC-400A', 'CSC-400B', 'INS-400'],
    'LT1',
    'wed',
    14,
    2,
  ],
  ['s17', 'CSC 305', 'Lecture', 'sule', ['CSC-300'], 'A12', 'thu', 8, 2],
  ['s18', 'SEN 401', 'Seminar', 'bello', ['SEN-400'], 'B12', 'thu', 10, 1],
  ['s19', 'SEN 403', 'Seminar', 'eze', ['SEN-400'], 'B12', 'thu', 14, 1],
  ['s20', 'SEN 303', 'Seminar', 'eze', ['SEN-300'], 'A12', 'thu', 12, 1],
  ['s21', 'CSC 401', 'Seminar', 'musa', ['CSC-400A'], 'A12', 'thu', 10, 1],
  ['s22', 'INS 405', 'Seminar', 'bakare', ['INS-400'], 'A08', 'thu', 12, 1],
  ['s23', 'INS 401', 'Seminar', 'adeyemi', ['INS-400'], 'B12', 'fri', 8, 1],
  ['s24', 'CSC 307', 'Lecture', 'musa', ['CSC-300'], 'A12', 'fri', 10, 2],
  ['s25', 'CSC 405', 'Lab', 'sule', ['CSC-400B'], 'C05', 'fri', 12, 2],
  ['s26', 'CSC 301', 'Seminar', 'okafor', ['CSC-300'], 'A12', 'fri', 14, 1],
  ['s27', 'INS 403', 'Lab', 'adeyemi', ['INS-400'], 'C11', 'fri', 10, 2],
]

export const initialSessions: ClassSession[] = rows.map(
  ([id, courseCode, kind, lecturerId, cohortIds, roomId, day, startHour, hours]) => ({
    id,
    courseCode,
    kind,
    lecturerId,
    cohortIds,
    roomId,
    day,
    start: h(startHour),
    duration: h(hours),
  }),
)

/** The maintenance report used by the room-disruption demonstration. */
export const b12MaintenanceClosure: Omit<RoomClosure, 'reportedAt'> = {
  id: 'closure-b12',
  roomId: 'B12',
  days: ['wed', 'thu', 'fri'],
  start: h(8),
  end: h(18),
  reason: 'Ceiling leak — electrical safety inspection',
  reportedBy: 'Facilities Manager',
  status: 'open',
}

const byId = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item]))

export const roomById = byId(rooms)
export const lecturerById = byId(lecturers)
export const cohortById = byId(cohorts)
export const courseByCode = new Map(courses.map((course) => [course.code, course]))
