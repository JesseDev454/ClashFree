import { useState } from 'react'
import { Link } from 'react-router'
import { fetchRooms, type RoomRecord } from '../../api/academic'
import { Button } from '../../components/Button'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'
import {
  ROOM_STATUS_OPTIONS,
  ROOM_TYPE_OPTIONS,
  labelFor,
} from '../../lib/academicLabels'

export function FacilitiesRoomsPage() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      setRooms(await fetchRooms())
      setError(null)
    } catch {
      setError('Rooms could not be loaded.')
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader
        title="Rooms"
        description="Add and update the rooms facilities can offer to the timetable."
        actions={
          <Button asChild>
            <Link to="/facilities/rooms/edit">Add room</Link>
          </Button>
        }
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rooms are in the catalogue.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-2">Code</th>
              <th className="py-2">Building</th>
              <th className="py-2">Type</th>
              <th className="py-2">Capacity</th>
              <th className="py-2">Status</th>
              <th className="py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-t border-border">
                <td className="py-2 font-medium">{room.code}</td>
                <td className="py-2">{room.building}</td>
                <td className="py-2">{labelFor(ROOM_TYPE_OPTIONS, room.room_type)}</td>
                <td className="py-2">{room.capacity}</td>
                <td className="py-2">{labelFor(ROOM_STATUS_OPTIONS, room.status)}</td>
                <td className="py-2 text-right">
                  <Link
                    className="font-medium text-primary underline"
                    to={`/facilities/rooms/edit?id=${room.id}`}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RoleShell>
  )
}
