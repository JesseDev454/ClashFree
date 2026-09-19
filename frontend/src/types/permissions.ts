export const roles = [
  'unauthenticated',
  'timetable_administrator',
  'department_coordinator',
  'lecturer',
  'facilities_manager',
  'student',
] as const

export type Role = (typeof roles)[number]

export const capabilities = [
  'view',
  'edit',
  'submitRequest',
  'reportDisruption',
  'generate',
  'approveRepair',
  'publish',
] as const

export type Capability = (typeof capabilities)[number]

export const dataScopes = ['public', 'university', 'department', 'personal'] as const

export type DataScope = (typeof dataScopes)[number]
