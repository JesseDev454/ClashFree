import { useState } from 'react'
import { ApiError } from '../../api/client'
import { generateTimetable } from '../../api/timetables'
import { Button } from '../../components/Button'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'

export function CoordinatorGeneratePage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function run() {
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const runResult = await generateTimetable({
        time_limit_seconds: 10,
        alternative_count: 1,
        random_seed: 7,
      })
      setMessage(`Generate finished with status ${runResult.status}.`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Generate could not start.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Generate timetable"
        description="Runs the solver for your department. Meetings outside the department stay pinned to the published timetable."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mb-4 text-sm text-foreground">{message}</p> : null}
      <Button type="button" disabled={submitting} onClick={() => void run()}>
        {submitting ? 'Generating…' : 'Generate department timetable'}
      </Button>
    </RoleShell>
  )
}
