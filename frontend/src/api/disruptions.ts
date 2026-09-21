import { apiFetch, ApiError, readError } from './client'

export type DisruptionImpactClass = {
  assignment_id: number
  meeting_index: number
  course_code: string | null
  course_title: string | null
  cohort_code: string | null
  cohort_size: number
  weekday: string
  start_period: string
  end_period: string
  room_code: string | null
  lecturer_name: string | null
}

export type DisruptionImpact = {
  classes_affected: number
  students_affected: number
  published: boolean
  classes: DisruptionImpactClass[]
}

export type DisruptionRecord = {
  id: number
  code: string
  session_id: number
  kind: string
  room_id: number | null
  lecturer_id: number | null
  resource_label: string
  reason: string
  description: string | null
  severity: string
  starts_on: string
  ends_on: string
  start_period: string | null
  end_period: string | null
  status: string
  reported_by: number
  reporter_name: string | null
  reporter_role: string | null
  block_id: number | null
  classes_affected: number
  students_affected: number
  created_at: string
  updated_at: string
  impact: DisruptionImpact | null
}

export type DisruptionSummary = {
  active: number
  scheduled: number
  open: number
  in_review: number
  room_active: number
  lecturer_active: number
  classes_affected: number
  students_affected: number
  published: boolean
}

export type DisruptionWrite = {
  kind: string
  room_id?: number | null
  lecturer_id?: number | null
  reason: string
  description?: string | null
  severity?: string
  starts_on: string
  ends_on: string
  start_period?: string | null
  end_period?: string | null
  create_block?: boolean
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

export function fetchDisruptions(params: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value)
    }
  }
  const query = search.toString()
  return requestJson<DisruptionRecord[]>(`/api/disruptions${query ? `?${query}` : ''}`)
}

export function fetchDisruptionSummary() {
  return requestJson<DisruptionSummary>('/api/disruptions/summary')
}

export function fetchDisruption(id: number) {
  return requestJson<DisruptionRecord>(`/api/disruptions/${id}`)
}

export function fetchDisruptionImpact(id: number) {
  return requestJson<DisruptionImpact>(`/api/disruptions/${id}/impact`)
}

export function previewDisruption(body: DisruptionWrite) {
  return requestJson<DisruptionImpact>('/api/disruptions/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createDisruption(body: DisruptionWrite) {
  return requestJson<DisruptionRecord>('/api/disruptions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function patchDisruption(id: number, body: Record<string, unknown>) {
  return requestJson<DisruptionRecord>(`/api/disruptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
