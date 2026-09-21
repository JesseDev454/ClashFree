import { useMemo, useState } from 'react'
import {
  activateWeightProfile,
  fetchWeightProfiles,
  patchWeightProfile,
  type WeightProfile,
  type WeightValues,
} from '../../api/constraints'
import { fetchDraft } from '../../api/timetables'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'
import { cn } from '../../lib/utils'

const WEIGHT_FIELDS = [
  {
    key: 'schedule_stability',
    label: 'Schedule stability',
    hint: 'Avoid moving already-published classes during repair.',
    preview: 'schedule changes',
  },
  {
    key: 'student_idle_gaps',
    label: 'Student idle gaps',
    hint: 'Reduce long gaps between same-day classes.',
    preview: 'student idle penalty',
  },
  {
    key: 'room_utilization',
    label: 'Room utilization',
    hint: 'Prefer tighter capacity fit and efficient space use.',
    preview: 'room-fit penalty',
  },
  {
    key: 'lecturer_preferences',
    label: 'Lecturer preferences',
    hint: 'Respect preferred days and times where possible.',
    preview: 'preference penalty',
  },
  {
    key: 'daily_balance',
    label: 'Daily balance',
    hint: 'Spread cohort workload evenly across the week.',
    preview: 'daily imbalance',
  },
  {
    key: 'building_movement',
    label: 'Building movement',
    hint: 'Reduce unnecessary movement between distant buildings.',
    preview: 'building movement',
  },
] as const

function valuesFrom(profile: WeightProfile): WeightValues {
  return {
    schedule_stability: profile.schedule_stability,
    student_idle_gaps: profile.student_idle_gaps,
    room_utilization: profile.room_utilization,
    lecturer_preferences: profile.lecturer_preferences,
    daily_balance: profile.daily_balance,
    building_movement: profile.building_movement,
  }
}

export function ConstraintWeightsPage() {
  const [profiles, setProfiles] = useState<WeightProfile[]>([])
  const [values, setValues] = useState<WeightValues | null>(null)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draftSoft, setDraftSoft] = useState<number | null>(null)
  const [draftHard, setDraftHard] = useState<number | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const [rows, draft] = await Promise.all([
        fetchWeightProfiles(),
        fetchDraft().catch(() => null),
      ])
      setProfiles(rows)
      const current = rows.find((row) => row.is_current) ?? rows[0]
      setValues(current ? valuesFrom(current) : null)
      setDraftSoft(draft ? draft.solution.soft_penalty : null)
      setDraftHard(draft ? draft.solution.hard_violations : null)
      setState(rows.length === 0 ? 'empty' : 'ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const current = profiles.find((row) => row.is_current) ?? profiles[0]
  const ranked = useMemo(() => {
    if (!values) {
      return []
    }
    return WEIGHT_FIELDS.map((field) => ({
      ...field,
      value: values[field.key],
    })).sort(
      (left, right) => right.value - left.value || left.label.localeCompare(right.label),
    )
  }, [values])
  const highest = ranked[0]

  async function onSave() {
    if (!current || !values) {
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await patchWeightProfile(current.id, values)
      setProfiles((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))
      setMessage('Weights saved.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Could not save weights')
    } finally {
      setSaving(false)
    }
  }

  async function onActivate(profile: WeightProfile) {
    setError(null)
    setMessage(null)
    try {
      const updated = await activateWeightProfile(profile.id)
      setProfiles((rows) =>
        rows.map((row) => ({
          ...row,
          is_current: row.id === updated.id,
          ...(row.id === updated.id ? valuesFrom(updated) : {}),
        })),
      )
      setValues(valuesFrom(updated))
      setMessage(`${updated.name} is now the current profile.`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Could not activate preset')
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Constraint Weights"
        description="Tune soft-constraint priorities used by the optimization objective without weakening mandatory scheduling rules."
        actions={
          <Button onClick={() => void onSave()} disabled={!values || saving}>
            Save Weights
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current Profile"
          value={current?.name ?? '—'}
          hint="Default objective"
          tint="blue"
        />
        <MetricCard
          label="Highest Priority"
          value={highest ? highest.label.replace('Schedule s', 'S') : '—'}
          hint={highest ? `Weight ${highest.value}/10` : 'No profile'}
          tint="lavender"
        />
        <MetricCard
          label="Soft Penalty"
          value={draftSoft == null ? '—' : String(draftSoft)}
          hint={draftSoft == null ? 'Until a timetable exists' : 'Selected draft'}
          tint="amber"
        />
        <MetricCard
          label="Hard Violations"
          value={draftHard == null ? '0' : String(draftHard)}
          hint={draftHard == null ? 'Always required' : 'Selected draft'}
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
      {message ? (
        <p className="mb-4 text-sm text-success" role="status">
          {message}
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          Weight profiles could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          No weight profiles are configured.
        </p>
      ) : null}
      {state === 'ready' && values ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <h2 className="mb-4 text-base font-semibold">Optimization Weights</h2>
            <ul className="grid gap-5">
              {WEIGHT_FIELDS.map((field) => (
                <li key={field.key}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="text-xs text-muted-foreground">{field.hint}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {values[field.key]}/10
                    </p>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    aria-label={field.label}
                    value={values[field.key]}
                    onChange={(event) =>
                      setValues((currentValues) =>
                        currentValues
                          ? {
                              ...currentValues,
                              [field.key]: Number(event.target.value),
                            }
                          : currentValues,
                      )
                    }
                    className="w-full accent-primary"
                  />
                </li>
              ))}
            </ul>
          </Card>
          <div className="grid gap-4">
            <Card>
              <h2 className="mb-3 text-base font-semibold">Objective Preview</h2>
              <ol className="grid gap-2 text-sm">
                {ranked.map((field) => (
                  <li key={field.key}>
                    <span className="font-semibold text-primary">{field.value}×</span>{' '}
                    {field.preview}
                  </li>
                ))}
              </ol>
            </Card>
            <Card>
              <h2 className="mb-3 text-base font-semibold">Presets</h2>
              <div className="grid gap-2">
                {profiles.map((profile) => (
                  <Button
                    key={profile.id}
                    variant={profile.is_current ? 'primary' : 'outline'}
                    onClick={() => void onActivate(profile)}
                    className={cn('w-full justify-center')}
                  >
                    {profile.name}
                    {profile.is_current ? ' · Current' : ''}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </RoleShell>
  )
}
