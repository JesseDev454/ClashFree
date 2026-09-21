import { useEffect, useState } from 'react'
import { fetchRooms } from '../../api/academic'
import { ThinDashboardPage } from '../role/ThinDashboardPage'

export function FacilitiesHomePage() {
  const [roomsOnline, setRoomsOnline] = useState({
    value: '—',
    hint: 'Loading catalogue',
  })

  useEffect(() => {
    let cancelled = false
    void fetchRooms()
      .then((rooms) => {
        if (cancelled) {
          return
        }
        setRoomsOnline({
          value: String(rooms.length),
          hint: 'Teaching spaces in catalogue',
        })
      })
      .catch(() => {
        if (!cancelled) {
          setRoomsOnline({ value: '—', hint: 'Could not load rooms' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ThinDashboardPage
      title="Facilities workspace"
      description="Manage rooms, maintenance and disruptions. You cannot generate or publish timetables."
      metrics={[
        {
          id: 'rooms',
          label: 'Rooms online',
          value: roomsOnline.value,
          hint: roomsOnline.hint,
          tint: 'green',
        },
        {
          id: 'maintenance',
          label: 'Maintenance windows',
          value: '4',
          hint: 'This week',
          tint: 'amber',
        },
        {
          id: 'disruptions',
          label: 'Active disruptions',
          value: '1',
          hint: 'Engineering LT2',
          tint: 'rose',
        },
        {
          id: 'affected',
          label: 'Affected classes',
          value: '4',
          hint: 'Awaiting repair',
          tint: 'blue',
        },
      ]}
    />
  )
}
