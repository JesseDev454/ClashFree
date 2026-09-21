import { useMemo, useState, type FormEvent } from 'react'
import { fetchRooms, type RoomRecord } from '../../api/academic'
import {
  createRoomBlock,
  deleteRoomBlock,
  fetchRoomAvailability,
  saveRoomAvailability,
  type RoomBlock,
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
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'
import {
  PERIODS,
  WEEKDAYS,
  WEEKDAY_FULL,
  addDays,
  cycleRoomState,
  formatPeriodWindow,
  formatShortDate,
  isoDate,
  rangesOverlap,
  startOfWeek,
  type GridSlot,
  type Period,
  type Weekday,
} from '../../lib/schedule'

const periodOptions = [
  { value: 'all', label: 'All day' },
  ...PERIODS.map((period) => ({ value: period, label: period })),
]

const kindOptions = [
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'maintenance', label: 'Maintenance' },
]

function todayWeekday(): Weekday {
  const index = new Date().getDay()
  if (index === 0 || index === 6) {
    return 'mon'
  }
  return WEEKDAYS[index - 1]
}

export function RoomAvailabilityPage() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [roomId, setRoomId] = useState('')
  const [slots, setSlots] = useState<GridSlot[]>([])
  const [blocks, setBlocks] = useState<RoomBlock[]>([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<RoomBlock | null>(null)
  const [form, setForm] = useState({
    starts_on: '',
    ends_on: '',
    start_period: 'all',
    end_period: 'all',
    reason: '',
    kind: 'unavailable',
    recurring: false,
  })
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const roomRows = await fetchRooms()
      setRooms(roomRows)
      if (roomRows.length === 0) {
        setState('empty')
        return
      }
      const preferred =
        roomRows.find((room) => room.code === 'LT1') ??
        roomRows.find((room) => String(room.id) === roomId) ??
        roomRows[0]
      const selectedId = preferred.id
      setRoomId(String(selectedId))
      const availability = await fetchRoomAvailability(selectedId)
      setSlots(availability.slots)
      setBlocks(availability.blocks)
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  async function onSelectRoom(nextId: string) {
    setRoomId(nextId)
    setError(null)
    try {
      const availability = await fetchRoomAvailability(Number(nextId))
      setSlots(availability.slots)
      setBlocks(availability.blocks)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Could not load room availability',
      )
    }
  }

  const selected = rooms.find((room) => String(room.id) === roomId)
  const weekdayToday = todayWeekday()
  const availableToday = slots.filter(
    (slot) => slot.weekday === weekdayToday && slot.state === 'available',
  ).length
  const unavailable = slots.filter((slot) => slot.state === 'unavailable').length
  const reserved = slots.filter((slot) => slot.state === 'reserved').length
  const weekEnd = addDays(weekStart, 6)
  const visibleBlocks = useMemo(
    () =>
      blocks.filter(
        (block) =>
          block.recurring ||
          rangesOverlap(
            block.starts_on,
            block.ends_on,
            isoDate(weekStart),
            isoDate(weekEnd),
          ),
      ),
    [blocks, weekEnd, weekStart],
  )

  function cycle(weekday: Weekday, period: Period) {
    setSlots((current) =>
      current.map((slot) =>
        slot.weekday === weekday && slot.period === period
          ? { ...slot, state: cycleRoomState(slot.state) }
          : slot,
      ),
    )
  }

  async function onSave() {
    if (!roomId) {
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const body = await saveRoomAvailability(Number(roomId), slots)
      setSlots(body.slots)
      setBlocks(body.blocks)
      setMessage('Room availability saved.')
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Could not save room availability',
      )
    } finally {
      setSaving(false)
    }
  }

  async function onAddBlock(event: FormEvent) {
    event.preventDefault()
    if (!form.starts_on || !form.ends_on || !form.reason.trim()) {
      setFormError('Enter a start date, end date and reason.')
      return
    }
    setFormError(null)
    try {
      await createRoomBlock(Number(roomId), {
        starts_on: form.starts_on,
        ends_on: form.ends_on,
        start_period: form.start_period === 'all' ? null : form.start_period,
        end_period: form.end_period === 'all' ? null : form.end_period,
        reason: form.reason.trim(),
        kind: form.kind,
        recurring: form.recurring,
      })
      setModalOpen(false)
      const availability = await fetchRoomAvailability(Number(roomId))
      setSlots(availability.slots)
      setBlocks(availability.blocks)
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.detail : 'Could not add the block')
    }
  }

  const fridayUnavailable = slots.some(
    (slot) => slot.weekday === 'fri' && slot.state === 'unavailable',
  )
  const reservedWeekdays = WEEKDAYS.filter((day) =>
    slots.some((slot) => slot.weekday === day && slot.state === 'reserved'),
  )

  return (
    <RoleShell>
      <PageHeader
        title="Room Availability"
        description="Manage recurring and temporary availability windows consumed by ClashFree scheduling and repair logic."
        actions={
          <Button onClick={() => void onSave()} disabled={!roomId || saving}>
            Update Availability
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Rooms Tracked"
          value={String(rooms.length)}
          hint="All campus teaching spaces"
          tint="blue"
        />
        <MetricCard
          label="Available Today"
          value={String(availableToday)}
          hint={`Slots on ${WEEKDAY_FULL[weekdayToday]}`}
          tint="green"
        />
        <MetricCard
          label="Temporarily Closed"
          value={String(unavailable)}
          hint="Unavailable periods"
          tint="lavender"
        />
        <MetricCard
          label="Planned Blocks"
          value={String(blocks.length)}
          hint="Maintenance/reservations"
          tint="amber"
        />
        <MetricCard
          label="Availability Gaps"
          value={String(reserved)}
          hint="Reserved for other use"
          tint="rose"
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
          Room availability could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">No rooms are in the catalogue.</p>
      ) : null}
      {state === 'ready' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[12rem]">
                <Select
                  label="Room"
                  value={roomId}
                  options={rooms.map((room) => ({
                    value: String(room.id),
                    label: room.code,
                  }))}
                  onValueChange={(value) => void onSelectRoom(value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStart((current) => addDays(current, -7))}
                >
                  Previous Week
                </Button>
                <p className="self-center text-sm text-muted-foreground">
                  Week of{' '}
                  {weekStart.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStart((current) => addDays(current, 7))}
                >
                  Next Week
                </Button>
              </div>
            </div>
            <h2 className="mb-2 text-base font-semibold">
              {selected?.code ?? 'Room'} — Weekly Availability
            </h2>
            <AvailabilityGrid
              slots={slots}
              onCycle={cycle}
              caption="Room weekly availability"
            />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Available</span>
              <span>Reserved</span>
              <span>Unavailable</span>
            </div>
          </Card>
          <div className="grid gap-4">
            <Card>
              <h2 className="mb-3 text-base font-semibold">Availability Rule</h2>
              <ul className="grid gap-3">
                <li className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Teaching hours</p>
                    <p className="text-xs text-muted-foreground">Mon–Fri, 08:00–18:00</p>
                  </div>
                  <StatusBadge variant="success">Active</StatusBadge>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Friday maintenance</p>
                    <p className="text-xs text-muted-foreground">
                      {fridayUnavailable ? 'Friday afternoon blocked' : 'No Friday block'}
                    </p>
                  </div>
                  <StatusBadge variant={fridayUnavailable ? 'warning' : 'neutral'}>
                    {fridayUnavailable ? 'Recurring' : 'Off'}
                  </StatusBadge>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Event reservation</p>
                    <p className="text-xs text-muted-foreground">
                      {reservedWeekdays.length > 0
                        ? reservedWeekdays.map((day) => WEEKDAY_FULL[day]).join(', ')
                        : 'None this template'}
                    </p>
                  </div>
                  <StatusBadge variant={reservedWeekdays.length ? 'info' : 'neutral'}>
                    {reservedWeekdays.length ? 'Reserved' : 'None'}
                  </StatusBadge>
                </li>
              </ul>
            </Card>
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Upcoming Blocks</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormError(null)
                    setModalOpen(true)
                  }}
                >
                  Add block
                </Button>
              </div>
              {visibleBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No blocks overlap this week.
                </p>
              ) : (
                <ul className="grid gap-3">
                  {visibleBlocks.map((block) => (
                    <li key={block.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {formatShortDate(block.starts_on)} ·{' '}
                          {formatPeriodWindow(block.start_period, block.end_period)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {block.reason}
                          {block.recurring ? ' · recurring' : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(block)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add availability block"
        description="Dated blocks overlay the weekly template for the selected room."
      >
        <form className="grid gap-3" onSubmit={(event) => void onAddBlock(event)}>
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
          <Select
            label="Kind"
            value={form.kind}
            options={kindOptions}
            onValueChange={(value) => setForm((current) => ({ ...current, kind: value }))}
          />
          <Input
            label="Reason"
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({ ...current, reason: event.target.value }))
            }
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(event) =>
                setForm((current) => ({ ...current, recurring: event.target.checked }))
              }
            />
            Recurring
          </label>
          <Button type="submit">Add block</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
          }
        }}
        title="Remove this block?"
        description="The weekly availability template is unchanged."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!pendingDelete || !roomId) {
            return
          }
          void deleteRoomBlock(Number(roomId), pendingDelete.id).then(async () => {
            const availability = await fetchRoomAvailability(Number(roomId))
            setSlots(availability.slots)
            setBlocks(availability.blocks)
          })
        }}
      />
    </RoleShell>
  )
}
