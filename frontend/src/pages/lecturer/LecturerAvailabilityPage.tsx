import { useMemo, useState, type FormEvent } from 'react'
import {
  createMyException,
  deleteMyException,
  fetchMyAvailability,
  saveMyAvailability,
  type AvailabilityException,
  type LecturerAvailability,
} from '../../api/constraints'
import { ApiError } from '../../api/client'
import { AvailabilityGrid } from '../../components/AvailabilityGrid'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { MetricCard } from '../../components/MetricCard'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'
import {
  PERIODS,
  SLOT_COUNT,
  allSlots,
  cycleLecturerState,
  formatPeriodWindow,
  formatShortDate,
  type GridSlot,
  type Period,
  type Weekday,
} from '../../lib/schedule'

const periodOptions = [
  { value: 'all', label: 'All day' },
  ...PERIODS.map((period) => ({ value: period, label: period })),
]

function metricsFrom(slots: GridSlot[], submitted: boolean) {
  const available = slots.filter((slot) => slot.state === 'available').length
  const preferred = slots.filter((slot) => slot.state === 'preferred').length
  const unavailable = slots.filter((slot) => slot.state === 'unavailable').length
  const coverage = Math.round((100 * (available + preferred)) / SLOT_COUNT)
  return { available, preferred, unavailable, coverage, submitted }
}

export function LecturerAvailabilityPage() {
  const [availability, setAvailability] = useState<LecturerAvailability | null>(null)
  const [slots, setSlots] = useState<GridSlot[]>([])
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AvailabilityException | null>(null)
  const [form, setForm] = useState({
    starts_on: '',
    ends_on: '',
    start_period: 'all',
    end_period: 'all',
    reason: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const body = await fetchMyAvailability()
      setAvailability(body)
      setSlots(body.slots)
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const counts = useMemo(
    () => metricsFrom(slots, availability?.submitted ?? false),
    [availability?.submitted, slots],
  )

  function cycle(weekday: Weekday, period: Period) {
    setSlots((current) =>
      current.map((slot) =>
        slot.weekday === weekday && slot.period === period
          ? { ...slot, state: cycleLecturerState(slot.state) }
          : slot,
      ),
    )
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const body = await saveMyAvailability(slots)
      setAvailability(body)
      setSlots(body.slots)
      setMessage('Availability saved.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Could not save availability')
    } finally {
      setSaving(false)
    }
  }

  async function onAddException(event: FormEvent) {
    event.preventDefault()
    if (!form.starts_on || !form.ends_on || !form.reason.trim()) {
      setFormError('Enter a start date, end date and reason.')
      return
    }
    setFormError(null)
    try {
      await createMyException({
        starts_on: form.starts_on,
        ends_on: form.ends_on,
        start_period: form.start_period === 'all' ? null : form.start_period,
        end_period: form.end_period === 'all' ? null : form.end_period,
        reason: form.reason.trim(),
        kind: 'unavailable',
      })
      setModalOpen(false)
      setForm({
        starts_on: '',
        ends_on: '',
        start_period: 'all',
        end_period: 'all',
        reason: '',
      })
      await load()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.detail : 'Could not add the exception',
      )
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Availability"
        description="Define when you can teach so the scheduling engine can respect your real availability."
        actions={
          <Button onClick={() => void onSave()} disabled={saving || state !== 'ready'}>
            Save Changes
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Availability Status"
          value={counts.submitted ? 'Submitted' : 'Missing'}
          hint={counts.submitted ? 'Weekly pattern saved' : 'Save a weekly grid'}
          tint="green"
        />
        <MetricCard
          label="Available Slots"
          value={String(counts.available)}
          hint="This weekly pattern"
          tint="blue"
        />
        <MetricCard
          label="Preferred Slots"
          value={String(counts.preferred)}
          hint="Soft preference"
          tint="lavender"
        />
        <MetricCard
          label="Unavailable Slots"
          value={String(counts.unavailable)}
          hint="Hard restriction"
          tint="rose"
        />
        <MetricCard
          label="Coverage"
          value={`${counts.coverage}%`}
          hint="Of teaching week"
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
          Availability could not be loaded.
        </p>
      ) : null}
      {state === 'ready' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <h2 className="text-base font-semibold">Weekly Availability Pattern</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Click a slot to cycle: Available → Preferred → Unavailable.
            </p>
            <AvailabilityGrid
              slots={slots}
              onCycle={cycle}
              caption="Lecturer weekly availability"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSlots(allSlots('available'))}>
                Reset
              </Button>
              <Button onClick={() => void onSave()} disabled={saving}>
                Save Availability
              </Button>
            </div>
          </Card>
          <div className="grid gap-4">
            <Card>
              <h2 className="mb-3 text-base font-semibold">Temporary Exceptions</h2>
              {availability && availability.exceptions.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">No dated exceptions.</p>
              ) : (
                <ul className="mb-3 grid gap-3">
                  {availability?.exceptions.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {formatShortDate(item.starts_on)}
                          {item.ends_on !== item.starts_on
                            ? ` – ${formatShortDate(item.ends_on)}`
                            : ''}{' '}
                          · {formatPeriodWindow(item.start_period, item.end_period)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.reason} · {item.kind}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(item)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFormError(null)
                  setModalOpen(true)
                }}
              >
                + Add Exception
              </Button>
            </Card>
            <Card className="bg-tint-blue">
              <h2 className="mb-2 text-base font-semibold">How Availability Works</h2>
              <p className="text-sm text-muted-foreground">
                Unavailable slots are treated as hard constraints. Preferred slots are
                soft constraints that ClashFree tries to honour when possible.
              </p>
            </Card>
          </div>
        </div>
      ) : null}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add exception"
        description="Dated unavailability is stored separately from disruption reports."
      >
        <form className="grid gap-3" onSubmit={(event) => void onAddException(event)}>
          {formError ? (
            <p
              className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          <Input
            label="Starts on"
            type="date"
            value={form.starts_on}
            onChange={(event) =>
              setForm((current) => ({ ...current, starts_on: event.target.value }))
            }
          />
          <Input
            label="Ends on"
            type="date"
            value={form.ends_on}
            onChange={(event) =>
              setForm((current) => ({ ...current, ends_on: event.target.value }))
            }
          />
          <Select
            label="Start period"
            value={form.start_period}
            options={periodOptions}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, start_period: value }))
            }
          />
          <Select
            label="End period"
            value={form.end_period}
            options={periodOptions}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, end_period: value }))
            }
          />
          <Input
            label="Reason"
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({ ...current, reason: event.target.value }))
            }
          />
          <Button type="submit">Add exception</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
          }
        }}
        title="Remove this exception?"
        description="The weekly availability pattern is unchanged."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!pendingDelete) {
            return
          }
          void deleteMyException(pendingDelete.id).then(() => load())
        }}
      />
    </RoleShell>
  )
}
