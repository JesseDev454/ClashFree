import type { StatusVariant } from '../types/status'
import type { SelectOption } from '../components/Select'

export const ROOM_TYPE_OPTIONS: SelectOption[] = [
  { value: 'lecture_hall', label: 'Lecture Hall' },
  { value: 'lab', label: 'Lab' },
  { value: 'computer_lab', label: 'Computer Lab' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'seminar', label: 'Seminar Room' },
]

export const SEMESTER_OPTIONS: SelectOption[] = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
]

export const SESSION_STATUS_OPTIONS: SelectOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

export const LEVEL_OPTIONS: SelectOption[] = [100, 200, 300, 400, 500].map((level) => ({
  value: String(level),
  label: `${level}L`,
}))

export const COHORT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'complete', label: 'Complete' },
  { value: 'needs_review', label: 'Needs review' },
]

export const LECTURER_STATUS_OPTIONS: SelectOption[] = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited' },
  { value: 'overloaded', label: 'Overloaded' },
]

export const ROOM_STATUS_OPTIONS: SelectOption[] = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'maintenance', label: 'Maintenance' },
]

export function labelFor(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

export function statusVariant(status: string): StatusVariant {
  if (['active', 'available', 'ready', 'complete', 'configured'].includes(status)) {
    return 'success'
  }
  if (
    ['draft', 'limited', 'needs_review', 'needs_attention', 'maintenance'].includes(
      status,
    )
  ) {
    return 'warning'
  }
  if (['unavailable', 'overloaded', 'archived'].includes(status)) {
    return status === 'archived' ? 'neutral' : 'danger'
  }
  return 'info'
}

export function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function departmentOptions(
  departments: { id: number; name: string }[],
): SelectOption[] {
  return departments.map((department) => ({
    value: String(department.id),
    label: department.name,
  }))
}
