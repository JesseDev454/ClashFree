import { useEffect, useState } from 'react'
import { fetchRooms } from '../../api/academic'
import { fetchDisruptionSummary } from '../../api/disruptions'
import { ThinDashboardPage } from '../role/ThinDashboardPage'

export function FacilitiesHomePage() {
  const [roomsOnline, setRoomsOnline] = useState({
    value: '—',
    hint: 'Loading catalogue',
  })
  const [disruptionStats, setDisruptionStats] = useState({
    active: '—',
    scheduled: '—',
    classes: '—',
  })

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchRooms(), fetchDisruptionSummary().catch(() => null)])
      .then(([rooms, summary]) => {
        if (cancelled) {
          return
        }
        setRoomsOnline({
          value: String(rooms.length),
          hint: 'Teaching spaces in catalogue',
        })
        if (summary) {
          setDisruptionStats({
            active: String(summary.active),
            scheduled: String(summary.scheduled),
            classes: String(summary.classes_affected),
          })
        }
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
          value: disruptionStats.scheduled,
          hint: 'Scheduled room disruptions',
          tint: 'amber',
        },
        {
          id: 'disruptions',
          label: 'Active disruptions',
          value: disruptionStats.active,
          hint: 'Open and in review',
          tint: 'rose',
        },
        {
          id: 'affected',
          label: 'Affected classes',
          value: disruptionStats.classes,
          hint: 'Published meetings',
          tint: 'blue',
        },
      ]}
    />
  )
}
