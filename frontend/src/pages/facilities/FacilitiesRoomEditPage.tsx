import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { createRoom, deleteRoom, fetchRooms, updateRoom } from '../../api/academic'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'
import { ROOM_STATUS_OPTIONS, ROOM_TYPE_OPTIONS } from '../../lib/academicLabels'

export function FacilitiesRoomEditPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const roomId = Number(params.get('id') || 0)
  const editing = roomId > 0
  const [code, setCode] = useState('')
  const [building, setBuilding] = useState('')
  const [roomType, setRoomType] = useState('lecture_hall')
  const [capacity, setCapacity] = useState('80')
  const [equipment, setEquipment] = useState('')
  const [status, setStatus] = useState('available')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useReload(async () => {
    if (!editing) {
      return
    }
    try {
      const rooms = await fetchRooms()
      const room = rooms.find((item) => item.id === roomId)
      if (!room) {
        setError('That room was not found.')
        return
      }
      setCode(room.code)
      setBuilding(room.building)
      setRoomType(room.room_type)
      setCapacity(String(room.capacity))
      setEquipment(room.equipment ?? '')
      setStatus(room.status)
      setError(null)
    } catch {
      setError('That room could not be loaded.')
    }
  }, [roomId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const body = {
      code: code.trim(),
      building: building.trim(),
      room_type: roomType,
      capacity: Number(capacity),
      equipment: equipment.trim() || null,
      status,
    }
    if (
      !body.code ||
      !body.building ||
      !Number.isFinite(body.capacity) ||
      body.capacity < 1
    ) {
      setError('Enter a code, building, and capacity of at least 1.')
      return
    }
    setSubmitting(true)
    try {
      if (editing) {
        await updateRoom(roomId, body)
      } else {
        await createRoom(body)
      }
      navigate('/facilities/rooms')
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'The room could not be saved.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete() {
    setSubmitting(true)
    setError(null)
    try {
      await deleteRoom(roomId)
      navigate('/facilities/rooms')
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'The room could not be deleted.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title={editing ? 'Edit room' : 'Add room'}
        description="Room code, building, type, and capacity are used by the timetable solver."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <form className="grid max-w-lg gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Input
          label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <Input
          label="Building"
          value={building}
          onChange={(event) => setBuilding(event.target.value)}
        />
        <Select
          label="Type"
          value={roomType}
          onValueChange={setRoomType}
          options={ROOM_TYPE_OPTIONS}
        />
        <Input
          label="Capacity"
          type="number"
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
        />
        <Input
          label="Equipment"
          value={equipment}
          onChange={(event) => setEquipment(event.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onValueChange={setStatus}
          options={ROOM_STATUS_OPTIONS}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save room'}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => void onDelete()}
            >
              Delete
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link to="/facilities/rooms">Cancel</Link>
          </Button>
        </div>
      </form>
    </RoleShell>
  )
}
