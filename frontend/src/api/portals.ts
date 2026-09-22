import type { AssignmentRecord, CohortRecord, CourseRecord } from './academic'
import { apiFetch, ApiError, readError } from './client'
import type { AuthUser } from './auth'

export type PortalUser = AuthUser

export type UserSettings = {
  display_density: 'comfortable' | 'compact'
  week_starts_on: 'mon' | 'sun'
  notify_timetable_changes: boolean
  notify_requests: boolean
}

export type DepartmentConstraint = {
  id: number
  department_id: number
  kind: string
  weekday: string | null
  period: string | null
  room_type: string | null
  note: string | null
}

export type LecturerAvailabilitySummary = {
  lecturer_id: number
  full_name: string
  slot_count: number
  submitted: boolean
}

export type ScheduleRequest = {
  id: number
  session_id: number
  department_id: number
  requester_id: number
  requester_name: string | null
  kind: string
  status: string
  title: string
  detail: string
  assignment_id: number | null
  created_at: string
  decided_at: string | null
  decided_by: number | null
}

export type PublishedConflict = {
  kind: string
  severity: string
  title: string
  detail: string
  weekday: string | null
  period: string | null
  assignment_ids: number[]
}

export type MaintenanceBlock = {
  id: number
  room_id: number
  room_code: string | null
  starts_on: string
  ends_on: string
  start_period: string | null
  end_period: string | null
  reason: string
  kind: string
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok) {
    throw new ApiError(response.status, await readError(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export function fetchUsers() {
  return requestJson<PortalUser[]>('/api/users')
}

export function createUser(body: object) {
  return requestJson<PortalUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateUser(id: number, body: object) {
  return requestJson<PortalUser>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function updateProfile(fullName: string) {
  return requestJson<AuthUser>('/api/me', {
    method: 'PATCH',
    body: JSON.stringify({ full_name: fullName }),
  })
}

export function fetchSettings() {
  return requestJson<UserSettings>('/api/me/settings')
}

export function saveSettings(body: UserSettings) {
  return requestJson<UserSettings>('/api/me/settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function fetchMyCourses() {
  return requestJson<AssignmentRecord[]>('/api/me/courses')
}

export function fetchDepartmentCourses() {
  return requestJson<CourseRecord[]>('/api/department/courses')
}

export function createDepartmentCourse(body: object) {
  return requestJson<CourseRecord>('/api/department/courses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchDepartmentCohorts() {
  return requestJson<CohortRecord[]>('/api/department/cohorts')
}

export function createDepartmentCohort(body: object) {
  return requestJson<CohortRecord>('/api/department/cohorts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchDepartmentAssignments() {
  return requestJson<AssignmentRecord[]>('/api/department/assignments')
}

export function createDepartmentAssignment(body: object) {
  return requestJson<AssignmentRecord>('/api/department/assignments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchLecturerAvailabilitySummary() {
  return requestJson<LecturerAvailabilitySummary[]>(
    '/api/department/lecturer-availability',
  )
}

export function fetchDepartmentConstraints() {
  return requestJson<DepartmentConstraint[]>('/api/department/constraints')
}

export function createDepartmentConstraint(body: object) {
  return requestJson<DepartmentConstraint>('/api/department/constraints', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteDepartmentConstraint(id: number) {
  return requestJson<void>(`/api/department/constraints/${id}`, { method: 'DELETE' })
}

export function fetchDepartmentConflicts() {
  return requestJson<PublishedConflict[]>('/api/department/conflicts')
}

export function fetchRequests() {
  return requestJson<ScheduleRequest[]>('/api/requests')
}

export function createRequest(body: object) {
  return requestJson<ScheduleRequest>('/api/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function decideRequest(id: number, status: string) {
  return requestJson<ScheduleRequest>(`/api/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function fetchMaintenanceBlocks() {
  return requestJson<MaintenanceBlock[]>('/api/facilities/maintenance-blocks')
}
