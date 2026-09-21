import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  fetchDisruption,
  fetchDisruptions,
  type DisruptionImpactClass,
  type DisruptionRecord,
} from '../../api/disruptions'
import { Card } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'
import { formatDisruptionWindow, formatMeeting } from '../../lib/disruptions'
import type { TableColumn } from '../../types/table'

const columns: TableColumn<DisruptionImpactClass>[] = [
  { id: 'course', header: 'Course', accessor: (row) => row.course_code ?? '—' },
  { id: 'title', header: 'Title', accessor: (row) => row.course_title ?? '—' },
  { id: 'cohort', header: 'Cohort', accessor: (row) => row.cohort_code ?? '—' },
  {
    id: 'when',
    header: 'Time',
    accessor: (row) => formatMeeting(row.weekday, row.start_period, row.end_period),
  },
  { id: 'room', header: 'Room', accessor: (row) => row.room_code ?? '—' },
  { id: 'lecturer', header: 'Lecturer', accessor: (row) => row.lecturer_name ?? '—' },
]

export function AffectedClassesPage() {
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState<DisruptionRecord[]>([])
  const [selected, setSelected] = useState<DisruptionRecord | null>(null)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)
  const selectedId = params.get('disruptionId')

  async function load() {
    setState('loading')
    setError(null)
    try {
      const list = await fetchDisruptions({ kind: 'room' })
      setRows(list)
      const preferred =
        (selectedId ? list.find((row) => String(row.id) === selectedId) : undefined) ??
        list.find((row) => row.status === 'open') ??
        list[0]
      if (!preferred) {
        setSelected(null)
        setState('empty')
        return
      }
      const detailed = await fetchDisruption(preferred.id)
      setSelected(detailed)
      if (!selectedId) {
        setParams({ disruptionId: String(preferred.id) }, { replace: true })
      }
      setState('ready')
    } catch {
      setState('error')
      setError('Affected classes could not be loaded.')
    }
  }

  useReload(load, [selectedId])

  const classes = selected?.impact?.classes ?? []
  const options = useMemo(
    () =>
      rows.map((row) => ({
        value: String(row.id),
        label: `${row.code} · ${row.resource_label}`,
      })),
    [rows],
  )

  return (
    <RoleShell>
      <PageHeader
        title="Affected Classes"
        description="Classes, lecturers and cohorts that depend on a disrupted room. Facilities cannot move classes."
      />
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          {error ?? 'Affected classes could not be loaded.'}
        </p>
      ) : state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          No room disruptions have been reported.
        </p>
      ) : (
        <>
          <div className="mb-4 max-w-md">
            <Select
              label="Disruption"
              value={selectedId ?? ''}
              onValueChange={(value) => setParams({ disruptionId: value })}
              options={options}
            />
          </div>
          {selected ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {selected.resource_label} · {formatDisruptionWindow(selected)}
                {selected.impact && !selected.impact.published
                  ? ' · No published timetable — impact unknown.'
                  : ''}
              </p>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard
                  label="Classes"
                  value={String(selected.classes_affected)}
                  hint="Published meetings"
                  tint="amber"
                />
                <MetricCard
                  label="Students"
                  value={String(selected.students_affected)}
                  hint="Unique cohorts"
                  tint="rose"
                />
                <MetricCard
                  label="Room"
                  value={selected.resource_label}
                  hint={selected.reason}
                  tint="blue"
                />
              </div>
              <Card>
                <DataTable
                  caption="Affected classes"
                  columns={columns}
                  data={classes}
                  getRowId={(row) => `${row.assignment_id}-${row.meeting_index}`}
                  state={classes.length ? 'populated' : 'empty'}
                  emptyMessage="No published classes overlap this disruption."
                />
              </Card>
            </>
          ) : null}
        </>
      )}
    </RoleShell>
  )
}
