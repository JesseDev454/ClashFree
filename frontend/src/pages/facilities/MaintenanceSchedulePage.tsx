import { useState } from 'react'
import { fetchRooms, type RoomRecord } from '../../api/academic'
import { ApiError } from '../../api/client'
import {
  createDisruption,
  fetchDisruptions,
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
} from '../../lib/disruptions'
import { PERIODS } from '../../lib/schedule'
import type { TableColumn } from '../../types/table'

const periodOptions = [
  { value: 'all', label: 'All day' },
  ...PERIODS.map((period) => ({ value: period, label: period })),
]

export function MaintenanceSchedulePage() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [rows, setRows] = useState<DisruptionRecord[]>([])
  const [roomId, setRoomId] = useState('')
  const [reason, setReason] = useState('Scheduled maintenance')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [startPeriod, setStartPeriod] = useState('all')
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    try {
      const [nextRooms, nextRows] = await Promise.all([
        fetchRooms(),
        fetchDisruptions({ kind: 'room', status: 'scheduled' }),
      ])
      setRooms(nextRooms)
      setRows(nextRows)
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

  async function onSchedule() {
    if (!canSubmit) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createDisruption({
        kind: 'room',
        room_id: Number(roomId),
        reason: reason.trim(),
        starts_on: startsOn,
        ends_on: endsOn,
        start_period: startPeriod === 'all' ? null : startPeriod,
        end_period: startPeriod === 'all' ? null : startPeriod,
        create_block: true,
      })
      setReason('Scheduled maintenance')
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.detail
          : 'Maintenance could not be scheduled.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const columns: TableColumn<DisruptionRecord>[] = [
    { id: 'code', header: 'ID', accessor: (row) => row.code },
    { id: 'room', header: 'Room', accessor: (row) => row.resource_label },
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
  ]

  return (
    <RoleShell>
      <PageHeader
        title="Maintenance Schedule"
        description="Plan room closures in advance. Scheduling writes a disruption and a room availability block so a later generate can avoid the room."
        actions={
          <Button disabled={!canSubmit} onClick={() => void onSchedule()}>
            {submitting ? 'Scheduling…' : 'Schedule Maintenance'}
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
          Maintenance schedule could not be loaded.
        </p>
      ) : (
        <>
          <Card className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Select
              label="Room"
              value={roomId}
              onValueChange={setRoomId}
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
          </Card>
          <DataTable
            caption="Scheduled maintenance"
            columns={columns}
            data={rows}
            getRowId={(row) => String(row.id)}
            state={state === 'loading' ? 'loading' : rows.length ? 'populated' : 'empty'}
            emptyMessage="No scheduled room disruptions."
          />
        </>
      )}
    </RoleShell>
  )
}
