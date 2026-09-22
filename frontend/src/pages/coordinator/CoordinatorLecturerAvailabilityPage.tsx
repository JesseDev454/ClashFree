import { useState } from 'react'
import {
  fetchLecturerAvailabilitySummary,
  type LecturerAvailabilitySummary,
} from '../../api/portals'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function CoordinatorLecturerAvailabilityPage() {
  const [rows, setRows] = useState<LecturerAvailabilitySummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      setRows(await fetchLecturerAvailabilitySummary())
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Availability could not be loaded',
      )
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader
        title="Lecturer Availability"
        description="Submitted weekly availability for lecturers in this department."
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-2 text-sm">
        {rows.map((row) => (
          <li key={row.lecturer_id}>
            {row.full_name} —{' '}
            {row.submitted ? `${row.slot_count} slots saved` : 'Missing'}
          </li>
        ))}
      </ul>
    </RoleShell>
  )
}
