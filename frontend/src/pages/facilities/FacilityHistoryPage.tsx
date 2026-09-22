import { useState } from 'react'
import { fetchFacilityHistory, type FacilityHistoryItem } from '../../api/activity'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function FacilityHistoryPage() {
  const [rows, setRows] = useState<FacilityHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      setRows(await fetchFacilityHistory())
      setError(null)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'History could not be loaded')
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader
        title="Facility History"
        description="Room disruptions and maintenance blocks, newest first."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No facility history yet.</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              {row.occurred_at.slice(0, 10)} · {row.source} · {row.room_code ?? 'No room'}{' '}
              · {row.title}
              {row.status ? ` (${row.status})` : ''}
            </li>
          ))}
        </ul>
      )}
    </RoleShell>
  )
}
