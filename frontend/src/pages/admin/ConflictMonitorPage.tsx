import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  fetchConflicts,
  fetchDraft,
  validateDraft,
  type TimetableConflict,
} from '../../api/timetables'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'
import type { TableColumn } from '../../types/table'

function severityVariant(severity: string) {
  if (severity === 'high') {
    return 'danger' as const
  }
  if (severity === 'medium') {
    return 'warning' as const
  }
  return 'info' as const
}

const columns: TableColumn<TimetableConflict>[] = [
  { id: 'title', header: 'Issue', accessor: (row) => row.title },
  { id: 'kind', header: 'Kind', accessor: (row) => row.kind },
  {
    id: 'severity',
    header: 'Severity',
    accessor: (row) => (
      <StatusBadge variant={severityVariant(row.severity)}>{row.severity}</StatusBadge>
    ),
  },
  {
    id: 'when',
    header: 'When',
    accessor: (row) => (row.weekday ? `${row.weekday} ${row.period ?? ''}`.trim() : '—'),
  },
  { id: 'detail', header: 'Detail', accessor: (row) => row.detail },
]

export function ConflictMonitorPage() {
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([])
  const [hasDraft, setHasDraft] = useState(false)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const draft = await fetchDraft()
      if (!draft) {
        setHasDraft(false)
        setConflicts([])
        setState('empty')
        return
      }
      setHasDraft(true)
      setConflicts(await fetchConflicts(draft.solution.id))
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const counts = useMemo(() => {
    return {
      high: conflicts.filter((row) => row.severity === 'high').length,
      medium: conflicts.filter((row) => row.severity === 'medium').length,
      soft: conflicts.filter((row) => row.severity === 'soft').length,
    }
  }, [conflicts])

  async function onValidate() {
    setValidating(true)
    setError(null)
    try {
      setConflicts(await validateDraft())
      setState('ready')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Validation could not run')
    } finally {
      setValidating(false)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Conflict Monitor"
        description="Validates the selected draft. Publishing is on Publish Timetable."
        actions={
          <Button onClick={() => void onValidate()} disabled={!hasDraft || validating}>
            {validating ? 'Validating…' : 'Run Validation'}
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="High"
          value={String(counts.high)}
          hint="Hard clashes"
          tint="rose"
        />
        <MetricCard
          label="Medium"
          value={String(counts.medium)}
          hint="Incomplete assignments"
          tint="amber"
        />
        <MetricCard
          label="Soft"
          value={String(counts.soft)}
          hint="Preference penalties"
          tint="blue"
        />
        <MetricCard
          label="Total"
          value={String(conflicts.length)}
          hint="Selected draft"
          tint="lavender"
        />
      </div>
      {error ? (
        <p
          className="mb-4 rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          Conflicts could not be loaded.
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
          <DataTable
            caption="Draft timetable conflicts"
            columns={columns}
            data={conflicts}
            getRowId={(row) => String(row.id)}
            state={conflicts.length === 0 ? 'empty' : 'populated'}
            emptyMessage="Validation found no recorded conflicts."
          />
        </Card>
      ) : null}
      <p className="mt-4 rounded-xl border border-border bg-tint-blue px-4 py-3 text-sm text-muted-foreground">
        Validates the selected draft. Publishing is on{' '}
        <Link className="font-medium text-primary" to="/admin/publish-timetable">
          Publish Timetable
        </Link>
        . Operational incidents after publication live on{' '}
        <Link className="font-medium text-primary" to="/admin/disruption-centre">
          Disruption Centre
        </Link>
        .
      </p>
    </RoleShell>
  )
}
