import { useState, type FormEvent } from 'react'
import {
  createRoom,
  deleteRoom,
  fetchRooms,
  updateRoom,
  type RoomRecord,
} from '../../api/academic'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { ChartCard } from '../../components/ChartCard'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import {
  ROOM_STATUS_OPTIONS,
  ROOM_TYPE_OPTIONS,
  labelFor,
  statusVariant,
} from '../../lib/academicLabels'
import type { TableColumn } from '../../types/table'
import { useReload } from '../../hooks/useReload'
import { AdminCrudShell } from './AdminCrudShell'

type RoomForm = {
  code: string
  building: string
  room_type: string
  capacity: string
  equipment: string
  status: string
}

const emptyForm: RoomForm = {
  code: '',
  building: '',
  room_type: 'lecture_hall',
  capacity: '80',
  equipment: '',
  status: 'available',
}

export function RoomsFacilitiesPage() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [buildings, setBuildings] = useState<string[]>([])
  const [tableState, setTableState] = useState<
    'loading' | 'empty' | 'error' | 'populated'
  >('loading')
  const [query, setQuery] = useState('')
  const [buildingFilter, setBuildingFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RoomRecord | null>(null)
  const [form, setForm] = useState<RoomForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<RoomRecord | null>(null)

  async function load() {
    setTableState('loading')
    try {
      const rows = await fetchRooms({
        q: query,
        building: buildingFilter === 'all' ? undefined : buildingFilter,
        room_type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      setRooms(rows)
      if (buildingFilter === 'all') {
        setBuildings(Array.from(new Set(rows.map((room) => room.building))).sort())
      }
      setTableState(rows.length === 0 ? 'empty' : 'populated')
    } catch {
      setTableState('error')
    }
  }

  useReload(load, [query, buildingFilter, typeFilter, statusFilter])

  const byType = ROOM_TYPE_OPTIONS.map((option) => ({
    label: option.label,
    value: rooms.filter((room) => room.room_type === option.value).length,
  }))

  const columns: TableColumn<RoomRecord>[] = [
    { id: 'code', header: 'Room', accessor: (row) => row.code },
    { id: 'building', header: 'Building', accessor: (row) => row.building },
    {
      id: 'type',
      header: 'Type',
      accessor: (row) => labelFor(ROOM_TYPE_OPTIONS, row.room_type),
    },
    { id: 'capacity', header: 'Capacity', accessor: (row) => String(row.capacity) },
    { id: 'equipment', header: 'Equipment', accessor: (row) => row.equipment || '—' },
    { id: 'util', header: 'Utilisation', accessor: () => '—' },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <StatusBadge variant={statusVariant(row.status)}>
          {labelFor(ROOM_STATUS_OPTIONS, row.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(row)
              setForm({
                code: row.code,
                building: row.building,
                room_type: row.room_type,
                capacity: String(row.capacity),
                equipment: row.equipment ?? '',
                status: row.status,
              })
              setFormError(null)
              setModalOpen(true)
            }}
          >
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setPendingDelete(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.code.trim() || !form.building.trim()) {
      setFormError('Enter a room code and building.')
      return
    }
    const body = {
      code: form.code.trim(),
      building: form.building.trim(),
      room_type: form.room_type,
      capacity: Number(form.capacity),
      equipment: form.equipment.trim() || null,
      status: form.status,
    }
    try {
      if (editing) {
        await updateRoom(editing.id, body)
      } else {
        await createRoom(body)
      }
      setModalOpen(false)
      await load()
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.detail : 'Could not save the room')
    }
  }

  return (
    <AdminCrudShell
      title="Rooms & Facilities"
      description="Manage teaching spaces, capacities, equipment, recurring availability, and operational status."
      actions={
        <Button
          onClick={() => {
            setEditing(null)
            setForm(emptyForm)
            setFormError(null)
            setModalOpen(true)
          }}
        >
          + Add Room
        </Button>
      }
      metrics={[
        {
          id: 'total',
          label: 'Total Rooms',
          value: String(rooms.length),
          hint: 'All teaching spaces',
          tint: 'blue',
        },
        {
          id: 'available',
          label: 'Available',
          value: String(rooms.filter((room) => room.status === 'available').length),
          hint: 'Currently schedulable',
          tint: 'green',
        },
        {
          id: 'unavailable',
          label: 'Unavailable',
          value: String(rooms.filter((room) => room.status === 'unavailable').length),
          hint: 'Require repair',
          tint: 'rose',
        },
        {
          id: 'util',
          label: 'Avg Utilisation',
          value: '—',
          hint: 'Available after a timetable exists',
          tint: 'purple',
        },
      ]}
      extras={
        <div className="mb-4">
          <ChartCard kind="bar" title="Rooms by type" data={byType} />
        </div>
      }
      filters={[
        {
          id: 'room-search',
          type: 'search',
          label: 'Search',
          value: query,
          placeholder: 'Search rooms…',
          onChange: setQuery,
        },
        {
          id: 'room-building',
          type: 'select',
          label: 'Building',
          value: buildingFilter,
          options: [
            { value: 'all', label: 'All buildings' },
            ...buildings.map((building) => ({ value: building, label: building })),
          ],
          onChange: setBuildingFilter,
        },
        {
          id: 'room-type',
          type: 'select',
          label: 'Type',
          value: typeFilter,
          options: [{ value: 'all', label: 'All room types' }, ...ROOM_TYPE_OPTIONS],
          onChange: setTypeFilter,
        },
        {
          id: 'room-status',
          type: 'select',
          label: 'Status',
          value: statusFilter,
          options: [{ value: 'all', label: 'All statuses' }, ...ROOM_STATUS_OPTIONS],
          onChange: setStatusFilter,
        },
      ]}
      onResetFilters={() => {
        setQuery('')
        setBuildingFilter('all')
        setTypeFilter('all')
        setStatusFilter('all')
      }}
    >
      <DataTable
        caption="Rooms and facilities"
        columns={columns}
        data={rooms}
        getRowId={(row) => String(row.id)}
        state={tableState}
      />
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit room' : 'Add room'}
      >
        <form className="grid gap-3" onSubmit={(event) => void onSubmit(event)}>
          {formError ? (
            <p
              className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          <Input
            label="Code"
            value={form.code}
            onChange={(event) =>
              setForm((current) => ({ ...current, code: event.target.value }))
            }
          />
          <Input
            label="Building"
            value={form.building}
            onChange={(event) =>
              setForm((current) => ({ ...current, building: event.target.value }))
            }
          />
          <Select
            label="Type"
            value={form.room_type}
            options={ROOM_TYPE_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, room_type: value }))
            }
          />
          <Input
            label="Capacity"
            type="number"
            value={form.capacity}
            onChange={(event) =>
              setForm((current) => ({ ...current, capacity: event.target.value }))
            }
          />
          <Input
            label="Equipment"
            value={form.equipment}
            onChange={(event) =>
              setForm((current) => ({ ...current, equipment: event.target.value }))
            }
          />
          <Select
            label="Status"
            value={form.status}
            options={ROOM_STATUS_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, status: value }))
            }
          />
          <Button type="submit">{editing ? 'Save room' : 'Create room'}</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete this room?"
        description="This removes the room from the catalogue."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) void deleteRoom(pendingDelete.id).then(() => load())
        }}
      />
    </AdminCrudShell>
  )
}
