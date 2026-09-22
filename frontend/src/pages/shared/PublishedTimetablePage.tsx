import { useState } from 'react'
import type { TimetableVersion } from '../../api/timetables'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { TimetableGrid } from '../../components/TimetableGrid'
import { useReload } from '../../hooks/useReload'
import { slotsToEntries } from '../../lib/timetableEntries'

export function PublishedTimetablePage({
  title,
  description,
  load,
  emptyLabel,
}: {
  title: string
  description: string
  load: () => Promise<TimetableVersion>
  emptyLabel: string
}) {
  const [version, setVersion] = useState<TimetableVersion | null>(null)
  const [empty, setEmpty] = useState(emptyLabel)
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      const body = await load()
      setVersion(body)
      setEmpty(body.slots.length === 0 ? emptyLabel : '')
      setError(null)
    } catch (caught) {
      setVersion(null)
      if (caught instanceof ApiError && caught.status === 404) {
        setEmpty('Nothing is published yet.')
        setError(null)
        return
      }
      setError(
        caught instanceof ApiError ? caught.detail : 'Timetable could not be loaded',
      )
    }
  }, [load, emptyLabel])

  return (
    <RoleShell>
      <PageHeader
        title={title}
        description={
          version
            ? `${description} Published version ${version.version_number}.`
            : description
        }
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {empty ? <p className="mb-4 text-sm text-muted-foreground">{empty}</p> : null}
      {version && version.slots.length > 0 ? (
        <TimetableGrid entries={slotsToEntries(version.slots)} caption={title} />
      ) : null}
    </RoleShell>
  )
}
