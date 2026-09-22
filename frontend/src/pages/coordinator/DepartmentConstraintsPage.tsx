import { useState } from 'react'
import {
  createDepartmentConstraint,
  deleteDepartmentConstraint,
  fetchDepartmentConstraints,
  type DepartmentConstraint,
} from '../../api/portals'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'
import { PERIODS, WEEKDAYS } from '../../lib/schedule'

export function DepartmentConstraintsPage() {
  const [rows, setRows] = useState<DepartmentConstraint[]>([])
  const [kind, setKind] = useState('blocked_period')
  const [weekday, setWeekday] = useState('mon')
  const [period, setPeriod] = useState('08-10')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function load() {
    return fetchDepartmentConstraints().then(setRows)
  }

  useReload(async () => {
    try {
      await load()
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Constraints could not be loaded',
      )
    }
  }, [])

  async function onCreate() {
    try {
      await createDepartmentConstraint({
        kind,
        weekday: kind === 'lab_need' ? null : weekday,
        period: kind === 'lab_need' ? null : period,
        note: note || null,
        room_type: kind === 'lab_need' ? 'lab' : null,
      })
      setNote('')
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Constraint could not be saved',
      )
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Department Constraints"
        description="Blocked periods are hard rules for this department. Preferred periods are soft. Lab needs are recorded only."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Select
          label="Kind"
          value={kind}
          options={[
            { value: 'blocked_period', label: 'Blocked period' },
            { value: 'preferred_period', label: 'Preferred period' },
            { value: 'lab_need', label: 'Lab need' },
          ]}
          onValueChange={setKind}
        />
        <Select
          label="Weekday"
          value={weekday}
          options={WEEKDAYS.map((day) => ({ value: day, label: day }))}
          onValueChange={setWeekday}
        />
        <Select
          label="Period"
          value={period}
          options={PERIODS.map((item) => ({ value: item, label: item }))}
          onValueChange={setPeriod}
        />
        <Input
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button onClick={() => void onCreate()}>Add constraint</Button>
      </div>
      <ul className="grid gap-2 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3">
            <span>
              {row.kind} {row.weekday ?? ''} {row.period ?? ''} {row.note ?? ''}
            </span>
            <Button onClick={() => void deleteDepartmentConstraint(row.id).then(load)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </RoleShell>
  )
}
