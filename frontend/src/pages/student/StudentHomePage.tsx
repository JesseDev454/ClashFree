import { useEffect, useState } from 'react'
import { fetchMyChanges, fetchPublishedMine } from '../../api/timetables'
import type { DashboardMetric } from '../../fixtures/adminDashboard'
import { slotsForDate } from '../../lib/todaySchedule'
import { ThinDashboardPage } from '../role/ThinDashboardPage'

const INITIAL: DashboardMetric[] = [
  { id: 'today', label: 'Today', value: '—', hint: 'Loading', tint: 'blue' },
  {
    id: 'meetings',
    label: 'Weekly meetings',
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
]

export function StudentHomePage() {
  const [metrics, setMetrics] = useState(INITIAL)

  useEffect(() => {
    let cancelled = false
    const today = new Date().toISOString().slice(0, 10)
    void Promise.all([
      fetchPublishedMine().catch(() => null),
      fetchMyChanges().catch(() => []),
    ]).then(([published, changes]) => {
      if (cancelled) {
        return
      }
      const slots = published?.slots ?? []
      setMetrics([
        {
          id: 'today',
          label: 'Today',
          value: String(slotsForDate(slots, today).length),
          hint: today,
          tint: 'blue',
        },
        {
          id: 'meetings',
          label: 'Weekly meetings',
          value: String(slots.length),
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
      ])
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ThinDashboardPage
      title="My timetable"
      description="Today's classes and the published week for your cohort."
      metrics={metrics}
    />
  )
}
