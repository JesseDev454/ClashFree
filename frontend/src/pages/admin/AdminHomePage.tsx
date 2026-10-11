import { useEffect, useState } from 'react'
import { fetchAudit } from '../../api/activity'
import { fetchSummary } from '../../api/academic'
import { fetchDisruptions, fetchDisruptionSummary } from '../../api/disruptions'
import { fetchDraft, fetchPublished } from '../../api/timetables'
import { useAuth } from '../../auth/useAuth'
import { RoleShell } from '../../components/RoleShell'
import type { DashboardMetric, DisruptionRow } from '../../fixtures/adminDashboard'
import { toDashboardRow } from '../../lib/disruptions'
import { slotsToGridEvents, weekdayGridDays } from '../../lib/slotEvents'
import { AdminDashboardContent } from './AdminDashboardContent'
import type {
  ActivityItem,
  AttentionItem,
  PublicationSummary,
  WeekPreview,
} from './dashboardModel'

const pendingMetrics: DashboardMetric[] = [
  {
    id: 'courses',
    label: 'Courses',
    value: '—',
    hint: 'Loading catalogue',
    tint: 'blue',
  },
  {
    id: 'lecturers',
    label: 'Lecturers',
    value: '—',
    hint: 'Teaching this session',
    tint: 'green',
  },
  { id: 'rooms', label: 'Rooms', value: '—', hint: 'Bookable spaces', tint: 'lavender' },
  {
    id: 'classes',
    label: 'Scheduled classes',
    value: '—',
    hint: 'No timetable yet',
    tint: 'purple',
    href: '/admin/master-timetable',
  },
  {
    id: 'conflicts',
    label: 'Unresolved conflicts',
    value: '—',
    hint: 'In the selected draft',
    tint: 'amber',
    href: '/admin/conflict-monitor',
  },
  {
    id: 'disruptions',
    label: 'Active disruptions',
    value: '—',
    hint: 'Rooms and lecturers',
    tint: 'rose',
    href: '/admin/disruption-centre',
  },
]

type DashboardData = {
  metrics: DashboardMetric[]
  sessionLabel?: string
  publication: PublicationSummary
  attention: AttentionItem[]
  activity: ActivityItem[]
  week: WeekPreview | null
  disruptions: DisruptionRow[]
}

const emptyData: DashboardData = {
  metrics: pendingMetrics,
  publication: { stage: 'none' },
  attention: [],
  activity: [],
  week: null,
  disruptions: [],
}

export function AdminHomePage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchSummary(),
      fetchDraft().catch(() => null),
      fetchPublished().catch(() => null),
      fetchDisruptionSummary().catch(() => null),
      fetchDisruptions().catch(() => []),
      fetchAudit().catch(() => []),
    ])
      .then(([summary, draft, published, disruptionSummary, disruptions, audit]) => {
        if (cancelled) {
          return
        }
        const sessionLabel = summary.active_session_label
          ? `${summary.active_session_label}${summary.active_semester ? ` · ${summary.active_semester} semester` : ''}`
          : undefined
        const slots = draft?.slots ?? published?.slots ?? []
        const conflicts = draft?.conflicts ?? []
        const hardConflicts = conflicts.length
        const metrics = pendingMetrics.map((metric): DashboardMetric => {
          switch (metric.id) {
            case 'courses':
              return {
                ...metric,
                value: String(summary.courses),
                hint: `${summary.departments} ${summary.departments === 1 ? 'department' : 'departments'}`,
              }
            case 'lecturers':
              return { ...metric, value: String(summary.lecturers) }
            case 'rooms':
              return { ...metric, value: String(summary.rooms) }
            case 'classes':
              return slots.length > 0
                ? {
                    ...metric,
                    value: String(slots.length),
                    hint: draft ? 'In the selected draft' : 'Published',
                  }
                : metric
            case 'conflicts':
              return draft
                ? {
                    ...metric,
                    value: String(hardConflicts),
                    hint:
                      hardConflicts === 0
                        ? 'All hard constraints met'
                        : 'Require attention',
                  }
                : metric
            case 'disruptions':
              return disruptionSummary
                ? {
                    ...metric,
                    value: String(disruptionSummary.active),
                    hint: `${disruptionSummary.room_active} room · ${disruptionSummary.lecturer_active} lecturer`,
                  }
                : metric
            default:
              return metric
          }
        })

        const openDisruptions = disruptions.filter(
          (row) => row.status === 'open' || row.status === 'in_review',
        )
        const attention: AttentionItem[] = [
          ...openDisruptions.slice(0, 3).map((row): AttentionItem => ({
            id: `disruption-${row.id}`,
            tone: 'danger',
            title: `${row.resource_label} unavailable`,
            detail: `${row.reason} · ${row.classes_affected} classes affected`,
            href: `/admin/repair-timetable?disruptionId=${row.id}`,
            actionLabel: 'Repair',
          })),
          ...conflicts.slice(0, 3).map((conflict): AttentionItem => ({
            id: `conflict-${conflict.id}`,
            tone: conflict.severity === 'high' ? 'danger' : 'warning',
            title: conflict.title,
            detail: conflict.detail,
            href: '/admin/conflict-monitor',
            actionLabel: 'Inspect',
          })),
        ]

        setData({
          metrics,
          sessionLabel,
          publication: {
            stage:
              published && (!draft || draft.solution.id === published.solution_id)
                ? 'published'
                : draft
                  ? 'draft'
                  : 'none',
            publishedVersion: published?.version_number,
            publishedAt: published?.published_at,
            publishedBy: published?.publisher_name ?? undefined,
            hardConflicts: draft ? hardConflicts : undefined,
            scheduledClasses: slots.length || undefined,
          },
          attention,
          activity: audit.slice(0, 6).map((event) => ({
            id: String(event.id),
            actor: event.actor_name ?? 'System',
            text: event.summary,
            at: event.created_at,
          })),
          week:
            slots.length > 0
              ? {
                  caption: draft
                    ? 'Selected draft solution'
                    : `Published version ${published?.version_number}`,
                  days: weekdayGridDays(slots),
                  events: slotsToGridEvents(slots, conflicts),
                }
              : null,
          disruptions: disruptions.slice(0, 5).map(toDashboardRow),
        })
      })
      .catch(() => {
        if (!cancelled) {
          setData(emptyData)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
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
        sessionLabel={data.sessionLabel}
        helperText="Generate, Repair, Publish and the Disruption Centre run against the active session. Counts come from the academic catalogue."
        metrics={data.metrics}
        publication={data.publication}
        attention={data.attention}
        activity={data.activity}
        week={data.week}
        disruptionRows={data.disruptions}
        timetableHref="/admin/master-timetable"
        conflictsHref="/admin/conflict-monitor"
        reportsHref="/admin/reports-analytics"
        generateHref="/admin/generate-timetable"
        repairHref="/admin/repair-timetable"
        publishHref="/admin/publish-timetable"
        loading={loading}
      />
    </RoleShell>
  )
}
