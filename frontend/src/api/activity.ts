import { apiFetch, ApiError, readError } from './client'

export type NotificationItem = {
  id: number
  kind: string
  title: string
  body: string
  href: string | null
  read_at: string | null
  created_at: string
}

export type AuditEvent = {
  id: number
  actor_id: number | null
  actor_name: string | null
  action: string
  entity_type: string
  entity_id: number | null
  summary: string
  created_at: string
}

export type ActivityReport = {
  meeting_count: number
  room_utilization_percent: number
  change_count: number
  open_disruptions: number
  pending_requests: number
}

export type RoomUtilization = {
  room_id: number
  room_code: string
  building: string | null
  status: string
  occupied_slots: number
  week_slots: number
  utilization_percent: number
}

export type FacilityHistoryItem = {
  id: string
  source: string
  title: string
  detail: string
  room_code: string | null
  occurred_at: string
  status: string | null
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok) {
    throw new ApiError(response.status, await readError(response))
  }
  return (await response.json()) as T
}

export function fetchNotifications() {
  return requestJson<NotificationItem[]>('/api/notifications')
}

export function markNotificationRead(id: number) {
  return requestJson<NotificationItem>(`/api/notifications/${id}`, { method: 'PATCH' })
}

export function markAllNotificationsRead() {
  return requestJson<{ updated: number }>('/api/notifications/read-all', {
    method: 'POST',
  })
}

export function fetchAudit() {
  return requestJson<AuditEvent[]>('/api/audit')
}

export function fetchUniversityReport() {
  return requestJson<ActivityReport>('/api/reports/university')
}

export function fetchDepartmentReport() {
  return requestJson<ActivityReport>('/api/reports/department')
}

export function fetchRoomUtilization() {
  return requestJson<RoomUtilization[]>('/api/facilities/utilization')
}

export function fetchFacilityHistory() {
  return requestJson<FacilityHistoryItem[]>('/api/facilities/history')
}
