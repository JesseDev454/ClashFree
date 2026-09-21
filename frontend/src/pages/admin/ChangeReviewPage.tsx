import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { fetchChanges, fetchDraft, type TimetableChange } from '../../api/timetables'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'
import {
  PERIOD_LABELS,
  WEEKDAY_LABELS,
  type Period,
  type Weekday,
} from '../../lib/schedule'
import type { TableColumn } from '../../types/table'

function formatSide(
  weekday: string | null,
  period: string | null,
  room: string | null,
): string {
  if (!weekday && !period && !room) {
    return '—'
  }
  const day = weekday ? (WEEKDAY_LABELS[weekday as Weekday] ?? weekday) : ''
  const time = period ? (PERIOD_LABELS[period as Period] ?? period) : ''
  return [day, time, room].filter(Boolean).join(' · ')
}

function kindVariant(kind: string) {
  if (kind === 'added') {
    return 'success' as const
  }
  if (kind === 'removed') {
    return 'danger' as const
  }
  return 'warning' as const
}

const columns: TableColumn<TimetableChange>[] = [
  {
    id: 'kind',
    header: 'Change',
    accessor: (row) => (
      <StatusBadge variant={kindVariant(row.kind)}>{row.kind}</StatusBadge>
    ),
  },
  {
    id: 'course',
    header: 'Course',
    accessor: (row) => row.course_code ?? `Assignment ${row.assignment_id}`,
  },
  {
    id: 'from',
    header: 'Published',
    accessor: (row) =>
      formatSide(row.from_weekday, row.from_start_period, row.from_room_code),
  },
  {
    id: 'to',
    header: 'Draft',
    accessor: (row) => formatSide(row.to_weekday, row.to_start_period, row.to_room_code),
  },
]

export function ChangeReviewPage() {
  const [changes, setChanges] = useState<TimetableChange[]>([])
  const [hasDraft, setHasDraft] = useState(false)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')

  async function load() {
    setState('loading')
    try {
      const draft = await fetchDraft()
      if (!draft) {
        setHasDraft(false)
        setChanges([])
        setState('empty')
        return
      }
      setHasDraft(true)
      setChanges(await fetchChanges())
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const counts = useMemo(() => {
    return {
      added: changes.filter((row) => row.kind === 'added').length,
      removed: changes.filter((row) => row.kind === 'removed').length,
      moved: changes.filter((row) => row.kind === 'moved').length,
    }
  }, [changes])

  const firstPublish =
    hasDraft && changes.length > 0 && changes.every((row) => row.kind === 'added')

  return (
    <RoleShell>
      <PageHeader
        title="Change Review"
        description="Compare the selected draft with the currently published timetable."
        actions={
          <Button asChild>
            <Link to="/admin/publish-timetable">Publish Timetable</Link>
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Added"
          value={String(counts.added)}
          hint="Draft only"
          tint="green"
        />
        <MetricCard
          label="Removed"
          value={String(counts.removed)}
          hint="Published only"
          tint="rose"
        />
        <MetricCard
          label="Moved"
          value={String(counts.moved)}
          hint="Day, time or room"
          tint="amber"
        />
        <MetricCard
          label="Total"
          value={String(changes.length)}
          hint="Keyed by class meeting"
          tint="blue"
        />
      </div>
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          Change review could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          No draft timetable is selected.{' '}
          <Link className="font-medium text-primary" to="/admin/generate-timetable">
            Generate a timetable
          </Link>{' '}
          first.
        </p>
      ) : null}
      {state === 'ready' ? (
        <Card>
          {firstPublish ? (
            <p className="mb-4 text-sm text-muted-foreground">
              All classes in the draft will be published.
            </p>
          ) : null}
          <DataTable
            caption="Draft versus published changes"
            columns={columns}
            data={changes}
            getRowId={(row) => `${row.kind}-${row.assignment_id}-${row.meeting_index}`}
            state={changes.length === 0 ? 'empty' : 'populated'}
            emptyMessage="The selected draft matches the currently published timetable."
          />
        </Card>
      ) : null}
    </RoleShell>
  )
}
