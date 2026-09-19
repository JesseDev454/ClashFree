export type TimetableEntry = {
  id: string
  courseCode: string
  courseTitle: string
  day: string
  period: string
  room: string
  lecturer: string
  cohort: string
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose'
}
