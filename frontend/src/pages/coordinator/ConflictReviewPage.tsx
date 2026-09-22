import { useState } from 'react'
import { fetchDepartmentConflicts, type PublishedConflict } from '../../api/portals'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function ConflictReviewPage() {
  const [rows, setRows] = useState<PublishedConflict[]>([])
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      setRows(await fetchDepartmentConflicts())
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Conflicts could not be loaded',
      )
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader
        title="Conflict Review"
        description="Hard overlaps on the published timetable that touch this department."
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No published conflicts for this department.
        </p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {rows.map((row) => (
            <li
              key={`${row.kind}-${row.weekday}-${row.period}-${row.assignment_ids.join('-')}`}
            >
              {row.title}: {row.detail}
            </li>
          ))}
        </ul>
      )}
    </RoleShell>
  )
}
