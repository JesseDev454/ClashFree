import { useState } from 'react'
import { Link } from 'react-router'
import {
  fetchConflicts,
  fetchTimetableRuns,
  selectSolution,
  type TimetableConflict,
  type TimetableRun,
  type TimetableSolution,
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

const PERFORMANCE = [
  { kind: 'lecturer', name: 'No lecturer clash', hard: true },
  { kind: 'room', name: 'No room clash', hard: true },
  { kind: 'cohort', name: 'No cohort clash', hard: true },
  { kind: 'capacity', name: 'Capacity / room type', hard: true },
  { kind: 'availability', name: 'Availability windows', hard: true },
  { kind: 'preference', name: 'Lecturer preferences', hard: false },
  { kind: 'idle_gap', name: 'Student idle gaps', hard: false },
  { kind: 'balance', name: 'Daily balance', hard: false },
  { kind: 'movement', name: 'Building movement', hard: false },
  { kind: 'utilization', name: 'Room utilization', hard: false },
]

type PerformanceRow = {
  id: string
  name: string
  result: string
}

const performanceColumns: TableColumn<PerformanceRow>[] = [
  { id: 'name', header: 'Constraint', accessor: (row) => row.name },
  { id: 'result', header: 'Result', accessor: (row) => row.result },
]

function selectedOf(run: TimetableRun): TimetableSolution | undefined {
  return run.solutions.find((item) => item.is_selected) ?? run.solutions[0]
}

function performanceRows(conflicts: TimetableConflict[]): PerformanceRow[] {
  return PERFORMANCE.map((item) => {
    const hits = conflicts.filter((row) => row.kind === item.kind)
    let result = 'Pass'
    if (hits.length > 0) {
      result = item.hard ? 'Fail' : 'Soft'
    }
    return { id: item.kind, name: item.name, result }
  })
}

export function GenerationResultsPage() {
  const [run, setRun] = useState<TimetableRun | null>(null)
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([])
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<number | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const runs = await fetchTimetableRuns()
      const latest = runs[0]
      if (!latest) {
        setRun(null)
        setConflicts([])
        setState('empty')
        return
      }
      setRun(latest)
      const chosen = selectedOf(latest)
      setConflicts(chosen ? await fetchConflicts(chosen.id) : [])
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const selected = run ? selectedOf(run) : undefined
  const infeasible = run?.status === 'infeasible' || run?.status === 'failed'

  async function onSelect(solution: TimetableSolution) {
    setSelecting(solution.id)
    setError(null)
    try {
      await selectSolution(solution.id)
      const refreshed = await fetchTimetableRuns()
      const latest = refreshed[0]
      setRun(latest ?? run)
      setConflicts(await fetchConflicts(solution.id))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Could not select that draft')
    } finally {
      setSelecting(null)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Generation Results"
        description="Inspect CP-SAT candidates for the latest run. Selecting a solution makes it the working draft."
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/generate-timetable">Generate again</Link>
          </Button>
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
          Generation results could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          No generation run yet.{' '}
          <Link className="font-medium text-primary" to="/admin/generate-timetable">
            Generate a timetable
          </Link>{' '}
          to see candidates.
        </p>
      ) : null}
      {state === 'ready' && run ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Run status"
              value={run.status}
              hint={run.message ?? 'Latest solver run'}
              tint={run.status === 'feasible' ? 'green' : 'amber'}
            />
            <MetricCard
              label="Solve time"
              value={run.solve_time_ms != null ? `${run.solve_time_ms} ms` : '—'}
              hint={`${run.time_limit_seconds}s limit`}
              tint="blue"
            />
            <MetricCard
              label="Soft penalty"
              value={selected ? String(selected.soft_penalty) : '—'}
              hint="Selected candidate"
              tint="lavender"
            />
            <MetricCard
              label="Hard violations"
              value={selected ? String(selected.hard_violations) : '0'}
              hint="Must stay at zero"
              tint="rose"
            />
          </div>
          {infeasible ? (
            <p className="mb-4 rounded-md bg-tint-amber px-3 py-2 text-sm" role="status">
              {run.message ?? 'No feasible timetable was found.'}
            </p>
          ) : null}
          {run.solutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This run stored zero candidate solutions.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {run.solutions.map((solution) => (
                <Card key={solution.id}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold">
                      Candidate {solution.label}
                    </h2>
                    {solution.is_selected ? (
                      <StatusBadge variant="success">Draft</StatusBadge>
                    ) : (
                      <StatusBadge>Optional</StatusBadge>
                    )}
                  </div>
                  <ul className="mb-4 grid gap-1 text-sm text-muted-foreground">
                    <li>Objective {solution.objective}</li>
                    <li>Soft penalty {solution.soft_penalty}</li>
                    <li>Room use {solution.room_utilization_percent}%</li>
                    <li>Student gaps {solution.student_gap_hours}h</li>
                  </ul>
                  <Button
                    className="w-full"
                    variant={solution.is_selected ? 'primary' : 'outline'}
                    disabled={selecting === solution.id || solution.is_selected}
                    onClick={() => void onSelect(solution)}
                  >
                    {solution.is_selected ? 'Current draft' : 'Use as draft'}
                  </Button>
                </Card>
              ))}
            </div>
          )}
          <Card className="mt-4">
            <h2 className="mb-3 text-base font-semibold">Constraint performance</h2>
            <DataTable
              caption="Constraint performance for the selected draft"
              columns={performanceColumns}
              data={performanceRows(conflicts)}
              getRowId={(row) => row.id}
            />
          </Card>
        </>
      ) : null}
    </RoleShell>
  )
}
