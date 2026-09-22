import { useMemo, useState } from 'react'
import { fetchPublishedMine, type TimetableSlot } from '../../api/timetables'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'
import { slotsForDate } from '../../lib/todaySchedule'

export function TodayPage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      const body = await fetchPublishedMine()
      setSlots(body.slots)
      setError(null)
    } catch (caught) {
      setSlots([])
      setError(
        caught instanceof ApiError ? caught.detail : 'Schedule could not be loaded',
      )
    }
  }, [])

  const today = useMemo(() => slotsForDate(slots, date), [slots, date])

  return (
    <RoleShell>
      <PageHeader
        title="Today's Schedule"
        description="Classes on the selected date from the published timetable."
      />
      <label className="mb-4 grid max-w-xs gap-1 text-sm">
        Date
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-10 rounded-full border border-border px-3"
        />
      </label>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {today.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes on this date.</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {today.map((slot) => (
            <li key={slot.id}>
              {slot.start_period}–{slot.end_period} {slot.course_code} {slot.course_title}{' '}
              · {slot.room_code} · {slot.lecturer_name}
            </li>
          ))}
        </ul>
      )}
    </RoleShell>
  )
}
