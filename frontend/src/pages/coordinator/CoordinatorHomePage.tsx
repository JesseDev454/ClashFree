import { useEffect, useState } from 'react'
import {
  fetchDepartmentAssignments,
  fetchDepartmentCohorts,
  fetchDepartmentConflicts,
  fetchDepartmentCourses,
  fetchRequests,
} from '../../api/portals'
import type { DashboardMetric } from '../../fixtures/adminDashboard'
import { ThinDashboardPage } from '../role/ThinDashboardPage'

const INITIAL: DashboardMetric[] = [
  { id: 'courses', label: 'Courses', value: '—', hint: 'Loading', tint: 'blue' },
  { id: 'cohorts', label: 'Cohorts', value: '—', hint: 'Loading', tint: 'green' },
  {
    id: 'requests',
    label: 'Pending requests',
    value: '—',
    hint: 'Loading',
    tint: 'amber',
  },
  {
    id: 'conflicts',
    label: 'Published conflicts',
    value: '—',
    hint: 'Loading',
    tint: 'purple',
  },
]

export function CoordinatorHomePage() {
  const [metrics, setMetrics] = useState(INITIAL)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchDepartmentCourses(),
      fetchDepartmentCohorts(),
      fetchDepartmentAssignments(),
      fetchRequests(),
      fetchDepartmentConflicts(),
    ])
      .then(([courses, cohorts, assignments, requests, conflicts]) => {
        if (cancelled) {
          return
        }
        const pending = requests.filter((row) => row.status === 'pending').length
        setMetrics([
          {
            id: 'courses',
            label: 'Courses',
            value: String(courses.length),
            hint: `${assignments.length} assignments`,
            tint: 'blue',
          },
          {
            id: 'cohorts',
            label: 'Cohorts',
            value: String(cohorts.length),
            hint: 'Department groups',
            tint: 'green',
          },
          {
            id: 'requests',
            label: 'Pending requests',
            value: String(pending),
            hint: `${requests.length} total`,
            tint: 'amber',
          },
          {
            id: 'conflicts',
            label: 'Published conflicts',
            value: String(conflicts.length),
            hint: 'Published grid',
            tint: 'purple',
          },
        ])
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ThinDashboardPage
      title="Department workspace"
      description="Courses, cohorts, requests and published timetable issues for your department."
      metrics={metrics}
    />
  )
}
