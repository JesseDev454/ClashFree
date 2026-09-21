import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { fetchDraft, type TimetableSlot } from '../../api/timetables'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import { TimetableGrid } from '../../components/TimetableGrid'
import { useReload } from '../../hooks/useReload'
import { PERIODS, WEEKDAY_FULL, type Period, type Weekday } from '../../lib/schedule'
import type { TimetableEntry } from '../../types/timetable'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const GRID_PERIOD: Record<string, string> = {
  '08-10': '08:00-10:00',
  '10-12': '10:00-12:00',
  '12-14': '12:00-14:00',
  '14-16': '14:00-16:00',
  '16-18': '16:00-18:00',
}
const COLORS: Array<NonNullable<TimetableEntry['color']>> = [
  'blue',
  'green',
  'purple',
  'amber',
  'rose',
]

function occupiedPeriods(slot: TimetableSlot): string[] {
  const start = PERIODS.indexOf(slot.start_period as Period)
  const end = PERIODS.indexOf(slot.end_period as Period)
  if (start < 0) {
    return [slot.start_period]
  }
  const finish = end < start ? start : end
  return PERIODS.slice(start, finish + 1)
}

function slotsToEntries(slots: TimetableSlot[]): TimetableEntry[] {
  const colorFor = new Map<string, NonNullable<TimetableEntry['color']>>()
  return slots.flatMap((slot) => {
    const code = slot.course_code ?? `assignment-${slot.assignment_id}`
    if (!colorFor.has(code)) {
      colorFor.set(code, COLORS[colorFor.size % COLORS.length])
    }
    const day = WEEKDAY_FULL[slot.weekday as Weekday] ?? slot.weekday
    return occupiedPeriods(slot).map((period) => ({
      id: `${slot.id}-${period}`,
      courseCode: code,
      courseTitle: slot.course_title ?? '',
      day,
      period: GRID_PERIOD[period] ?? period,
      room: slot.room_code ?? '',
      lecturer: slot.lecturer_name ?? '',
      cohort: slot.cohort_code ?? '',
      color: colorFor.get(code),
    }))
  })
}

export function MasterTimetablePage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [department, setDepartment] = useState('all')
  const [cohort, setCohort] = useState('all')
  const [lecturer, setLecturer] = useState('all')
  const [room, setRoom] = useState('all')

  async function load() {
    setState('loading')
    try {
      const draft = await fetchDraft()
      if (!draft) {
        setSlots([])
        setState('empty')
        return
      }
      setSlots(draft.slots)
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const departments = useMemo(
    () => [
      { value: 'all', label: 'All departments' },
      ...Array.from(
        new Map(
          slots
            .filter((slot) => slot.department_id && slot.department_name)
            .map((slot) => [String(slot.department_id), slot.department_name ?? '']),
        ),
      ).map(([value, label]) => ({ value, label })),
    ],
    [slots],
  )
  const cohorts = useMemo(
    () => [
      { value: 'all', label: 'All cohorts' },
      ...Array.from(new Set(slots.map((slot) => slot.cohort_code).filter(Boolean))).map(
        (value) => ({ value: value as string, label: value as string }),
      ),
    ],
    [slots],
  )
  const lecturers = useMemo(
    () => [
      { value: 'all', label: 'All lecturers' },
      ...Array.from(new Set(slots.map((slot) => slot.lecturer_name).filter(Boolean))).map(
        (value) => ({ value: value as string, label: value as string }),
      ),
    ],
    [slots],
  )
  const rooms = useMemo(
    () => [
      { value: 'all', label: 'All rooms' },
      ...Array.from(new Set(slots.map((slot) => slot.room_code).filter(Boolean))).map(
        (value) => ({ value: value as string, label: value as string }),
      ),
    ],
    [slots],
  )

  const filtered = slots.filter((slot) => {
    if (department !== 'all' && String(slot.department_id) !== department) {
      return false
    }
    if (cohort !== 'all' && slot.cohort_code !== cohort) {
      return false
    }
    if (lecturer !== 'all' && slot.lecturer_name !== lecturer) {
      return false
    }
    if (room !== 'all' && slot.room_code !== room) {
      return false
    }
    return true
  })

  return (
    <RoleShell>
      <PageHeader
        title="Master Timetable"
        description="Draft university timetable for the selected solver solution. Publishing is Phase 6."
        actions={<StatusBadge variant="warning">Draft</StatusBadge>}
      />
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          The draft timetable could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          No draft timetable is selected.{' '}
          <Link className="font-medium text-primary" to="/admin/generate-timetable">
            Generate a timetable
          </Link>{' '}
          first.
        </p>
      ) : null}
      {state === 'ready' ? (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select
                label="Department"
                value={department}
                options={departments}
                onValueChange={setDepartment}
              />
              <Select
                label="Cohort"
                value={cohort}
                options={cohorts}
                onValueChange={setCohort}
              />
              <Select
                label="Lecturer"
                value={lecturer}
                options={lecturers}
                onValueChange={setLecturer}
              />
              <Select label="Room" value={room} options={rooms} onValueChange={setRoom} />
            </div>
          </Card>
          <Card>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes match the current filters.
              </p>
            ) : (
              <TimetableGrid
                entries={slotsToEntries(filtered)}
                caption="Draft master timetable"
                days={WEEKDAYS}
              />
            )}
          </Card>
          <p className="mt-3">
            <Button variant="outline" asChild>
              <Link to="/admin/conflict-monitor">Open Conflict Monitor</Link>
            </Button>
          </p>
        </>
      ) : null}
    </RoleShell>
  )
}
