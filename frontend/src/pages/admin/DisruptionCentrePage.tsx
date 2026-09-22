import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  fetchLecturers,
  fetchRooms,
  type LecturerRecord,
  type RoomRecord,
} from '../../api/academic'
import { ApiError } from '../../api/client'
import {
  createDisruption,
  fetchDisruption,
  fetchDisruptions,
  fetchDisruptionSummary,
  patchDisruption,
  type DisruptionRecord,
  type DisruptionSummary,
} from '../../api/disruptions'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { Input } from '../../components/Input'
import { MetricCard } from '../../components/MetricCard'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'
import {
  disruptionKindLabel,
  disruptionStatusLabel,
  disruptionStatusVariant,
  formatDisruptionWindow,
  formatMeeting,
} from '../../lib/disruptions'
import { PERIODS } from '../../lib/schedule'
import type { TableColumn } from '../../types/table'

const emptySummary: DisruptionSummary = {
  active: 0,
  scheduled: 0,
  open: 0,
  in_review: 0,
  room_active: 0,
  lecturer_active: 0,
  classes_affected: 0,
  students_affected: 0,
  published: false,
}

const periodOptions = [
  { value: 'all', label: 'All day' },
  ...PERIODS.map((period) => ({ value: period, label: period })),
]

export function DisruptionCentrePage() {
  const [rows, setRows] = useState<DisruptionRecord[]>([])
  const [summary, setSummary] = useState<DisruptionSummary>(emptySummary)
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [lecturers, setLecturers] = useState<LecturerRecord[]>([])
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<DisruptionRecord | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [kind, setKind] = useState('room')
  const [roomId, setRoomId] = useState('')
  const [lecturerId, setLecturerId] = useState('')
  const [reason, setReason] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [startPeriod, setStartPeriod] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const [nextRows, nextSummary, nextRooms, nextLecturers] = await Promise.all([
        fetchDisruptions(),
        fetchDisruptionSummary(),
        fetchRooms(),
        fetchLecturers(),
      ])
      setRows(nextRows)
      setSummary(nextSummary)
      setRooms(nextRooms)
      setLecturers(nextLecturers)
      setState(nextRows.length ? 'ready' : 'empty')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (kindFilter !== 'all' && row.kind !== kindFilter) {
        return false
      }
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false
      }
      if (!query) {
        return true
      }
      return `${row.code} ${row.resource_label} ${row.reason}`
        .toLowerCase()
        .includes(query)
    })
  }, [kindFilter, rows, search, statusFilter])

  const columns: TableColumn<DisruptionRecord>[] = [
    { id: 'code', header: 'ID', accessor: (row) => row.code },
    { id: 'type', header: 'Type', accessor: (row) => disruptionKindLabel(row.kind) },
    { id: 'resource', header: 'Resource', accessor: (row) => row.resource_label },
    { id: 'reason', header: 'Reason', accessor: (row) => row.reason },
    {
      id: 'window',
      header: 'Window',
      accessor: (row) => formatDisruptionWindow(row),
    },
    {
      id: 'classes',
      header: 'Classes',
      accessor: (row) => String(row.classes_affected),
    },
    {
      id: 'students',
      header: 'Students',
      accessor: (row) => String(row.students_affected),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <StatusBadge variant={disruptionStatusVariant(row.status)}>
          {disruptionStatusLabel(row.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <Button size="sm" variant="outline" onClick={() => void openImpact(row)}>
          Analyze Impact
        </Button>
      ),
    },
  ]

  const canSubmit =
    Boolean(reason.trim()) &&
    Boolean(startsOn) &&
    Boolean(endsOn) &&
    (kind === 'room' ? Boolean(roomId) : Boolean(lecturerId)) &&
    !submitting

  async function openImpact(row: DisruptionRecord) {
    try {
      const detailed = await fetchDisruption(row.id)
      setSelected(detailed)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Impact could not be loaded.')
    }
  }

  async function onRegister() {
    if (!canSubmit) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createDisruption({
        kind,
        room_id: kind === 'room' ? Number(roomId) : null,
        lecturer_id: kind === 'lecturer' ? Number(lecturerId) : null,
        reason: reason.trim(),
        starts_on: startsOn,
        ends_on: endsOn,
        start_period: startPeriod === 'all' ? null : startPeriod,
        end_period: startPeriod === 'all' ? null : startPeriod,
      })
      setRegisterOpen(false)
      setReason('')
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.detail
          : 'Disruption could not be registered.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function acknowledge(row: DisruptionRecord) {
    try {
      await patchDisruption(row.id, { status: 'in_review' })
      await load()
      if (selected?.id === row.id) {
        const detailed = await fetchDisruption(row.id)
        setSelected(detailed)
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Could not acknowledge disruption.',
      )
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Disruption Centre"
        description="Room closures and lecturer unavailability after publication. Repair one open disruption from the published timetable."
        actions={
          <>
            <Button onClick={() => setRegisterOpen(true)}>Register Disruption</Button>
            <Button variant="outline" asChild>
              <Link
                to={
                  selected &&
                  (selected.status === 'open' || selected.status === 'in_review')
                    ? `/admin/repair-timetable?disruptionId=${selected.id}`
                    : '/admin/repair-timetable'
                }
              >
                Repair Timetable
              </Link>
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
          Disruptions could not be loaded.
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Active"
              value={String(summary.active)}
              hint="Open and in review"
              tint="rose"
            />
            <MetricCard
              label="Scheduled"
              value={String(summary.scheduled)}
              hint="Future windows"
              tint="blue"
            />
            <MetricCard
              label="Classes Affected"
              value={String(summary.classes_affected)}
              hint={
                summary.published
                  ? 'Current published timetable'
                  : 'No published timetable'
              }
              tint="amber"
            />
            <MetricCard
              label="Students Affected"
              value={String(summary.students_affected)}
              hint="Unique cohorts"
              tint="purple"
            />
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Input
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              label="Type"
              value={kindFilter}
              onValueChange={setKindFilter}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'room', label: 'Room' },
                { value: 'lecturer', label: 'Lecturer' },
              ]}
            />
            <Select
              label="Status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'open', label: 'Open' },
                { value: 'in_review', label: 'In review' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'repaired', label: 'Repaired' },
              ]}
            />
          </div>
          <DataTable
            caption="Disruptions"
            columns={columns}
            data={filtered}
            getRowId={(row) => String(row.id)}
            state={
              state === 'loading' ? 'loading' : filtered.length ? 'populated' : 'empty'
            }
            emptyMessage="No disruptions match the current filters."
          />
        </>
      )}
      {selected ? (
        <Card className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[0.95rem] font-semibold">
              Impact · {selected.code} · {selected.resource_label}
            </h2>
            {selected.status === 'open' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void acknowledge(selected)}
              >
                Mark in review
              </Button>
            ) : null}
          </div>
          {selected.impact && !selected.impact.published ? (
            <p className="mb-3 text-sm text-muted-foreground">
              No published timetable — impact unknown.
            </p>
          ) : null}
          <ul className="grid gap-2 text-sm">
            {(selected.impact?.classes ?? []).map((item) => (
              <li key={`${item.assignment_id}-${item.meeting_index}`}>
                {item.course_code} ·{' '}
                {formatMeeting(item.weekday, item.start_period, item.end_period)} ·{' '}
                {item.room_code} · {item.lecturer_name} · {item.cohort_code}
              </li>
            ))}
          </ul>
          {selected.impact?.classes_affected === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published classes overlap this window.
            </p>
          ) : null}
        </Card>
      ) : null}
      <p className="mt-4 rounded-xl border border-border bg-tint-blue px-4 py-3 text-sm text-muted-foreground">
        Submitting a disruption alerts the administrator here. Repair Timetable moves the
        classes that clash with one open disruption.{' '}
        <Link className="font-medium text-primary" to="/admin/master-timetable">
          Master Timetable
        </Link>{' '}
        still shows the published snapshot until a repair is applied.
      </p>
      <Modal
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        title="Register Disruption"
        description="Record a room closure or lecturer unavailability for the active session."
      >
        <div className="grid gap-3">
          <Select
            label="Type"
            value={kind}
            onValueChange={setKind}
            options={[
              { value: 'room', label: 'Room' },
              { value: 'lecturer', label: 'Lecturer' },
            ]}
          />
          {kind === 'room' ? (
            <Select
              label="Room"
              value={roomId}
              onValueChange={setRoomId}
              options={rooms.map((room) => ({
                value: String(room.id),
                label: room.code,
              }))}
            />
          ) : (
            <Select
              label="Lecturer"
              value={lecturerId}
              onValueChange={setLecturerId}
              options={lecturers.map((row) => ({
                value: String(row.id),
                label: row.full_name,
              }))}
            />
          )}
          <Input
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Input
            label="Start date"
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
          <Input
            label="End date"
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
          <Select
            label="Period"
            value={startPeriod}
            onValueChange={setStartPeriod}
            options={periodOptions}
          />
          <Button disabled={!canSubmit} onClick={() => void onRegister()}>
            {submitting ? 'Saving…' : 'Register Disruption'}
          </Button>
        </div>
      </Modal>
    </RoleShell>
  )
}
