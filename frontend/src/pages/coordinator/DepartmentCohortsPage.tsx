import { useState } from 'react'
import type { CohortRecord } from '../../api/academic'
import { createDepartmentCohort, fetchDepartmentCohorts } from '../../api/portals'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function DepartmentCohortsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<CohortRecord[]>([])
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function load() {
    return fetchDepartmentCohorts()
      .then(setRows)
      .catch((caught) => {
        setError(
          caught instanceof ApiError ? caught.detail : 'Cohorts could not be loaded',
        )
      })
  }

  useReload(async () => {
    await load()
  }, [])

  async function onCreate() {
    if (!user?.department_id) {
      return
    }
    try {
      await createDepartmentCohort({
        code,
        department_id: user.department_id,
        level: 300,
        size: 40,
        status: 'complete',
      })
      setCode('')
      await load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Cohort could not be created')
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Student Cohorts"
        description="Groups that must not overlap in required classes."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <Button onClick={() => void onCreate()}>Add cohort</Button>
      </div>
      <ul className="grid gap-1 text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {row.code} · level {row.level} · {row.size} students
          </li>
        ))}
      </ul>
    </RoleShell>
  )
}
