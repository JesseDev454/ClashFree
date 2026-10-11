import {
  courses,
  DEMO_SESSION_LABEL,
  DEMO_WEEK_LABEL,
  lecturers,
  roomById,
  rooms,
} from '../../demo/data'
import { affectedByClosure, formatRange } from '../../demo/engine'
import { conflictIndex, gridDays, sessionToEvent } from '../../demo/gridAdapters'
import { useDemo } from '../../demo/store'
import { DAY_NAMES } from '../../demo/types'
import type { DashboardMetric, DisruptionRow } from '../../fixtures/adminDashboard'
import { previewAdminUser } from '../../config/navigation'
import { AdminDashboardContent } from '../admin/AdminDashboardContent'
import type { AttentionItem } from '../admin/dashboardModel'
import { DemoShell } from './demo/DemoShell'

export function AdminDashboardPage() {
  const demo = useDemo()
  const current = demo.versions[0]
  const openClosures = demo.closures.filter((closure) => closure.status !== 'repaired')
  const conflictCount = demo.conflicts.length

  const metrics: DashboardMetric[] = [
    {
      id: 'courses',
      label: 'Courses',
      value: String(courses.length),
      hint: '3 departments · 400 & 300 level',
      tint: 'blue',
    },
    {
      id: 'lecturers',
      label: 'Lecturers',
      value: String(lecturers.length),
      hint: 'All availability submitted',
      tint: 'green',
    },
    {
      id: 'rooms',
      label: 'Rooms',
      value: String(rooms.length),
      hint: '2 computer labs · 1 auditorium',
      tint: 'lavender',
    },
    {
      id: 'classes',
      label: 'Scheduled classes',
      value: String(demo.schedule.length),
      hint: DEMO_WEEK_LABEL,
      tint: 'purple',
      href: '/preview/admin/master-timetable',
    },
    {
      id: 'conflicts',
      label: 'Unresolved conflicts',
      value: String(conflictCount),
      hint: conflictCount === 0 ? 'All hard constraints met' : 'Require attention',
      tint: 'amber',
      href: '/preview/admin/master-timetable?conflicts=1',
    },
    {
      id: 'disruptions',
      label: 'Active disruptions',
      value: String(openClosures.filter((closure) => closure.status === 'open').length),
      hint:
        openClosures.length > 0
          ? `${roomById.get(openClosures[0].roomId)?.name} closed`
          : 'No rooms closed',
      tint: 'rose',
      href: '/preview/admin/repair-studio',
    },
  ]

  const attention: AttentionItem[] = []
  for (const closure of openClosures) {
    const affected =
      closure.affectedCount ?? affectedByClosure(demo.published, closure).length
    attention.push({
      id: closure.id,
      tone: closure.status === 'open' ? 'danger' : 'info',
      title:
        closure.status === 'open'
          ? `${roomById.get(closure.roomId)?.name} closed for maintenance`
          : `${roomById.get(closure.roomId)?.name} repair approved`,
      detail:
        closure.status === 'open'
          ? `${affected} classes affected Wednesday–Friday`
          : 'Publish the draft to notify lecturers and students',
      href: '/preview/admin/repair-studio',
      actionLabel: closure.status === 'open' ? 'Repair' : 'Publish',
    })
  }
  for (const conflict of demo.conflicts.filter((item) => item.kind !== 'closure')) {
    attention.push({
      id: conflict.id,
      tone: 'warning',
      title: conflict.title,
      detail: `${DAY_NAMES[conflict.day]} ${formatRange(conflict.start, 60).split('–')[0]} · ${conflict.sessionIds.length} classes`,
      href: `/preview/admin/master-timetable?class=${conflict.sessionIds[0]}`,
      actionLabel: 'Inspect',
    })
  }
  if (
    demo.draftChanges.length > 0 &&
    !openClosures.some((closure) => closure.status === 'repair-approved')
  ) {
    attention.push({
      id: 'draft',
      tone: 'info',
      title: `${demo.draftChanges.length} unpublished draft ${demo.draftChanges.length === 1 ? 'change' : 'changes'}`,
      detail: 'Validated and waiting for publication',
      href: '/preview/admin/master-timetable',
      actionLabel: 'Review',
    })
  }

  const conflicts = conflictIndex(demo.conflicts)
  const changed = new Set(demo.draftChanges.map((change) => change.sessionId))

  const disruptionRows: DisruptionRow[] = demo.closures.map((closure) => ({
    id: closure.id,
    type: 'Room',
    details: `${roomById.get(closure.roomId)?.name} — ${closure.reason}`,
    affected: `${closure.affectedCount ?? affectedByClosure(demo.published, closure).length} classes`,
    reportedBy: closure.reportedBy,
    status:
      closure.status === 'open'
        ? 'Open'
        : closure.status === 'repair-approved'
          ? 'Repair approved'
          : 'Repaired',
    statusVariant:
      closure.status === 'open'
        ? 'danger'
        : closure.status === 'repair-approved'
          ? 'info'
          : 'success',
  }))

  return (
    <DemoShell>
      <AdminDashboardContent
        welcomeName={previewAdminUser.name}
        sessionLabel={DEMO_SESSION_LABEL}
        helperText="Design lab: the timetable, repair and publishing workflows run on demo data in your browser. Generation workflows are unavailable here until Phase 3 and never send API requests."
        metrics={metrics}
        publication={{
          stage: 'published',
          publishedVersion: current?.number,
          publishedAt: current?.publishedAt,
          publishedBy: current?.publishedBy,
          draftChanges: demo.draftChanges.length,
          hardConflicts: conflictCount,
          scheduledClasses: demo.schedule.length,
        }}
        attention={attention}
        activity={demo.activity}
        week={{
          caption: `${DEMO_WEEK_LABEL} · hover a class for details`,
          days: gridDays(demo.schedule),
          events: demo.schedule.map((session) =>
            sessionToEvent(session, {
              conflicts,
              state: changed.has(session.id) ? 'proposed' : undefined,
            }),
          ),
        }}
        disruptionRows={disruptionRows}
        timetableHref="/preview/admin/master-timetable"
        conflictsHref="/preview/admin/master-timetable?conflicts=1"
        reportsHref="/preview/unavailable/admin-reports-analytics"
        repairHref="/preview/admin/repair-studio"
      />
    </DemoShell>
  )
}
