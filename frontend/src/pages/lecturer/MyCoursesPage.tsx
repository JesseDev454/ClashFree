import { useState } from 'react'
import type { AssignmentRecord } from '../../api/academic'
import { fetchMyCourses } from '../../api/portals'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function MyCoursesPage() {
  const [rows, setRows] = useState<AssignmentRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      setRows(await fetchMyCourses())
      setError(null)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Courses could not be loaded')
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader
        title="My Courses"
        description="Assignments linked to your lecturer profile."
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses are assigned.</p>
      ) : (
        <ul className="grid gap-1 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              {row.course_code} {row.course_title} · {row.cohort_code} ·{' '}
              {row.contact_pattern}
            </li>
          ))}
        </ul>
      )}
    </RoleShell>
  )
}
