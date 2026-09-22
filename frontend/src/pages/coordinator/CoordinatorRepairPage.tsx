import { useState } from 'react'
import { ApiError } from '../../api/client'
import { repairTimetable } from '../../api/timetables'
import { Button } from '../../components/Button'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'

export function CoordinatorRepairPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function run() {
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const runResult = await repairTimetable({
        all_open: true,
        time_limit_seconds: 10,
        alternative_count: 1,
        random_seed: 13,
      })
      setMessage(`Repair finished with status ${runResult.status}.`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Repair could not start.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Repair timetable"
        description="Repairs every open disruption that affects your department. Unaffected meetings stay pinned."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mb-4 text-sm text-foreground">{message}</p> : null}
      <Button type="button" disabled={submitting} onClick={() => void run()}>
        {submitting ? 'Repairing…' : 'Repair open disruptions'}
      </Button>
    </RoleShell>
  )
}
