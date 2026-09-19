import { apiFetch, ApiError, readError } from './client'

export type AcademicSummary = {
  courses: number
  lecturers: number
  cohorts: number
  rooms: number
  faculties: number
  departments: number
  active_session_label: string | null
  active_semester: string | null
}

export type FacultyRecord = {
  id: number
  code: string
  name: string
  department_count: number
}

export type DepartmentRecord = {
  id: number
  code: string
  name: string
  faculty_id: number | null
  faculty_name: string | null
}

export type SessionRecord = {
  id: number
  label: string
  semester: string
  starts_on: string
  ends_on: string
  status: string
  draft_opens_on: string | null
  publish_deadline_on: string | null
  duration_days: number
}

export type CourseRecord = {
  id: number
  code: string
  title: string
  department_id: number
  department_name: string | null
  level: number
  units: number
  expected_size: number
  room_type: string
  status: string
  lecturer_name: string | null
}

export type CohortRecord = {
  id: number
  code: string
  department_id: number
  department_name: string | null
  level: number
  size: number
  status: string
  course_count: number
}

export type LecturerRecord = {
  id: number
  full_name: string
  department_id: number
  department_name: string | null
  user_id: number | null
  max_weekly_hours: number
  status: string
  course_count: number
}

export type RoomRecord = {
  id: number
  code: string
  building: string
  room_type: string
  capacity: number
  equipment: string | null
  status: string
}

export type AssignmentRecord = {
  id: number
  course_id: number
  course_code: string | null
  course_title: string | null
  cohort_id: number
  cohort_code: string | null
  lecturer_id: number | null
  lecturer_name: string | null
  contact_pattern: string
  room_type: string | null
  expected_size: number | null
  status: string
  department_id: number | null
}

export type QueryParams = Record<string, string | number | boolean | undefined>

function queryString(params: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'all') {
      continue
    }
    search.set(key, String(value))
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ''
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

export function fetchSummary() {
  return requestJson<AcademicSummary>('/api/academic/summary')
}

export function fetchSessions(params: QueryParams = {}) {
  return requestJson<SessionRecord[]>(`/api/sessions${queryString(params)}`)
}

export function createSession(body: object) {
  return requestJson<SessionRecord>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateSession(id: number, body: object) {
  return requestJson<SessionRecord>(`/api/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteSession(id: number) {
  return requestJson<void>(`/api/sessions/${id}`, { method: 'DELETE' })
}

export function activateSession(id: number) {
  return requestJson<SessionRecord>(`/api/sessions/${id}/activate`, { method: 'POST' })
}

export function fetchFaculties(params: QueryParams = {}) {
  return requestJson<FacultyRecord[]>(`/api/faculties${queryString(params)}`)
}

export function createFaculty(body: object) {
  return requestJson<FacultyRecord>('/api/faculties', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateFaculty(id: number, body: object) {
  return requestJson<FacultyRecord>(`/api/faculties/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteFaculty(id: number) {
  return requestJson<void>(`/api/faculties/${id}`, { method: 'DELETE' })
}

export function fetchDepartments(params: QueryParams = {}) {
  return requestJson<DepartmentRecord[]>(`/api/departments${queryString(params)}`)
}

export function createDepartment(body: object) {
  return requestJson<DepartmentRecord>('/api/departments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateDepartment(id: number, body: object) {
  return requestJson<DepartmentRecord>(`/api/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteDepartment(id: number) {
  return requestJson<void>(`/api/departments/${id}`, { method: 'DELETE' })
}

export function fetchCourses(params: QueryParams = {}) {
  return requestJson<CourseRecord[]>(`/api/courses${queryString(params)}`)
}

export function createCourse(body: object) {
  return requestJson<CourseRecord>('/api/courses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCourse(id: number, body: object) {
  return requestJson<CourseRecord>(`/api/courses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteCourse(id: number) {
  return requestJson<void>(`/api/courses/${id}`, { method: 'DELETE' })
}

export function fetchCohorts(params: QueryParams = {}) {
  return requestJson<CohortRecord[]>(`/api/cohorts${queryString(params)}`)
}

export function createCohort(body: object) {
  return requestJson<CohortRecord>('/api/cohorts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCohort(id: number, body: object) {
  return requestJson<CohortRecord>(`/api/cohorts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteCohort(id: number) {
  return requestJson<void>(`/api/cohorts/${id}`, { method: 'DELETE' })
}

export function fetchLecturers(params: QueryParams = {}) {
  return requestJson<LecturerRecord[]>(`/api/lecturers${queryString(params)}`)
}

export function createLecturer(body: object) {
  return requestJson<LecturerRecord>('/api/lecturers', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateLecturer(id: number, body: object) {
  return requestJson<LecturerRecord>(`/api/lecturers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteLecturer(id: number) {
  return requestJson<void>(`/api/lecturers/${id}`, { method: 'DELETE' })
}

export function fetchRooms(params: QueryParams = {}) {
  return requestJson<RoomRecord[]>(`/api/rooms${queryString(params)}`)
}

export function createRoom(body: object) {
  return requestJson<RoomRecord>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateRoom(id: number, body: object) {
  return requestJson<RoomRecord>(`/api/rooms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteRoom(id: number) {
  return requestJson<void>(`/api/rooms/${id}`, { method: 'DELETE' })
}

export function fetchAssignments(params: QueryParams = {}) {
  return requestJson<AssignmentRecord[]>(`/api/assignments${queryString(params)}`)
}

export function createAssignment(body: object) {
  return requestJson<AssignmentRecord>('/api/assignments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAssignment(id: number, body: object) {
  return requestJson<AssignmentRecord>(`/api/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteAssignment(id: number) {
  return requestJson<void>(`/api/assignments/${id}`, { method: 'DELETE' })
}
