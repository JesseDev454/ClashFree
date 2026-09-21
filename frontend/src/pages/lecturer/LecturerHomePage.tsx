import { useEffect, useState } from 'react'
import { fetchMyAvailability } from '../../api/constraints'
import { ThinDashboardPage } from '../role/ThinDashboardPage'

export function LecturerHomePage() {
  const [availability, setAvailability] = useState({
    value: '—',
    hint: 'Loading weekly grid',
  })

  useEffect(() => {
    let cancelled = false
    void fetchMyAvailability()
      .then((body) => {
        if (cancelled) {
          return
        }
        setAvailability({
          value: body.submitted ? 'Submitted' : 'Missing',
          hint: body.submitted
            ? `${body.coverage_percent}% coverage`
            : 'No weekly grid saved',
        })
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability({ value: 'Missing', hint: 'Could not load availability' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ThinDashboardPage
      title="Teaching workspace"
      description="Review your timetable, availability and unavailability reports. You cannot run the solver."
      metrics={[
        {
          id: 'classes',
          label: 'Classes this week',
          value: '8',
          hint: 'Sample fixture',
          tint: 'blue',
        },
        {
          id: 'hours',
          label: 'Contact hours',
          value: '14',
          hint: 'Two pending labs',
          tint: 'green',
        },
        {
          id: 'changes',
          label: 'Recent changes',
          value: '1',
          hint: 'Room moved',
          tint: 'amber',
        },
        {
          id: 'availability',
          label: 'Availability',
          value: availability.value,
          hint: availability.hint,
          tint: 'purple',
        },
      ]}
    />
  )
}
