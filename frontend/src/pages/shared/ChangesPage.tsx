import { useState } from 'react'
import { fetchMyChanges, type TimetableChange } from '../../api/timetables'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function ChangesPage({ description }: { description: string }) {
  const [rows, setRows] = useState<TimetableChange[]>([])
  const [error, setError] = useState<string | null>(null)
  const [empty, setEmpty] = useState(false)

  useReload(async () => {
    try {
      const body = await fetchMyChanges()
      setRows(body)
      setEmpty(body.length === 0)
      setError(null)
    } catch (caught) {
      setRows([])
      if (caught instanceof ApiError && caught.status === 404) {
        setEmpty(true)
        setError(null)
        return
      }
      setError(caught instanceof ApiError ? caught.detail : 'Changes could not be loaded')
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader title="Timetable Changes" description={description} />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {empty ? (
        <p className="text-sm text-muted-foreground">
          No published changes affect this timetable.
        </p>
      ) : null}
      <ul className="grid gap-2 text-sm">
        {rows.map((row) => (
          <li key={`${row.assignment_id}-${row.meeting_index}-${row.kind}`}>
            {row.course_code ?? 'Meeting'} {row.kind}: {row.from_weekday ?? '—'}{' '}
            {row.from_start_period ?? ''} {row.from_room_code ?? ''} →{' '}
            {row.to_weekday ?? '—'} {row.to_start_period ?? ''} {row.to_room_code ?? ''}
          </li>
        ))}
      </ul>
    </RoleShell>
  )
}
