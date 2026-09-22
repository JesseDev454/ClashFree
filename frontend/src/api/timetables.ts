import { apiFetch, ApiError, readError } from './client'

export type Preflight = {
  session_label: string | null
  semester: string | null
  profile_name: string | null
  ready_assignments: number
  incomplete_assignments: number
  incomplete_codes: string[]
  rooms_total: number
  rooms_usable: number
  rooms_excluded: number
  lecturers_total: number
  lecturers_submitted: number
  hard_constraints: number
  soft_constraints: number
  soft_enabled: number
  can_generate: boolean
}

export type TimetableSlot = {
  id: number
  assignment_id: number
  meeting_index: number
  weekday: string
  start_period: string
  end_period: string
  room_id: number
  room_code: string | null
  course_code: string | null
  course_title: string | null
  lecturer_id: number | null
  lecturer_name: string | null
  cohort_id: number | null
  cohort_code: string | null
  department_id: number | null
  department_name: string | null
  building: string | null
}

export type TimetableConflict = {
  id: number
  kind: string
  severity: string
  title: string
  detail: string
  weekday: string | null
  period: string | null
  assignment_ids: number[]
}

export type TimetableSolution = {
  id: number
  run_id: number
  label: string
  objective: number
  hard_violations: number
  soft_penalty: number
  room_utilization_percent: number
  student_gap_hours: number
  is_selected: boolean
  moved_count: number
  preserved_count: number
}

export type TimetableRun = {
  id: number
  session_id: number
  weight_profile_id: number
  status: string
  time_limit_seconds: number
  alternative_count: number
  random_seed: number | null
  started_at: string
  finished_at: string | null
  solve_time_ms: number | null
  message: string | null
  created_by: number
  purpose: string
  disruption_id: number | null
  profile_name: string | null
  session_label: string | null
  solutions: TimetableSolution[]
}

export type DraftTimetable = {
  run: TimetableRun
  solution: TimetableSolution
  slots: TimetableSlot[]
  conflicts: TimetableConflict[]
}

export type GenerateRequest = {
  time_limit_seconds: number
  alternative_count: number
  random_seed?: number | null
  faculty_id?: number
  department_id?: number
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

export function fetchPreflight() {
  return requestJson<Preflight>('/api/timetables/preflight')
}

export function generateTimetable(body: GenerateRequest) {
  return requestJson<TimetableRun>('/api/timetables/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function repairTimetable(body: GenerateRequest & { disruption_id: number }) {
  return requestJson<TimetableRun>('/api/timetables/repair', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchTimetableRuns() {
  return requestJson<TimetableRun[]>('/api/timetables/runs')
}

export function fetchTimetableRun(id: number) {
  return requestJson<TimetableRun>(`/api/timetables/runs/${id}`)
}

export function selectSolution(id: number) {
  return requestJson<TimetableSolution>(`/api/timetables/solutions/${id}/select`, {
    method: 'POST',
  })
}

export async function fetchDraft(): Promise<DraftTimetable | null> {
  const response = await apiFetch('/api/timetables/draft')
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readError(response))
  }
  return (await response.json()) as DraftTimetable
}

export function fetchConflicts(solutionId?: number) {
  const query = solutionId ? `?solution_id=${solutionId}` : ''
  return requestJson<TimetableConflict[]>(`/api/timetables/conflicts${query}`)
}

export function validateDraft() {
  return requestJson<TimetableConflict[]>('/api/timetables/validate', {
    method: 'POST',
  })
}

export type TimetableVersion = {
  id: number
  session_id: number
  solution_id: number
  run_id: number
  version_number: number
  status: string
  is_current: boolean
  notes: string | null
  published_at: string
  published_by: number
  publisher_name: string | null
  session_label: string | null
  slot_count: number
  hard_violations: number
  soft_penalty: number
  room_utilization_percent: number
  slots: TimetableSlot[]
}

export type TimetableChange = {
  kind: string
  assignment_id: number
  meeting_index: number
  course_code: string | null
  from_weekday: string | null
  from_start_period: string | null
  from_room_code: string | null
  to_weekday: string | null
  to_start_period: string | null
  to_room_code: string | null
}

export function fetchPublishedMine() {
  return requestJson<TimetableVersion>('/api/timetables/published/mine')
}

export function fetchPublishedDepartment() {
  return requestJson<TimetableVersion>('/api/timetables/published/department')
}

export function fetchMyChanges() {
  return requestJson<TimetableChange[]>('/api/timetables/changes/mine')
}

export async function fetchPublished(): Promise<TimetableVersion | null> {
  const response = await apiFetch('/api/timetables/published')
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readError(response))
  }
  return (await response.json()) as TimetableVersion
}

export function fetchVersions() {
  return requestJson<TimetableVersion[]>('/api/timetables/versions')
}

export function fetchVersion(id: number) {
  return requestJson<TimetableVersion>(`/api/timetables/versions/${id}`)
}

export function publishTimetable(notes?: string) {
  return requestJson<TimetableVersion>('/api/timetables/publish', {
    method: 'POST',
    body: JSON.stringify({ notes: notes || null }),
  })
}

export function fetchChanges(fromVersionId?: number, toVersionId?: number) {
  const params = new URLSearchParams()
  if (fromVersionId) {
    params.set('from_version_id', String(fromVersionId))
  }
  if (toVersionId) {
    params.set('to_version_id', String(toVersionId))
  }
  const query = params.toString()
  return requestJson<TimetableChange[]>(
    `/api/timetables/changes${query ? `?${query}` : ''}`,
  )
}
