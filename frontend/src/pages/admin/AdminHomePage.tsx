import { useEffect, useState } from 'react'
import { fetchSummary } from '../../api/academic'
import { useAuth } from '../../auth/useAuth'
import { RoleShell } from '../../components/RoleShell'
import { dashboardMetrics, type DashboardMetric } from '../../fixtures/adminDashboard'
import { AdminDashboardContent } from './AdminDashboardContent'

const pendingAcademicMetrics: DashboardMetric[] = dashboardMetrics.map((metric) =>
  ['courses', 'lecturers', 'cohorts', 'rooms'].includes(metric.id)
    ? { ...metric, value: '—' }
    : metric,
)

export function AdminHomePage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetric[]>(pendingAcademicMetrics)

  useEffect(() => {
    let cancelled = false
    void fetchSummary()
      .then((summary) => {
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
        helperText="Generation, repair and publishing are reserved for the timetable administrator. The solver is not implemented until Phase 5. Course, lecturer, cohort and room counts come from the academic catalogue."
        metrics={metrics}
      />
    </RoleShell>
  )
}
