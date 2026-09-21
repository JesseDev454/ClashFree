import { useState } from 'react'
import { Link } from 'react-router'
import { fetchRooms, type RoomRecord } from '../../api/academic'
import { ApiError } from '../../api/client'
import {
  createDisruption,
  previewDisruption,
  type DisruptionImpact,
} from '../../api/disruptions'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'
import { formatMeeting } from '../../lib/disruptions'
import { PERIODS } from '../../lib/schedule'

const periodOptions = [
  { value: 'all', label: 'All day' },
  ...PERIODS.map((period) => ({ value: period, label: period })),
]

const severityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export function ReportDisruptionPage() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [roomId, setRoomId] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [startPeriod, setStartPeriod] = useState('all')
  const [impact, setImpact] = useState<DisruptionImpact | null>(null)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)

  async function load() {
    setState('loading')
    try {
      const nextRooms = await fetchRooms()
      setRooms(nextRooms)
      if (!roomId && nextRooms[0]) {
        setRoomId(String(nextRooms[0].id))
      }
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const canSubmit = Boolean(roomId && reason.trim() && startsOn && endsOn) && !submitting

  async function loadPreview() {
    if (!roomId || !startsOn || !endsOn) {
      setImpact(null)
      return
    }
    try {
      setImpact(
        await previewDisruption({
          kind: 'room',
          room_id: Number(roomId),
          reason: reason.trim() || 'Preview',
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
      const created = await createDisruption({
        kind: 'room',
        room_id: Number(roomId),
        reason: reason.trim(),
        description: description.trim() || null,
        severity,
        starts_on: startsOn,
        ends_on: endsOn,
        start_period: startPeriod === 'all' ? null : startPeriod,
        end_period: startPeriod === 'all' ? null : startPeriod,
      })
      setCreatedId(created.id)
      setReason('')
      await loadPreview()
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Disruption could not be reported.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Report Disruption"
        description="Record a room outage or closure. Submitting does not reschedule classes; it alerts the administrator."
        actions={
          <Button disabled={!canSubmit} onClick={() => void onSubmit()}>
            {submitting ? 'Reporting…' : 'Report Disruption'}
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
          Rooms could not be loaded.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-5">
            <div className="grid gap-3">
              <Select
                label="Room"
                value={roomId}
                onValueChange={(value) => {
                  setRoomId(value)
                  window.setTimeout(() => void loadPreview(), 0)
                }}
                options={rooms.map((room) => ({
                  value: String(room.id),
                  label: room.code,
                }))}
              />
              <Input
                label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <Select
                label="Severity"
                value={severity}
                onValueChange={setSeverity}
                options={severityOptions}
              />
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
                label="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </Card>
          <Card className="xl:col-span-7">
            <h2 className="mb-3 text-[0.95rem] font-semibold">Detected impact</h2>
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
                  {item.cohort_code} · {item.lecturer_name}
                </li>
              ))}
            </ul>
            {impact && impact.classes_affected === 0 ? (
              <p className="text-sm text-muted-foreground">
                No published classes overlap this window.
              </p>
            ) : null}
            <p className="mt-4 text-sm text-muted-foreground">
              Facilities reports. Administrators repair and publish. This form does not
              move classes.
            </p>
            {createdId ? (
              <p className="mt-3 text-sm">
                Reported.{' '}
                <Link
                  className="font-medium text-primary"
                  to={`/facilities/affected-classes?disruptionId=${createdId}`}
                >
                  View affected classes
                </Link>
              </p>
            ) : null}
          </Card>
        </div>
      )}
    </RoleShell>
  )
}
