import { useState } from 'react'
import type { ActivityReport } from '../../api/activity'
import { ApiError } from '../../api/client'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

const EMPTY: ActivityReport = {
  meeting_count: 0,
  room_utilization_percent: 0,
  change_count: 0,
  open_disruptions: 0,
  pending_requests: 0,
}

export function ReportsPage({
  title,
  description,
  load,
}: {
  title: string
  description: string
  load: () => Promise<ActivityReport>
}) {
  const [report, setReport] = useState<ActivityReport>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      setReport(await load())
      setError(null)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Report could not be loaded')
    }
  }, [load])

  return (
    <RoleShell>
      <PageHeader title={title} description={description} />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Meetings"
          value={String(report.meeting_count)}
          hint="Current published version"
          tint="blue"
        />
        <MetricCard
          label="Room utilization"
          value={`${report.room_utilization_percent}%`}
          hint="Published week"
          tint="green"
        />
        <MetricCard
          label="Changes"
          value={String(report.change_count)}
          hint="Versus the previous version"
          tint="amber"
        />
        <MetricCard
          label="Open disruptions"
          value={String(report.open_disruptions)}
          hint="Open and in review"
          tint="rose"
        />
        <MetricCard
          label="Pending requests"
          value={String(report.pending_requests)}
          hint="Waiting for a decision"
          tint="purple"
        />
      </div>
    </RoleShell>
  )
}
