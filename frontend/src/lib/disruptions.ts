import type { DisruptionRecord } from '../api/disruptions'
import { PERIOD_LABELS, WEEKDAY_FULL, type Period, type Weekday } from './schedule'
import type { StatusVariant } from '../types/status'

export function disruptionStatusLabel(status: string): string {
  if (status === 'in_review') {
    return 'In review'
  }
  if (status === 'scheduled') {
    return 'Scheduled'
  }
  if (status === 'repaired') {
    return 'Repaired'
  }
  return 'Open'
}

export function disruptionStatusVariant(status: string): StatusVariant {
  if (status === 'in_review') {
    return 'warning'
  }
  if (status === 'scheduled') {
    return 'info'
  }
  if (status === 'repaired') {
    return 'success'
  }
  return 'danger'
}

export function disruptionKindLabel(kind: string): string {
  return kind === 'lecturer' ? 'Lecturer' : 'Room'
}

export function formatDisruptionWindow(row: {
  starts_on: string
  ends_on: string
  start_period: string | null
  end_period: string | null
}): string {
  const start = row.starts_on
  const end = row.ends_on === row.starts_on ? '' : `–${row.ends_on}`
  const startPeriod = row.start_period
    ? (PERIOD_LABELS[row.start_period as Period] ?? row.start_period)
    : 'All day'
  const endPeriod =
    row.end_period && row.end_period !== row.start_period
      ? `–${PERIOD_LABELS[row.end_period as Period] ?? row.end_period}`
      : ''
  return `${start}${end} · ${startPeriod}${endPeriod}`
}

export function formatMeeting(weekday: string, start: string, end: string): string {
  const day = WEEKDAY_FULL[weekday as Weekday] ?? weekday
  const from = PERIOD_LABELS[start as Period] ?? start
  if (!end || end === start) {
    return `${day} ${from}`
  }
  const to = PERIOD_LABELS[end as Period] ?? end
  return `${day} ${from.split('–')[0]}–${to.split('–')[1] ?? to}`
}

export function toDashboardRow(row: DisruptionRecord) {
  return {
    id: String(row.id),
    type: disruptionKindLabel(row.kind),
    details: `${row.resource_label} — ${row.reason}`,
    affected: `${row.classes_affected} classes`,
    reportedBy: row.reporter_name ?? 'Unknown',
    status: disruptionStatusLabel(row.status),
    statusVariant: disruptionStatusVariant(row.status),
  }
}
