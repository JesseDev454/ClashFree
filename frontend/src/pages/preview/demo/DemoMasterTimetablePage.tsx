import * as Dialog from '@radix-ui/react-dialog'
import {
  AlertTriangle,
  CalendarDays,
  Columns3,
  Download,
  Printer,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { EmptyState } from '../../../components/EmptyState'
import { PageHeader } from '../../../components/PageHeader'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { Select } from '../../../components/Select'
import { StatusBadge } from '../../../components/StatusBadge'
import { WeekGrid } from '../../../components/timetable/WeekGrid'
import type { GridTarget } from '../../../components/timetable/types'
import {
  DEMO_SESSION_LABEL,
  DEMO_WEEK_LABEL,
  cohorts,
  courseByCode,
  departments,
  lecturerById,
  lecturers,
  rooms,
} from '../../../demo/data'
import {
  cohortLabels,
  courseOf,
  formatRange,
  lecturerName,
  proposeMove,
  roomName,
  slotVerdicts,
  type MoveProposal,
} from '../../../demo/engine'
import {
  conflictIndex,
  gridDays,
  sessionToEvent,
  verdictsToTargets,
} from '../../../demo/gridAdapters'
import { useDemo } from '../../../demo/store'
import { DAY_KEYS, DAY_NAMES, DAY_SHORT, type DayKey } from '../../../demo/types'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { ClassDetailPanel } from './ClassDetailPanel'
import { DemoShell } from './DemoShell'
import { MoveProposalDialog } from './MoveProposalDialog'

type View = 'week' | 'day'

const legend = [
  { label: 'Software Engineering', className: 'bg-[var(--event-blue-border)]' },
  { label: 'Computer Science', className: 'bg-[var(--event-sky-border)]' },
  { label: 'Information Systems', className: 'bg-[var(--event-indigo-border)]' },
  { label: 'General Studies', className: 'bg-[var(--event-slate-border)]' },
]

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function DemoMasterTimetablePage() {
  const demo = useDemo()
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isWide = useMediaQuery('(min-width: 1280px)')
  const [chosenView, setView] = useState<View | null>(null)
  const view: View = chosenView ?? (isMobile ? 'day' : 'week')
  const [day, setDay] = useState<DayKey>('tue')
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [cohort, setCohort] = useState('all')
  const [lecturer, setLecturer] = useState('all')
  const [room, setRoom] = useState('all')
  const conflictsOnly = searchParams.get('conflicts') === '1'
  const selectedId = searchParams.get('class')
  const [dragId, setDragId] = useState<string | null>(null)
  const [pickingId, setPickingId] = useState<string | null>(null)
  const [proposal, setProposal] = useState<MoveProposal | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)

  const conflictMap = useMemo(() => conflictIndex(demo.conflicts), [demo.conflicts])
  const changedIds = useMemo(
    () => new Set(demo.draftChanges.map((change) => change.sessionId)),
    [demo.draftChanges],
  )
  const publishedById = useMemo(
    () => new Map(demo.published.map((session) => [session.id, session])),
    [demo.published],
  )

  const filtered = demo.schedule.filter((session) => {
    const course = courseOf(session)
    if (department !== 'all' && course?.department !== department) return false
    if (cohort !== 'all' && !session.cohortIds.includes(cohort)) return false
    if (lecturer !== 'all' && session.lecturerId !== lecturer) return false
    if (room !== 'all' && session.roomId !== room) return false
    if (conflictsOnly && !conflictMap.has(session.id)) return false
    const needle = query.trim().toLowerCase()
    if (needle) {
      const haystack =
        `${session.courseCode} ${course?.title} ${lecturerName(session)} ${roomName(session.roomId)} ${cohortLabels(session).join(' ')}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })

  const activeFilters =
    [department, cohort, lecturer, room].filter((value) => value !== 'all').length +
    (query ? 1 : 0) +
    (conflictsOnly ? 1 : 0)

  const events = filtered.map((session) =>
    sessionToEvent(session, {
      conflicts: conflictMap,
      state: changedIds.has(session.id) ? 'proposed' : undefined,
      badge: changedIds.has(session.id) ? 'Draft' : undefined,
    }),
  )

  const days = gridDays(demo.schedule, view === 'day' ? [day] : undefined)
  const placingId = dragId ?? pickingId
  const placingSession = placingId
    ? demo.schedule.find((item) => item.id === placingId)
    : undefined
  const targets: GridTarget[] | null = useMemo(
    () =>
      placingSession
        ? verdictsToTargets(slotVerdicts(placingSession, demo.schedule, demo.closures))
        : null,
    [placingSession, demo.schedule, demo.closures],
  )

  const selected = selectedId
    ? demo.schedule.find((item) => item.id === selectedId)
    : undefined

  function select(id: string | null) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('class', id)
    else next.delete('class')
    setSearchParams(next, { replace: true })
  }

  function setConflictsOnly(value: boolean) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('conflicts', '1')
    else next.delete('conflicts')
    setSearchParams(next, { replace: true })
  }

  function clearFilters() {
    setQuery('')
    setDepartment('all')
    setCohort('all')
    setLecturer('all')
    setRoom('all')
    setConflictsOnly(false)
  }

  function requestMove(id: string, targetDay: string, start: number) {
    const session = demo.schedule.find((item) => item.id === id)
    if (!session) return
    const verdict = slotVerdicts(session, demo.schedule, demo.closures).find(
      (item) => item.day === targetDay && item.start === start,
    )
    if (!verdict || verdict.status === 'invalid' || verdict.status === 'current') return
    setDragId(null)
    setPickingId(null)
    setProposal(
      proposeMove(demo.schedule, demo.closures, id, {
        day: verdict.day,
        start: verdict.start,
        roomId: verdict.roomId,
      }),
    )
  }

  function confirmProposal() {
    if (!proposal) return
    demo.actions.moveClass(proposal.session.id, proposal.to)
    toast({
      title: `${proposal.session.courseCode} moved in the draft`,
      description: 'Validated and saved as an unpublished change.',
    })
    select(proposal.session.id)
    setProposal(null)
  }

  function exportCsv() {
    downloadCsv(
      [
        ['Course', 'Title', 'Type', 'Day', 'Time', 'Room', 'Lecturer', 'Student groups'],
        ...demo.schedule.map((session) => [
          session.courseCode,
          courseByCode.get(session.courseCode)?.title ?? '',
          session.kind,
          DAY_NAMES[session.day],
          formatRange(session.start, session.duration),
          roomName(session.roomId),
          lecturerName(session),
          cohortLabels(session).join('; '),
        ]),
      ],
      'clashfree-demo-timetable.csv',
    )
    toast({
      title: 'Timetable exported',
      description: 'clashfree-demo-timetable.csv',
      tone: 'info',
    })
  }

  const currentVersion = demo.versions[0]
  const hasDraft = demo.draftChanges.length > 0
  const draftConflicts = demo.conflicts.length

  const panel = selected ? (
    <ClassDetailPanel
      session={selected}
      schedule={demo.schedule}
      closures={demo.closures}
      conflicts={conflictMap.get(selected.id) ?? []}
      publishedPlacement={publishedById.get(selected.id)}
      onClose={() => select(null)}
      onStartMove={() => {
        setPickingId(selected.id)
        if (view === 'day') setView('week')
        if (!isWide) select(null)
      }}
      onProposeRoom={(roomId) =>
        setProposal(
          proposeMove(demo.schedule, demo.closures, selected.id, {
            day: selected.day,
            start: selected.start,
            roomId,
          }),
        )
      }
    />
  ) : null

  return (
    <DemoShell wide>
      <PageHeader
        eyebrow={
          <>
            <span>{DEMO_SESSION_LABEL}</span>
            <span aria-hidden="true">·</span>
            <span>{DEMO_WEEK_LABEL}</span>
          </>
        }
        title="Master Timetable"
        description="Every class this week across Software Engineering, Computer Science and Information Systems."
        actions={
          <>
            {hasDraft ? (
              <StatusBadge variant="info" dot>
                {`Draft · ${demo.draftChanges.length} unpublished`}
              </StatusBadge>
            ) : (
              <StatusBadge variant="success" dot>
                {`Published v${currentVersion?.number ?? 1}`}
              </StatusBadge>
            )}
            <Button variant="outline" onClick={exportCsv}>
              <Download aria-hidden="true" />
              Export
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              Print
            </Button>
          </>
        }
      />

      <Card className="cf-no-print mb-4 p-3 sm:p-3">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="relative min-w-[12rem] flex-1 basis-56">
            <span className="sr-only">Search classes</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search course, lecturer, room…"
              className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-subtle-foreground hover:border-border-strong"
            />
          </label>
          <div className="grid min-w-0 flex-[3] basis-[36rem] grid-cols-2 gap-2.5 md:grid-cols-4">
            <Select
              label="Department"
              value={department}
              onValueChange={setDepartment}
              options={[
                { value: 'all', label: 'All departments' },
                ...Object.values(departments).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
            <Select
              label="Level / section"
              value={cohort}
              onValueChange={setCohort}
              options={[
                { value: 'all', label: 'All groups' },
                ...cohorts.map((item) => ({ value: item.id, label: item.label })),
              ]}
            />
            <Select
              label="Lecturer"
              value={lecturer}
              onValueChange={setLecturer}
              options={[
                { value: 'all', label: 'All lecturers' },
                ...lecturers.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <Select
              label="Room"
              value={room}
              onValueChange={setRoom}
              options={[
                { value: 'all', label: 'All rooms' },
                ...rooms.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <SegmentedControl
            label="Timetable view"
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: 'week', label: 'Week', icon: <Columns3 aria-hidden="true" /> },
              { value: 'day', label: 'Day', icon: <CalendarDays aria-hidden="true" /> },
            ]}
          />
          {view === 'day' ? (
            <SegmentedControl
              label="Day"
              value={day}
              onChange={setDay}
              size="sm"
              options={DAY_KEYS.map((key) => ({ value: key, label: DAY_SHORT[key] }))}
            />
          ) : null}
          <button
            type="button"
            aria-pressed={conflictsOnly}
            onClick={() => setConflictsOnly(!conflictsOnly)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-xs font-medium transition-colors duration-[var(--duration-hover)]',
              conflictsOnly
                ? 'border-danger-border bg-danger-subtle text-danger-text'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Conflicts only
            <span className="rounded bg-card/70 px-1 tabular-nums">{draftConflicts}</span>
          </button>
          {activeFilters > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X aria-hidden="true" />
              Clear {activeFilters} {activeFilters === 1 ? 'filter' : 'filters'}
            </Button>
          ) : null}
          <p
            className="ml-auto text-xs text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            Showing {filtered.length} of {demo.schedule.length} classes
          </p>
        </div>
      </Card>

      <AnimatePresence initial={false}>
        {pickingId && placingSession ? (
          <motion.div
            key="pick-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] border border-primary-border bg-primary-subtle px-4 py-3 text-sm">
              <p className="flex-1 text-foreground">
                <span className="font-semibold">
                  Choose a new time for {placingSession.courseCode}.
                </span>{' '}
                Blue slots are free, amber slots need a different room, hatched slots
                explain why they are blocked. Use Tab to move between slots.
              </p>
              <Button variant="outline" size="sm" onClick={() => setPickingId(null)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {demo.conflicts.length > 0 && !pickingId ? (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] border border-danger-border bg-danger-subtle px-4 py-3"
          role="region"
          aria-label="Conflicts"
        >
          <AlertTriangle className="size-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="min-w-0 flex-1 basis-60 text-sm text-foreground">
            <span className="font-semibold text-danger-text">
              {demo.conflicts.length}{' '}
              {demo.conflicts.length === 1 ? 'conflict needs' : 'conflicts need'}{' '}
              attention.
            </span>{' '}
            {demo.conflicts[0].title} — {DAY_NAMES[demo.conflicts[0].day]}{' '}
            {formatRange(demo.conflicts[0].start, 60).split('–')[0]}.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => select(demo.conflicts[0].sessionIds[0])}
          >
            Inspect
          </Button>
          {!conflictsOnly ? (
            <Button size="sm" variant="ghost" onClick={() => setConflictsOnly(true)}>
              Show only conflicts
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-start gap-4">
        <Card className="min-w-0 flex-1 p-3 sm:p-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={conflictsOnly ? <AlertTriangle /> : <Search />}
              tone={conflictsOnly ? 'success' : 'neutral'}
              title={conflictsOnly ? 'No conflicts' : 'No classes match these filters'}
              description={
                conflictsOnly
                  ? 'Every class satisfies the hard constraints.'
                  : 'Try another department, group or search term.'
              }
              actions={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <WeekGrid
              caption={
                view === 'week'
                  ? 'Weekly master timetable'
                  : `${DAY_NAMES[day]} timetable`
              }
              days={days}
              events={events}
              selectedId={selectedId}
              onSelect={(id) => select(id === selectedId ? null : id)}
              highlightIds={
                dragId || pickingId || !selected || !conflictMap.has(selected.id)
                  ? null
                  : new Set(
                      (conflictMap.get(selected.id) ?? []).flatMap(
                        (conflict) => conflict.sessionIds,
                      ),
                    )
              }
              canDrag={() => !pickingId}
              targets={targets}
              onDragStart={setDragId}
              onDragCancel={() => setDragId(null)}
              onDrop={requestMove}
              pickingId={pickingId}
              onCancelPick={() => setPickingId(null)}
              layoutPrefix="master"
              minColumnWidth={view === 'day' ? 240 : isWide && panel ? 124 : 150}
            />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
            {legend.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span
                  className={cn('size-2.5 rounded-sm', item.className)}
                  aria-hidden="true"
                />
                {item.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-danger" aria-hidden="true" />
              Conflict
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-4 rounded-sm shadow-[inset_0_0_0_1.5px_var(--primary)]"
                aria-hidden="true"
              />
              Unpublished draft change
            </span>
          </div>
        </Card>

        <AnimatePresence initial={false}>
          {isWide && panel ? (
            <motion.aside
              key="detail"
              aria-label="Class details"
              initial={{ opacity: 0, x: 24, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 352 }}
              exit={{ opacity: 0, x: 24, width: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              className="sticky top-[calc(var(--topbar-height)+1rem)] shrink-0 overflow-hidden"
            >
              <Card className="h-[calc(100vh-var(--topbar-height)-2rem)] w-[352px] p-0">
                {panel}
              </Card>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>

      {!isWide ? (
        <Dialog.Root
          open={Boolean(panel)}
          onOpenChange={(open) => (open ? null : select(null))}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="cf-overlay fixed inset-0 z-40 bg-[var(--overlay)]" />
            <Dialog.Content
              aria-describedby={undefined}
              className="cf-sheet fixed inset-y-0 right-0 z-50 w-[min(26rem,100vw)] bg-card shadow-overlay"
            >
              <Dialog.Title className="sr-only">Class details</Dialog.Title>
              {panel}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}

      <AnimatePresence>
        {hasDraft ? (
          <motion.div
            key="draft-tray"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className="cf-no-print sticky bottom-4 z-20 mt-4"
          >
            <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card/95 px-4 py-3 shadow-overlay backdrop-blur">
              <span
                className="flex size-8 items-center justify-center rounded-full bg-primary-subtle text-primary"
                aria-hidden="true"
              >
                <Upload className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {demo.draftChanges.length} unpublished{' '}
                  {demo.draftChanges.length === 1 ? 'change' : 'changes'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {draftConflicts === 0
                    ? 'All hard constraints satisfied — ready to publish.'
                    : `${draftConflicts} ${draftConflicts === 1 ? 'conflict remains' : 'conflicts remain'} in the draft.`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => demo.actions.discardDraft()}
              >
                Discard
              </Button>
              <Button size="sm" onClick={() => setPublishOpen(true)}>
                Publish v{(currentVersion?.number ?? 0) + 1}…
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MoveProposalDialog
        proposal={proposal}
        onCancel={() => setProposal(null)}
        onConfirm={confirmProposal}
      />
      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`Publish timetable version ${(currentVersion?.number ?? 0) + 1}?`}
        description={`${demo.draftChanges.length} ${demo.draftChanges.length === 1 ? 'class changes' : 'classes change'}. Affected lecturers and students are notified, and version ${currentVersion?.number ?? 1} stays available in history.${draftConflicts > 0 ? ` ${draftConflicts} unrelated conflict${draftConflicts === 1 ? '' : 's'} will remain flagged.` : ''}`}
        confirmLabel="Publish"
        onConfirm={() => {
          const lecturerNames = new Set(
            demo.draftChanges.map((change) => {
              const session = demo.schedule.find((item) => item.id === change.sessionId)
              return session ? lecturerById.get(session.lecturerId)?.name : ''
            }),
          )
          demo.actions.publish('Manual adjustments from the master timetable')
          toast({
            title: `Version ${(currentVersion?.number ?? 0) + 1} published`,
            description: `${lecturerNames.size} ${lecturerNames.size === 1 ? 'lecturer' : 'lecturers'} and their students were notified.`,
          })
        }}
      />
    </DemoShell>
  )
}
