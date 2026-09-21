import { useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import {
  createDisruption,
  fetchDisruptions,
  previewDisruption,
  type DisruptionImpact,
  type DisruptionRecord,
} from '../../api/disruptions'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'
import {
  disruptionStatusLabel,
  disruptionStatusVariant,
  formatDisruptionWindow,
  formatMeeting,
} from '../../lib/disruptions'
import { PERIODS } from '../../lib/schedule'
import type { TableColumn } from '../../types/table'

const periodOptions = [
  { value: 'all', label: 'All day' },
  ...PERIODS.map((period) => ({ value: period, label: period })),
]

export function ReportUnavailabilityPage() {
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [startPeriod, setStartPeriod] = useState('all')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [impact, setImpact] = useState<DisruptionImpact | null>(null)
  const [recent, setRecent] = useState<DisruptionRecord[]>([])
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    try {
      setRecent(await fetchDisruptions())
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const canSubmit = Boolean(startsOn && endsOn && reason.trim()) && !submitting

  async function loadPreview() {
    if (!startsOn || !endsOn) {
      setImpact(null)
      return
    }
    try {
      setImpact(
        await previewDisruption({
          kind: 'lecturer',
          reason: reason.trim() || 'Preview',
          description: note,
          starts_on: startsOn,
          ends_on: endsOn,
          start_period: startPeriod === 'all' ? null : startPeriod,
          end_period: startPeriod === 'all' ? null : startPeriod,
        }),
      )
    } catch {
      setImpact(null)
    }
  }

  async function onSubmit() {
    if (!canSubmit) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createDisruption({
        kind: 'lecturer',
        reason: reason.trim(),
        description: note.trim() || null,
        starts_on: startsOn,
        ends_on: endsOn,
        start_period: startPeriod === 'all' ? null : startPeriod,
        end_period: startPeriod === 'all' ? null : startPeriod,
      })
      setReason('')
      setNote('')
      await load()
      await loadPreview()
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Report could not be submitted.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const columns: TableColumn<DisruptionRecord>[] = useMemo(
    () => [
      { id: 'code', header: 'ID', accessor: (row) => row.code },
      { id: 'reason', header: 'Reason', accessor: (row) => row.reason },
      { id: 'window', header: 'Window', accessor: (row) => formatDisruptionWindow(row) },
      {
        id: 'status',
        header: 'Status',
        accessor: (row) => (
          <StatusBadge variant={disruptionStatusVariant(row.status)}>
            {disruptionStatusLabel(row.status)}
          </StatusBadge>
        ),
      },
    ],
    [],
  )

  return (
    <RoleShell>
      <PageHeader
        title="Report Unavailability"
        description="Temporary absence after scheduling becomes a lecturer disruption for the administrator. This is separate from planned availability exceptions."
        actions={
          <Button disabled={!canSubmit} onClick={() => void onSubmit()}>
            {submitting ? 'Submitting…' : 'Submit Report'}
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
          Unavailability reports could not be loaded.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-5">
            <div className="grid gap-3">
              <Input
                label="Start date"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
                onBlur={() => void loadPreview()}
              />
              <Input
                label="End date"
                type="date"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
                onBlur={() => void loadPreview()}
              />
              <Select
                label="Period"
                value={startPeriod}
                onValueChange={(value) => {
                  setStartPeriod(value)
                  window.setTimeout(() => void loadPreview(), 0)
                }}
                options={periodOptions}
              />
              <Input
                label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <Input
                label="Additional note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </Card>
          <Card className="xl:col-span-7">
            <h2 className="mb-3 text-[0.95rem] font-semibold">Predicted impact</h2>
            {impact && !impact.published ? (
              <p className="text-sm text-muted-foreground">
                No published timetable — impact unknown.
              </p>
            ) : null}
            <ul className="grid gap-2 text-sm">
              {(impact?.classes ?? []).map((item) => (
                <li key={`${item.assignment_id}-${item.meeting_index}`}>
                  {item.course_code} ·{' '}
                  {formatMeeting(item.weekday, item.start_period, item.end_period)} ·{' '}
                  {item.cohort_code} · {item.cohort_size} students
                </li>
              ))}
            </ul>
            {impact && impact.classes_affected === 0 ? (
              <p className="text-sm text-muted-foreground">
                No published classes overlap this window.
              </p>
            ) : null}
            <p className="mt-4 text-sm text-muted-foreground">
              Submitting creates a lecturer disruption for the Timetable Administrator to
              review. It does not rewrite your planned weekly availability.
            </p>
          </Card>
        </div>
      )}
      <Card className="mt-4">
        <h2 className="mb-3 text-[0.95rem] font-semibold">Recent reports</h2>
        <DataTable
          caption="Recent unavailability reports"
          columns={columns}
          data={recent}
          getRowId={(row) => String(row.id)}
          state={state === 'loading' ? 'loading' : recent.length ? 'populated' : 'empty'}
          emptyMessage="You have not reported unavailability yet."
        />
      </Card>
    </RoleShell>
  )
}
