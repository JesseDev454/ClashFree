import { apiFetch, ApiError, readError } from './client'
import type { GridSlot } from '../lib/schedule'

export type ConstraintRecord = {
  id: number
  code: string
  name: string
  description: string
  kind: string
  locked: boolean
  enabled: boolean
  sort_order: number
}

export type ConstraintSummary = {
  hard: number
  soft: number
  soft_enabled: number
  department_rules: number
  current_profile: string | null
  validation_percent: number
}

export type WeightProfile = {
  id: number
  code: string
  name: string
  schedule_stability: number
  student_idle_gaps: number
  room_utilization: number
  lecturer_preferences: number
  daily_balance: number
  building_movement: number
  is_current: boolean
}

export type WeightValues = Omit<WeightProfile, 'id' | 'code' | 'name' | 'is_current'>

export type AvailabilityException = {
  id: number
  starts_on: string
  ends_on: string
  start_period: string | null
  end_period: string | null
  reason: string
  kind: string
}

export type LecturerAvailability = {
  lecturer_id: number
  lecturer_name: string
  submitted: boolean
  coverage_percent: number
  available_slots: number
  preferred_slots: number
  unavailable_slots: number
  slots: GridSlot[]
  exceptions: AvailabilityException[]
}

export type LecturerPreferences = {
  lecturer_id: number
  prefer_morning: boolean
  avoid_friday_afternoon: boolean
  no_early_after_late: boolean
  max_classes_per_day: number
  max_consecutive_hours: number
  min_break_minutes: number
  preferred_days: string[]
}

export type RoomBlock = {
  id: number
  starts_on: string
  ends_on: string
  start_period: string | null
  end_period: string | null
  reason: string
  kind: string
  recurring: boolean
}

export type RoomAvailability = {
  room_id: number
  room_code: string
  slots: GridSlot[]
  blocks: RoomBlock[]
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

export function fetchConstraintSummary() {
  return requestJson<ConstraintSummary>('/api/constraints/summary')
}

export function fetchConstraints() {
  return requestJson<ConstraintRecord[]>('/api/constraints')
}

export function patchConstraint(id: number, enabled: boolean) {
  return requestJson<ConstraintRecord>(`/api/constraints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}

export function fetchWeightProfiles() {
  return requestJson<WeightProfile[]>('/api/constraint-weights')
}

export function patchWeightProfile(id: number, body: WeightValues) {
  return requestJson<WeightProfile>(`/api/constraint-weights/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function activateWeightProfile(id: number) {
  return requestJson<WeightProfile>(`/api/constraint-weights/${id}/activate`, {
    method: 'POST',
  })
}

export function fetchMyAvailability() {
  return requestJson<LecturerAvailability>('/api/me/availability')
}

export function saveMyAvailability(slots: GridSlot[]) {
  return requestJson<LecturerAvailability>('/api/me/availability', {
    method: 'PUT',
    body: JSON.stringify({ slots }),
  })
}

export function createMyException(body: {
  starts_on: string
  ends_on: string
  start_period?: string | null
  end_period?: string | null
  reason: string
  kind?: string
}) {
  return requestJson<AvailabilityException>('/api/me/availability/exceptions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteMyException(id: number) {
  return requestJson<void>(`/api/me/availability/exceptions/${id}`, {
    method: 'DELETE',
  })
}

export function fetchMyPreferences() {
  return requestJson<LecturerPreferences>('/api/me/preferences')
}

export function saveMyPreferences(body: Omit<LecturerPreferences, 'lecturer_id'>) {
  return requestJson<LecturerPreferences>('/api/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function fetchRoomAvailability(roomId: number) {
  return requestJson<RoomAvailability>(`/api/rooms/${roomId}/availability`)
}

export function saveRoomAvailability(roomId: number, slots: GridSlot[]) {
  return requestJson<RoomAvailability>(`/api/rooms/${roomId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ slots }),
  })
}

export function createRoomBlock(
  roomId: number,
  body: {
    starts_on: string
    ends_on: string
    start_period?: string | null
    end_period?: string | null
    reason: string
    kind: string
    recurring?: boolean
  },
) {
  return requestJson<RoomBlock>(`/api/rooms/${roomId}/availability/blocks`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteRoomBlock(roomId: number, blockId: number) {
  return requestJson<void>(`/api/rooms/${roomId}/availability/blocks/${blockId}`, {
    method: 'DELETE',
  })
}
