import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import {
  fetchDisruption,
  fetchDisruptions,
  type DisruptionRecord,
} from '../../api/disruptions'
import { fetchPublished, repairTimetable } from '../../api/timetables'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'

const TIME_LIMITS = [
  { value: '10', label: '10 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '120', label: '2 minutes' },
]
const ALTERNATIVES = [
  { value: '1', label: '1 candidate' },
  { value: '2', label: '2 candidates' },
  { value: '3', label: '3 candidates' },
]

function repairableRows(rows: DisruptionRecord[]) {
  return rows
    .filter((row) => row.status === 'open' || row.status === 'in_review')
    .sort((left, right) => right.id - left.id)
}

export function RepairTimetablePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<DisruptionRecord[]>([])
  const [detail, setDetail] = useState<DisruptionRecord | null>(null)
  const [published, setPublished] = useState(false)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [disruptionId, setDisruptionId] = useState('')
  const [timeLimit, setTimeLimit] = useState('10')
  const [alternatives, setAlternatives] = useState('1')
  const [repairing, setRepairing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const [version, disruptions] = await Promise.all([
        fetchPublished(),
        fetchDisruptions(),
      ])
      const openRows = repairableRows(disruptions)
      setPublished(version != null)
      setRows(openRows)
      if (version == null || openRows.length === 0) {
        setDetail(null)
        setDisruptionId('')
        setState('empty')
        return
      }
      const requested = searchParams.get('disruptionId')
      const chosen = openRows.find((row) => String(row.id) === requested) ?? openRows[0]
      setDisruptionId(String(chosen.id))
      setDetail(await fetchDisruption(chosen.id))
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  async function onPick(value: string) {
    setDisruptionId(value)
    setSearchParams({ disruptionId: value })
    setError(null)
    try {
      setDetail(await fetchDisruption(Number(value)))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Impact could not be loaded')
    }
  }

  const startDisabled = state !== 'ready' || disruptionId === '' || repairing

  async function onRepair() {
    if (startDisabled) {
      return
    }
    setRepairing(true)
    setError(null)
    try {
      const run = await repairTimetable({
        disruption_id: Number(disruptionId),
        time_limit_seconds: Number(timeLimit),
        alternative_count: Number(alternatives),
      })
      void navigate(`/admin/repair-comparison?runId=${run.id}`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Repair could not be started')
      setRepairing(false)
    }
  }

  const emptyMessage = published
    ? 'No open or in-review disruption can be repaired.'
    : 'Nothing is published yet. Publish a timetable before repairing a disruption.'

  return (
    <RoleShell>
      <PageHeader
        title="Repair Timetable"
        description="Re-solve the published grid with one disruption forbidden, keeping unaffected classes as stable as the solver allows."
        actions={
          <Button onClick={() => void onRepair()} disabled={startDisabled}>
            {repairing ? 'Repairing…' : 'Start Repair'}
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
          Repair options could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          {emptyMessage}{' '}
          <Link className="font-medium text-primary" to="/admin/disruption-centre">
            Disruption Centre
          </Link>
        </p>
      ) : null}
      {state === 'ready' && detail ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Disruption"
              value={detail.code}
              hint={detail.reason}
              tint="amber"
            />
            <MetricCard
              label="Classes affected"
              value={String(detail.impact?.classes_affected ?? detail.classes_affected)}
              hint={detail.resource_label}
              tint="rose"
            />
            <MetricCard
              label="Students affected"
              value={String(detail.impact?.students_affected ?? detail.students_affected)}
              hint={`${detail.starts_on} – ${detail.ends_on}`}
              tint="blue"
            />
            <MetricCard
              label="Status"
              value={detail.status.replace('_', ' ')}
              hint={detail.kind}
              tint="lavender"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <h2 className="mb-3 text-base font-semibold">Impact</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                <StatusBadge variant="warning">
                  {detail.status.replace('_', ' ')}
                </StatusBadge>{' '}
                {detail.resource_label} is unavailable for this window. Affected meetings
                must leave that resource; other meetings stay put when the solver can keep
                them.
              </p>
              <ul className="grid gap-2 text-sm">
                {(detail.impact?.classes ?? []).map((item) => (
                  <li key={`${item.assignment_id}-${item.meeting_index}`}>
                    {item.course_code} · {item.weekday} {item.start_period} ·{' '}
                    {item.room_code}
                  </li>
                ))}
              </ul>
              {detail.impact?.classes_affected === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No published classes overlap this window.
                </p>
              ) : null}
            </Card>
            <Card>
              <h2 className="mb-3 text-base font-semibold">Repair configuration</h2>
              <div className="grid gap-3">
                <Select
                  label="Disruption"
                  value={disruptionId}
                  onValueChange={(value) => void onPick(value)}
                  options={rows.map((row) => ({
                    value: String(row.id),
                    label: `${row.code} · ${row.reason}`,
                  }))}
                />
                <Select
                  label="Time limit"
                  value={timeLimit}
                  onValueChange={setTimeLimit}
                  options={TIME_LIMITS}
                />
                <Select
                  label="Alternatives"
                  value={alternatives}
                  onValueChange={setAlternatives}
                  options={ALTERNATIVES}
                />
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </RoleShell>
  )
}
