import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  fetchDraft,
  fetchPublished,
  type DraftTimetable,
  type TimetableVersion,
} from '../../api/timetables'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import { TimetableGrid } from '../../components/TimetableGrid'
import { useReload } from '../../hooks/useReload'
import { slotsToEntries } from '../../lib/timetableEntries'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

type Source = 'draft' | 'published'

export function MasterTimetablePage() {
  const [draft, setDraft] = useState<DraftTimetable | null>(null)
  const [published, setPublished] = useState<TimetableVersion | null>(null)
  const [source, setSource] = useState<Source>('draft')
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [department, setDepartment] = useState('all')
  const [cohort, setCohort] = useState('all')
  const [lecturer, setLecturer] = useState('all')
  const [room, setRoom] = useState('all')

  async function load() {
    setState('loading')
    try {
      const [nextDraft, nextPublished] = await Promise.all([
        fetchDraft(),
        fetchPublished(),
      ])
      setDraft(nextDraft)
      setPublished(nextPublished)
      if (!nextDraft && !nextPublished) {
        setState('empty')
        return
      }
      setSource(nextPublished ? 'published' : 'draft')
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const slots = useMemo(
    () => (source === 'published' ? (published?.slots ?? []) : (draft?.slots ?? [])),
    [source, published, draft],
  )

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

  const badge =
    source === 'published' && published
      ? `Published v${published.version_number}`
      : 'Draft'

  return (
    <RoleShell>
      <PageHeader
        title="Master Timetable"
        description={
          published
            ? 'University timetable for the active session. Switch to the selected draft when you need to inspect unpublished work.'
            : 'Draft university timetable for the selected solver solution.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={source === 'published' ? 'success' : 'warning'}>
              {badge}
            </StatusBadge>
            {draft && published ? (
              <div
                className="flex rounded-full border border-border bg-card p-1"
                role="group"
                aria-label="Timetable source"
              >
                <Button
                  size="sm"
                  variant={source === 'draft' ? 'primary' : 'ghost'}
                  aria-pressed={source === 'draft'}
                  onClick={() => setSource('draft')}
                >
                  Draft
                </Button>
                <Button
                  size="sm"
                  variant={source === 'published' ? 'primary' : 'ghost'}
                  aria-pressed={source === 'published'}
                  onClick={() => setSource('published')}
                >
                  Published
                </Button>
              </div>
            ) : null}
            <Button variant="outline" asChild>
              <Link to="/admin/publish-timetable">Publish Timetable</Link>
            </Button>
          </div>
        }
      />
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          The timetable could not be loaded.
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
                caption={
                  source === 'published'
                    ? 'Published master timetable'
                    : 'Draft master timetable'
                }
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
