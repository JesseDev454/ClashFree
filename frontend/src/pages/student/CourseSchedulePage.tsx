import { useState } from 'react'
import { fetchPublishedMine, type TimetableSlot } from '../../api/timetables'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function CourseSchedulePage() {
  const [groups, setGroups] = useState<
    Array<{ code: string; title: string; slots: TimetableSlot[] }>
  >([])
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      const body = await fetchPublishedMine()
      const map = new Map<
        string,
        { code: string; title: string; slots: TimetableSlot[] }
      >()
      for (const slot of body.slots) {
        const code = slot.course_code ?? 'Course'
        const current = map.get(code) ?? {
          code,
          title: slot.course_title ?? '',
          slots: [],
        }
        current.slots.push(slot)
        map.set(code, current)
      }
      setGroups([...map.values()])
      setError(null)
    } catch (caught) {
      setGroups([])
      setError(
        caught instanceof ApiError
          ? caught.detail
          : 'Course schedule could not be loaded',
      )
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader
        title="Course Schedule"
        description="Published meetings grouped by course."
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No published courses for this cohort.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.code} className="mb-4">
            <h2 className="text-base font-semibold">
              {group.code} {group.title}
            </h2>
            <ul className="text-sm">
              {group.slots.map((slot) => (
                <li key={slot.id}>
                  {slot.weekday} {slot.start_period}–{slot.end_period} {slot.room_code}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </RoleShell>
  )
}
