import { useEffect, useState } from 'react'
import { fetchMyAvailability } from '../../api/constraints'
import { fetchMyCourses } from '../../api/portals'
import { fetchMyChanges, fetchPublishedMine } from '../../api/timetables'
import type { DashboardMetric } from '../../fixtures/adminDashboard'
import { ThinDashboardPage } from '../role/ThinDashboardPage'

const INITIAL: DashboardMetric[] = [
  { id: 'courses', label: 'Courses', value: '—', hint: 'Loading', tint: 'blue' },
  {
    id: 'classes',
    label: 'Published meetings',
    value: '—',
    hint: 'Loading',
    tint: 'green',
  },
  {
    id: 'changes',
    label: 'Published changes',
    value: '—',
    hint: 'Loading',
    tint: 'amber',
  },
  {
    id: 'availability',
    label: 'Availability',
    value: '—',
    hint: 'Loading',
    tint: 'purple',
  },
]

export function LecturerHomePage() {
  const [metrics, setMetrics] = useState(INITIAL)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchMyCourses().catch(() => []),
      fetchPublishedMine().catch(() => null),
      fetchMyChanges().catch(() => []),
      fetchMyAvailability().catch(() => null),
    ]).then(([courses, published, changes, availability]) => {
      if (cancelled) {
        return
      }
      setMetrics([
        {
          id: 'courses',
          label: 'Courses',
          value: String(courses.length),
          hint: 'Assigned to you',
          tint: 'blue',
        },
        {
          id: 'classes',
          label: 'Published meetings',
          value: String(published?.slots.length ?? 0),
          hint: published ? `Version ${published.version_number}` : 'Nothing published',
          tint: 'green',
        },
        {
          id: 'changes',
          label: 'Published changes',
          value: String(changes.length),
          hint: 'Since the previous version',
          tint: 'amber',
        },
        {
          id: 'availability',
          label: 'Availability',
          value: availability?.submitted ? 'Submitted' : 'Missing',
          hint: availability?.submitted
            ? `${availability.coverage_percent}% coverage`
            : 'No weekly grid saved',
          tint: 'purple',
        },
      ])
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ThinDashboardPage
      title="Teaching workspace"
      description="Your courses, published timetable, availability and recent changes."
      metrics={metrics}
    />
  )
}
