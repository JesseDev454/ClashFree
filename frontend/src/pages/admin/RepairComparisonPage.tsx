import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import {
  fetchTimetableRun,
  selectSolution,
  type TimetableRun,
  type TimetableSolution,
} from '../../api/timetables'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'
import type { TableColumn } from '../../types/table'

type OptionRow = {
  id: string
  solution: TimetableSolution
}

export function RepairComparisonPage() {
  const [searchParams] = useSearchParams()
  const runId = searchParams.get('runId')
  const [run, setRun] = useState<TimetableRun | null>(null)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<number | null>(null)

  async function load() {
    setError(null)
    if (!runId) {
      setRun(null)
      setState('empty')
      return
    }
    setState('loading')
    try {
      setRun(await fetchTimetableRun(Number(runId)))
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [runId])

  async function onSelect(solution: TimetableSolution) {
    if (solution.hard_violations > 0) {
      return
    }
    setSelecting(solution.id)
    setError(null)
    try {
      await selectSolution(solution.id)
      if (runId) {
        setRun(await fetchTimetableRun(Number(runId)))
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Could not select that option',
      )
    } finally {
      setSelecting(null)
    }
  }

  const rows: OptionRow[] = (run?.solutions ?? []).map((solution) => ({
    id: String(solution.id),
    solution,
  }))
  const blocked = run?.status === 'infeasible' || run?.status === 'failed'

  const columns: TableColumn<OptionRow>[] = [
    {
      id: 'label',
      header: 'Option',
      accessor: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.solution.label}
          {row.solution.is_selected ? (
            <StatusBadge variant="success">Draft</StatusBadge>
          ) : null}
        </span>
      ),
    },
    {
      id: 'moved',
      header: 'Moved classes',
      accessor: (row) => row.solution.moved_count,
    },
    {
      id: 'preserved',
      header: 'Preserved classes',
      accessor: (row) => row.solution.preserved_count,
    },
    {
      id: 'hard',
      header: 'Hard violations',
      accessor: (row) => row.solution.hard_violations,
    },
    {
      id: 'soft',
      header: 'Soft penalty',
      accessor: (row) => row.solution.soft_penalty,
    },
    {
      id: 'utilisation',
      header: 'Utilisation',
      accessor: (row) => `${row.solution.room_utilization_percent}%`,
    },
    {
      id: 'action',
      header: 'Action',
      accessor: (row) =>
        row.solution.hard_violations > 0 ? (
          <span className="text-muted-foreground">Unavailable</span>
        ) : (
          <Button
            variant={row.solution.is_selected ? 'primary' : 'outline'}
            disabled={selecting === row.solution.id || row.solution.is_selected}
            onClick={() => void onSelect(row.solution)}
          >
            {row.solution.is_selected ? 'Current draft' : 'Use this option'}
          </Button>
        ),
    },
  ]

  return (
    <RoleShell>
      <PageHeader
        title="Repair Comparison"
        description="Compare repair options against the current published timetable, then review and publish the selected draft."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/change-review">Change Review</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/publish-timetable">Publish</Link>
            </Button>
          </>
        }
      />
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
          Repair comparison could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          No repair run selected.{' '}
          <Link className="font-medium text-primary" to="/admin/repair-timetable">
            Start a repair
          </Link>
          .
        </p>
      ) : null}
      {state === 'ready' && run ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Run status"
              value={run.status}
              hint={run.message ?? 'Repair run'}
              tint={blocked ? 'amber' : 'green'}
            />
            <MetricCard
              label="Options"
              value={String(run.solutions.length)}
              hint={`${run.alternative_count} requested`}
              tint="blue"
            />
            <MetricCard
              label="Solve time"
              value={run.solve_time_ms != null ? `${run.solve_time_ms} ms` : '—'}
              hint={`${run.time_limit_seconds}s limit`}
              tint="lavender"
            />
          </div>
          {blocked ? (
            <p className="mb-4 rounded-md bg-tint-amber px-3 py-2 text-sm" role="status">
              The disruption could not be cleared without a hard clash.
            </p>
          ) : null}
          <Card>
            <DataTable
              caption="Repair options"
              columns={columns}
              data={rows}
              getRowId={(row) => row.id}
              state={rows.length === 0 ? 'empty' : 'populated'}
              emptyMessage="This repair run stored zero candidate solutions."
            />
          </Card>
        </>
      ) : null}
    </RoleShell>
  )
}
