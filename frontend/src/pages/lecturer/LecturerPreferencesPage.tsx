import { useState, type FormEvent } from 'react'
import { fetchMyPreferences, saveMyPreferences } from '../../api/constraints'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { StatusBadge } from '../../components/StatusBadge'
import { Toggle } from '../../components/Toggle'
import { useReload } from '../../hooks/useReload'
import { WEEKDAYS, WEEKDAY_FULL, type Weekday } from '../../lib/schedule'

type PreferenceForm = {
  prefer_morning: boolean
  avoid_friday_afternoon: boolean
  no_early_after_late: boolean
  max_classes_per_day: string
  max_consecutive_hours: string
  min_break_minutes: string
  preferred_days: string[]
}

const emptyForm: PreferenceForm = {
  prefer_morning: true,
  avoid_friday_afternoon: true,
  no_early_after_late: false,
  max_classes_per_day: '2',
  max_consecutive_hours: '4',
  min_break_minutes: '60',
  preferred_days: [...WEEKDAYS],
}

export function LecturerPreferencesPage() {
  const [form, setForm] = useState<PreferenceForm>(emptyForm)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const body = await fetchMyPreferences()
      setForm({
        prefer_morning: body.prefer_morning,
        avoid_friday_afternoon: body.avoid_friday_afternoon,
        no_early_after_late: body.no_early_after_late,
        max_classes_per_day: String(body.max_classes_per_day),
        max_consecutive_hours: String(body.max_consecutive_hours),
        min_break_minutes: String(body.min_break_minutes),
        preferred_days: body.preferred_days,
      })
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  async function onSave(event?: FormEvent) {
    event?.preventDefault()
    const maxClasses = Number(form.max_classes_per_day)
    const maxHours = Number(form.max_consecutive_hours)
    const minBreak = Number(form.min_break_minutes)
    if (
      !Number.isInteger(maxClasses) ||
      maxClasses < 1 ||
      maxClasses > 8 ||
      !Number.isInteger(maxHours) ||
      maxHours < 1 ||
      maxHours > 10 ||
      !Number.isInteger(minBreak) ||
      minBreak < 0 ||
      minBreak > 240
    ) {
      setFormError(
        'Enter 1–8 classes per day, 1–10 consecutive hours, and a break of 0–240 minutes.',
      )
      return
    }
    if (form.preferred_days.length === 0) {
      setFormError('Select at least one preferred teaching day.')
      return
    }
    setFormError(null)
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      const saved = await saveMyPreferences({
        prefer_morning: form.prefer_morning,
        avoid_friday_afternoon: form.avoid_friday_afternoon,
        no_early_after_late: form.no_early_after_late,
        max_classes_per_day: maxClasses,
        max_consecutive_hours: maxHours,
        min_break_minutes: minBreak,
        preferred_days: form.preferred_days,
      })
      setForm({
        ...form,
        max_classes_per_day: String(saved.max_classes_per_day),
        max_consecutive_hours: String(saved.max_consecutive_hours),
        min_break_minutes: String(saved.min_break_minutes),
        preferred_days: saved.preferred_days,
      })
      setMessage('Preferences saved.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Could not save preferences')
    } finally {
      setSaving(false)
    }
  }

  function toggleDay(day: Weekday) {
    setForm((current) => ({
      ...current,
      preferred_days: current.preferred_days.includes(day)
        ? current.preferred_days.filter((item) => item !== day)
        : [...current.preferred_days, day],
    }))
  }

  return (
    <RoleShell>
      <PageHeader
        title="Scheduling Preferences"
        description="Set soft preferences that help ClashFree create a more practical teaching schedule for you."
        actions={
          <Button onClick={() => void onSave()} disabled={saving || state !== 'ready'}>
            Save Preferences
          </Button>
        }
      />
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
          Preferences could not be loaded.
        </p>
      ) : null}
      {state === 'ready' ? (
        <form
          className="grid grid-cols-1 gap-4 xl:grid-cols-3"
          onSubmit={(event) => void onSave(event)}
        >
          <div className="grid gap-4 xl:col-span-2">
            <Card>
              <h2 className="mb-3 text-base font-semibold">Time Preferences</h2>
              <ul className="divide-y divide-border">
                <li className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">Prefer morning classes</p>
                    <p className="text-xs text-muted-foreground">
                      Prioritize 08:00–12:00 when feasible.
                    </p>
                  </div>
                  <Toggle
                    checked={form.prefer_morning}
                    label="Prefer morning classes"
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, prefer_morning: checked }))
                    }
                  />
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">Avoid Friday afternoon</p>
                    <p className="text-xs text-muted-foreground">
                      Apply a soft penalty after 14:00 on Fridays.
                    </p>
                  </div>
                  <Toggle
                    checked={form.avoid_friday_afternoon}
                    label="Avoid Friday afternoon"
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        avoid_friday_afternoon: checked,
                      }))
                    }
                  />
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      Prefer no 08:00 class after a 16:00 class
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reduce undesirable turnaround between teaching days.
                    </p>
                  </div>
                  <Toggle
                    checked={form.no_early_after_late}
                    label="Prefer no 08:00 class after a 16:00 class"
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        no_early_after_late: checked,
                      }))
                    }
                  />
                </li>
              </ul>
            </Card>
            <Card>
              <h2 className="mb-3 text-base font-semibold">Workload Preferences</h2>
              {formError ? (
                <p
                  className="mb-3 rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Preferred maximum classes per day"
                  type="number"
                  min={1}
                  max={8}
                  value={form.max_classes_per_day}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_classes_per_day: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Preferred maximum consecutive hours"
                  type="number"
                  min={1}
                  max={10}
                  value={form.max_consecutive_hours}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_consecutive_hours: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Minimum preferred break (minutes)"
                  type="number"
                  min={0}
                  max={240}
                  value={form.min_break_minutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      min_break_minutes: event.target.value,
                    }))
                  }
                />
                <fieldset className="grid gap-1.5">
                  <legend className="text-xs font-medium text-muted-foreground">
                    Preferred teaching days
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const checked = form.preferred_days.includes(day)
                      return (
                        <label
                          key={day}
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDay(day)}
                          />
                          {WEEKDAY_FULL[day]}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            </Card>
          </div>
          <div className="grid gap-4">
            <Card>
              <h2 className="mb-3 text-base font-semibold">Preference Priority</h2>
              <ul className="grid gap-3">
                <li className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Morning preference</p>
                    <p className="text-xs text-muted-foreground">Weight 4 / 5</p>
                  </div>
                  <StatusBadge variant={form.prefer_morning ? 'info' : 'neutral'}>
                    {form.prefer_morning ? 'High' : 'Off'}
                  </StatusBadge>
                </li>
                <li className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Avoid Friday afternoon</p>
                    <p className="text-xs text-muted-foreground">Weight 3 / 5</p>
                  </div>
                  <StatusBadge
                    variant={form.avoid_friday_afternoon ? 'warning' : 'neutral'}
                  >
                    {form.avoid_friday_afternoon ? 'Medium' : 'Off'}
                  </StatusBadge>
                </li>
                <li className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Minimum one-hour break</p>
                    <p className="text-xs text-muted-foreground">Weight 2 / 5</p>
                  </div>
                  <StatusBadge variant="warning">Normal</StatusBadge>
                </li>
              </ul>
            </Card>
            <Card className="bg-tint-blue">
              <h2 className="mb-2 text-base font-semibold">Important</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                These are soft scheduling preferences, not guarantees. Hard constraints
                such as room clashes, cohort clashes and declared unavailability always
                take priority.
              </p>
              <Button type="submit" className="w-full" disabled={saving}>
                Save Preferences
              </Button>
            </Card>
          </div>
        </form>
      ) : null}
    </RoleShell>
  )
}
