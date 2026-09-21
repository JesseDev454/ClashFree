import { useEffect, useState } from 'react'
import { fetchSummary } from '../../api/academic'
import { fetchDraft } from '../../api/timetables'
import { useAuth } from '../../auth/useAuth'
import { RoleShell } from '../../components/RoleShell'
import {
  classesPerDay,
  dashboardMetrics,
  type DashboardMetric,
} from '../../fixtures/adminDashboard'
import { WEEKDAY_LABELS, type Weekday } from '../../lib/schedule'
import { AdminDashboardContent } from './AdminDashboardContent'

const pendingAcademicMetrics: DashboardMetric[] = dashboardMetrics.map((metric) =>
  ['courses', 'lecturers', 'cohorts', 'rooms'].includes(metric.id)
    ? { ...metric, value: '—' }
    : metric,
)

export function AdminHomePage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetric[]>(pendingAcademicMetrics)
  const [classChart, setClassChart] = useState(classesPerDay)

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchSummary(), fetchDraft().catch(() => null)])
      .then(([summary, draft]) => {
        if (cancelled) {
          return
        }
        const sessionHint = summary.active_session_label
          ? `${summary.active_session_label}${summary.active_semester ? ` · ${summary.active_semester}` : ''}`
          : 'No active session'
        setMetrics(
          dashboardMetrics.map((metric) => {
            if (metric.id === 'courses') {
              return { ...metric, value: String(summary.courses), hint: sessionHint }
            }
            if (metric.id === 'lecturers') {
              return { ...metric, value: String(summary.lecturers) }
            }
            if (metric.id === 'cohorts') {
              return { ...metric, value: String(summary.cohorts) }
            }
            if (metric.id === 'rooms') {
              return { ...metric, value: String(summary.rooms) }
            }
            return metric
          }),
        )
        if (draft) {
          const counts: Record<string, number> = {
            Mon: 0,
            Tue: 0,
            Wed: 0,
            Thu: 0,
            Fri: 0,
            Sat: 0,
          }
          for (const slot of draft.slots) {
            const label = WEEKDAY_LABELS[slot.weekday as Weekday]
            if (label) {
              counts[label] += 1
            }
          }
          setClassChart(
            Object.entries(counts).map(([day, classes]) => ({ day, classes })),
          )
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMetrics(pendingAcademicMetrics)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <RoleShell>
      <AdminDashboardContent
        welcomeName={user?.full_name ?? 'Timetable Administrator'}
        reportsHref="/unavailable/admin-reports-analytics"
        generateHref="/admin/generate-timetable"
        helperText="Generate runs the CP-SAT solver for the active session. Repair and publishing remain later phases. Course, lecturer, cohort and room counts come from the academic catalogue."
        metrics={metrics}
        classChart={classChart}
      />
    </RoleShell>
  )
}
