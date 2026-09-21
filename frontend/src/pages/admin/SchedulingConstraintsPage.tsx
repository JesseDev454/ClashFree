import { useState } from 'react'
import {
  fetchConstraintSummary,
  fetchConstraints,
  patchConstraint,
  type ConstraintRecord,
  type ConstraintSummary,
} from '../../api/constraints'
import { ApiError } from '../../api/client'
import { Card } from '../../components/Card'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { StatusBadge } from '../../components/StatusBadge'
import { Toggle } from '../../components/Toggle'
import { useReload } from '../../hooks/useReload'

const emptySummary: ConstraintSummary = {
  hard: 0,
  soft: 0,
  soft_enabled: 0,
  department_rules: 0,
  current_profile: null,
  validation_percent: 0,
}

export function SchedulingConstraintsPage() {
  const [constraints, setConstraints] = useState<ConstraintRecord[]>([])
  const [summary, setSummary] = useState<ConstraintSummary>(emptySummary)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const [rows, counts] = await Promise.all([
        fetchConstraints(),
        fetchConstraintSummary(),
      ])
      setConstraints(rows)
      setSummary(counts)
      setState(rows.length === 0 ? 'empty' : 'ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const hard = constraints.filter((row) => row.kind === 'hard')
  const soft = constraints.filter((row) => row.kind === 'soft')

  async function onToggle(row: ConstraintRecord, enabled: boolean) {
    setError(null)
    try {
      const updated = await patchConstraint(row.id, enabled)
      setConstraints((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setSummary((current) => ({
        ...current,
        soft_enabled: current.soft_enabled + (enabled ? 1 : -1),
      }))
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Could not update the constraint',
      )
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Scheduling Constraints"
        description="Configure rules that define what a valid timetable is and which preferences the optimizer should try to satisfy."
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Hard Constraints"
          value={String(summary.hard)}
          hint="Must never be violated"
          tint="rose"
        />
        <MetricCard
          label="Soft Constraints"
          value={String(summary.soft)}
          hint={`${summary.soft_enabled} enabled`}
          tint="blue"
        />
        <MetricCard
          label="Department Rules"
          value={String(summary.department_rules)}
          hint="Scoped local constraints"
          tint="lavender"
        />
        <MetricCard
          label="Validation"
          value={`${summary.validation_percent}%`}
          hint="All rules syntactically valid"
          tint="green"
        />
      </div>
      {error ? (
        <p
          className="mb-4 rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          Constraints could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">No constraints are configured.</p>
      ) : null}
      {state === 'ready' ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Hard Constraints</h2>
                <StatusBadge variant="danger">Mandatory</StatusBadge>
              </div>
              <ul className="divide-y divide-border">
                {hard.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.description}</p>
                    </div>
                    <StatusBadge variant="success">Hard · Locked</StatusBadge>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Soft Constraints</h2>
                <StatusBadge variant="info">Weighted</StatusBadge>
              </div>
              <ul className="divide-y divide-border">
                {soft.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.description}</p>
                    </div>
                    <Toggle
                      checked={row.enabled}
                      label={row.name}
                      onCheckedChange={(enabled) => void onToggle(row, enabled)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <p className="mt-4 rounded-xl border border-border bg-tint-blue px-4 py-3 text-sm text-muted-foreground">
            Model note: Hard constraints are enforced by the solver. Soft constraints
            contribute penalty values controlled on the Constraint Weights page.
          </p>
        </>
      ) : null}
    </RoleShell>
  )
}
