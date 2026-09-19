import type { Role } from '../types/permissions'

export const ROLE_HOME_PATH: Record<Exclude<Role, 'unauthenticated'>, string> = {
  timetable_administrator: '/admin/dashboard',
  department_coordinator: '/coordinator/dashboard',
  lecturer: '/lecturer/dashboard',
  facilities_manager: '/facilities/dashboard',
  student: '/student/dashboard',
}

export const ROLE_LABELS: Record<Exclude<Role, 'unauthenticated'>, string> = {
  timetable_administrator: 'Administrator',
  department_coordinator: 'Department Coordinator',
  lecturer: 'Lecturer',
  facilities_manager: 'Facilities Manager',
  student: 'Student',
}

export function homePathFor(role: string): string {
  return ROLE_HOME_PATH[role as Exclude<Role, 'unauthenticated'>] ?? '/auth/login'
}

export function safeNextPath(value: string | null): string | null {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return null
  }
  return value
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return 'CF'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}
