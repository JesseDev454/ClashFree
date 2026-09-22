import { useState } from 'react'
import { fetchAudit, type AuditEvent } from '../../api/activity'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function AuditLogPage() {
  const [rows, setRows] = useState<AuditEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      setRows(await fetchAudit())
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Audit log could not be loaded',
      )
    }
  }, [])

  return (
    <RoleShell>
      <PageHeader
        title="Audit Log"
        description="Who changed a timetable, request, disruption, or account."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit events yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-2">When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="py-2">{row.created_at.slice(0, 16).replace('T', ' ')}</td>
                <td>{row.actor_name ?? 'System'}</td>
                <td>{row.action}</td>
                <td>{row.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RoleShell>
  )
}
