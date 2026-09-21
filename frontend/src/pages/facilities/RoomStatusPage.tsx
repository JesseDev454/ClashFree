import { useMemo, useState } from 'react'
import { fetchRooms, updateRoom, type RoomRecord } from '../../api/academic'
import { ApiError } from '../../api/client'
import { fetchDisruptions, type DisruptionRecord } from '../../api/disruptions'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'
import { labelFor, ROOM_STATUS_OPTIONS, statusVariant } from '../../lib/academicLabels'
import { disruptionStatusLabel, formatDisruptionWindow } from '../../lib/disruptions'
import type { TableColumn } from '../../types/table'

type RoomStatusRow = RoomRecord & { disruptionLabel: string }

export function RoomStatusPage() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [disruptions, setDisruptions] = useState<DisruptionRecord[]>([])
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [roomId, setRoomId] = useState('')
  const [status, setStatus] = useState('available')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    try {
      const [nextRooms, nextDisruptions] = await Promise.all([
        fetchRooms(),
        fetchDisruptions({ kind: 'room' }),
      ])
      setRooms(nextRooms)
      setDisruptions(nextDisruptions.filter((row) => row.status !== 'repaired'))
      if (!roomId && nextRooms[0]) {
        setRoomId(String(nextRooms[0].id))
        setStatus(nextRooms[0].status)
      }
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const overlay = useMemo(() => {
    const map = new Map<number, DisruptionRecord[]>()
    for (const row of disruptions) {
      if (row.room_id == null) {
        continue
      }
      const current = map.get(row.room_id) ?? []
      current.push(row)
      map.set(row.room_id, current)
    }
    return map
  }, [disruptions])

  const tableRows: RoomStatusRow[] = rooms.map((room) => {
    const matches = overlay.get(room.id) ?? []
    return {
      ...room,
      disruptionLabel: matches.length
        ? matches
            .map((row) => `${row.code} ${disruptionStatusLabel(row.status)}`)
            .join(', ')
        : 'None',
    }
  })

  const columns: TableColumn<RoomStatusRow>[] = [
    { id: 'code', header: 'Room', accessor: (row) => row.code },
    { id: 'building', header: 'Building', accessor: (row) => row.building },
    {
      id: 'status',
      header: 'Catalogue status',
      accessor: (row) => (
        <StatusBadge variant={statusVariant(row.status)}>
          {labelFor(ROOM_STATUS_OPTIONS, row.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'disruptions',
      header: 'Active / scheduled',
      accessor: (row) => row.disruptionLabel,
    },
  ]

  async function onSave() {
    const room = rooms.find((item) => String(item.id) === roomId)
    if (!room) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateRoom(room.id, {
        code: room.code,
        building: room.building,
        room_type: room.room_type,
        capacity: room.capacity,
        equipment: room.equipment,
        status,
      })
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Room status could not be updated.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Room Status"
        description="Operational view of catalogue status plus open and scheduled room disruptions."
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
          Room status could not be loaded.
        </p>
      ) : (
        <>
          <Card className="mb-4 grid gap-3 md:grid-cols-3">
            <Select
              label="Room"
              value={roomId}
              onValueChange={(value) => {
                setRoomId(value)
                const room = rooms.find((item) => String(item.id) === value)
                if (room) {
                  setStatus(room.status)
                }
              }}
              options={rooms.map((room) => ({
                value: String(room.id),
                label: room.code,
              }))}
            />
            <Select
              label="New status"
              value={status}
              onValueChange={setStatus}
              options={ROOM_STATUS_OPTIONS}
            />
            <div className="flex items-end">
              <Button disabled={!roomId || saving} onClick={() => void onSave()}>
                {saving ? 'Saving…' : 'Update status'}
              </Button>
            </div>
          </Card>
          <DataTable
            caption="Room operational status"
            columns={columns}
            data={tableRows}
            getRowId={(row) => String(row.id)}
            state={
              state === 'loading' ? 'loading' : tableRows.length ? 'populated' : 'empty'
            }
            emptyMessage="No rooms in the catalogue."
          />
          <ul className="mt-4 grid gap-1 text-sm text-muted-foreground">
            {disruptions.map((row) => (
              <li key={row.id}>
                {row.code} · {row.resource_label} · {formatDisruptionWindow(row)}
              </li>
            ))}
          </ul>
        </>
      )}
    </RoleShell>
  )
}
