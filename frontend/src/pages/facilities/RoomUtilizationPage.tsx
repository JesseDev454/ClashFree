import { useState } from 'react'
import { fetchRoomUtilization, type RoomUtilization } from '../../api/activity'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function RoomUtilizationPage() {
  const [rows, setRows] = useState<RoomUtilization[]>([])
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      setRows(await fetchRoomUtilization())
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Utilization could not be loaded',
      )
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader
        title="Room Utilization"
        description="Published teaching periods used in each room, out of the 25-slot week."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rooms are in the catalogue.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-2">Room</th>
              <th>Building</th>
              <th>Occupied</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.room_id} className="border-t border-border">
                <td className="py-2">{row.room_code}</td>
                <td>{row.building}</td>
                <td>
                  {row.occupied_slots}/{row.week_slots}
                </td>
                <td>{row.utilization_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RoleShell>
  )
}
