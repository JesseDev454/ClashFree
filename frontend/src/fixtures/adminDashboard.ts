import type { StatusVariant } from '../types/status'
import type { TimetableEntry } from '../types/timetable'

export type DashboardMetric = {
  id: string
  label: string
  value: string
  hint: string
  tint: 'blue' | 'green' | 'purple' | 'lavender' | 'amber' | 'rose'
}

export type DisruptionRow = {
  id: string
  type: string
  details: string
  affected: string
  reportedBy: string
  status: string
  statusVariant: StatusVariant
}

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: 'courses',
    label: 'Total Courses',
    value: '327',
    hint: 'Across all departments',
    tint: 'blue',
  },
  {
    id: 'lecturers',
    label: 'Lecturers',
    value: '94',
    hint: 'Active this semester',
    tint: 'green',
  },
  {
    id: 'cohorts',
    label: 'Student Cohorts',
    value: '28',
    hint: 'Programmes & levels',
    tint: 'purple',
  },
  {
    id: 'rooms',
    label: 'Rooms',
    value: '38',
    hint: '24 halls · 14 labs',
    tint: 'lavender',
  },
  {
    id: 'conflicts',
    label: 'Unresolved Conflicts',
    value: '4',
    hint: 'Require attention',
    tint: 'amber',
  },
  {
    id: 'disruptions',
    label: 'Active Disruptions',
    value: '2',
    hint: '1 room · 1 lecturer',
    tint: 'rose',
  },
]

export const classesPerDay = [
  { day: 'Mon', classes: 54 },
  { day: 'Tue', classes: 62 },
  { day: 'Wed', classes: 58 },
  { day: 'Thu', classes: 52 },
  { day: 'Fri', classes: 44 },
  { day: 'Sat', classes: 28 },
]

export const lecturerWorkload = [
  { name: 'Optimal', value: 72, color: '#0f9f6e' },
  { name: 'Underutilized', value: 16, color: '#1575e5' },
  { name: 'Overloaded', value: 6, color: '#e11d48' },
]

export const disruptionRows: DisruptionRow[] = [
  {
    id: 'd1',
    type: 'Room',
    details: 'LT2 unavailable — electrical fault',
    affected: '4 classes',
    reportedBy: 'Facilities Manager',
    status: 'Open',
    statusVariant: 'danger',
  },
  {
    id: 'd2',
    type: 'Lecturer',
    details: 'Dr. A. Yusuf unavailable',
    affected: '3 classes',
    reportedBy: 'Lecturer',
    status: 'In review',
    statusVariant: 'warning',
  },
  {
    id: 'd3',
    type: 'Room',
    details: 'Lab 1 scheduled maintenance',
    affected: '6 classes',
    reportedBy: 'Facilities Manager',
    status: 'Scheduled',
    statusVariant: 'info',
  },
]

export const timetableStatusItems = [
  {
    id: 'prep',
    title: 'Data preparation complete',
    detail: 'Courses, cohorts, lecturers and rooms validated.',
  },
  {
    id: 'generated',
    title: 'Timetable generated',
    detail: 'Version 2.1 · 0 hard conflicts.',
  },
  {
    id: 'published',
    title: 'Published',
    detail: 'Current active version · 14 Sep 2026.',
  },
]

export const sessionChip = {
  label: '2026/2027 · First Semester',
  state: 'Active',
}

export const galleryCourses = [
  {
    id: 'c1',
    code: 'SWE 401',
    title: 'Software Architecture',
    department: 'Software Engineering',
  },
  {
    id: 'c2',
    code: 'CSC 312',
    title: 'Operating Systems',
    department: 'Computer Science',
  },
  {
    id: 'c3',
    code: 'EEE 301',
    title: 'Circuit Theory',
    department: 'Electrical Engineering',
  },
  {
    id: 'c4',
    code: 'SWE 403',
    title: 'Human-Computer Interaction',
    department: 'Software Engineering',
  },
]

export const galleryTimetableEntries: TimetableEntry[] = [
  {
    id: 't1',
    courseCode: 'SWE 401',
    courseTitle: 'Software Architecture',
    day: 'Monday',
    period: '08:00-10:00',
    room: 'LT1',
    lecturer: 'Dr. Bello',
    cohort: '400L SWE',
    color: 'blue',
  },
  {
    id: 't2',
    courseCode: 'CSC 312',
    courseTitle: 'Operating Systems',
    day: 'Tuesday',
    period: '10:00-12:00',
    room: 'LT3',
    lecturer: 'Dr. Musa',
    cohort: '300L CSC',
    color: 'purple',
  },
  {
    id: 't3',
    courseCode: 'MTH 201',
    courseTitle: 'Linear Algebra',
    day: 'Wednesday',
    period: '12:00-14:00',
    room: 'AUD 1',
    lecturer: 'Dr. Okon',
    cohort: '200L MTH',
    color: 'green',
  },
  {
    id: 't4',
    courseCode: 'SWE 401',
    courseTitle: 'Software Architecture (overlap)',
    day: 'Monday',
    period: '08:00-10:00',
    room: 'LT2',
    lecturer: 'Prof. Ade',
    cohort: '400L CSC',
    color: 'rose',
  },
]
