import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Cpu,
  DoorClosed,
  Info,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  Siren,
  Sparkles,
  Undo2,
  XCircle,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../../components/Button'
import { Card, CardHeader } from '../../../components/Card'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { EmptyState } from '../../../components/EmptyState'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { Stepper } from '../../../components/Stepper'
import { DEMO_SESSION_LABEL, roomById, rooms } from '../../../demo/data'
import {
  affectedByClosure,
  courseOf,
  departmentOf,
  detectConflicts,
  diffSchedules,
  enrollment,
  formatPlacement,
  formatRange,
  lecturerName,
  planRepairOptions,
  type RepairOption,
  type ScheduleChange,
} from '../../../demo/engine'
import { useDemo } from '../../../demo/store'
import {
  DAY_END,
  DAY_NAMES,
  DAY_START,
  type ClassSession,
  type RoomClosure,
} from '../../../demo/types'
import { listItemVariants, listVariants, transitions } from '../../../lib/motion'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { DemoShell } from './DemoShell'
import { RepairCompare } from './RepairCompare'

const STEPS = [
  { id: 'disruption', label: 'Disruption' },
  { id: 'impact', label: 'Impact' },
  { id: 'options', label: 'Options' },
  { id: 'compare', label: 'Compare' },
  { id: 'approve', label: 'Approve' },
  { id: 'publish', label: 'Publish' },
]

const hueDot = {
  blue: 'bg-[var(--event-blue-border)]',
  sky: 'bg-[var(--event-sky-border)]',
  indigo: 'bg-[var(--event-indigo-border)]',
  teal: 'bg-[var(--event-teal-border)]',
  slate: 'bg-[var(--event-slate-border)]',
} as const

type EngineRun = {
  options: RepairOption[]
  elapsedMs: number
  candidatesChecked: number
  completedSteps: number
}

const CHANGE_LABEL = {
  room: 'New room',
  time: 'New time',
  'room-and-time': 'New room & time',
} as const

function formatDays(closure: RoomClosure) {
  const first = DAY_NAMES[closure.days[0]]
  const last = DAY_NAMES[closure.days[closure.days.length - 1]]
  const allDay = closure.start <= DAY_START && closure.end >= DAY_END
  return `${first}–${last} · ${allDay ? 'all day' : formatRange(closure.start, closure.end - closure.start)}`
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DemoRepairStudioPage() {
  const demo = useDemo()
  const [run, setRun] = useState<EngineRun | null>(null)
  const [running, setRunning] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [publishOpen, setPublishOpen] = useState(false)

  const closure =
    demo.closures.find((item) => item.status !== 'repaired') ??
    [...demo.closures].reverse().find((item) => item.status === 'repaired')
  const approved = closure?.status === 'repair-approved'
  const published = closure?.status === 'repaired'
  const rejected =
    demo.repair?.status === 'rejected' && demo.repair.closureId === closure?.id

  const baseSchedule = approved || published ? demo.published : demo.schedule
  const affected = useMemo(
    () =>
      closure
        ? affectedByClosure(approved ? demo.published : demo.schedule, closure)
        : [],
    [closure, approved, demo.published, demo.schedule],
  )
  const selectedOption =
    run?.options.find((option) => option.id === selectedOptionId) ??
    run?.options[0] ??
    null

  const approvedMoves: ScheduleChange[] = useMemo(
    () => (approved ? diffSchedules(demo.published, demo.schedule) : []),
    [approved, demo.published, demo.schedule],
  )

  const moves = approved ? approvedMoves : (selectedOption?.moves ?? [])
  const afterSchedule = approved
    ? demo.schedule
    : (selectedOption?.schedule ?? demo.schedule)
  const unrelatedConflicts = detectConflicts(afterSchedule, demo.closures).filter(
    (conflict) => conflict.kind !== 'closure',
  )

  const stage = !closure ? 0 : published ? 6 : approved ? 5 : running ? 2 : run ? 3 : 1

  async function runEngine() {
    if (!closure) return
    setRunning(true)
    setRun(null)
    const started = performance.now()
    const options = planRepairOptions(demo.schedule, demo.closures, closure)
    const elapsedMs = performance.now() - started
    const periods = (DAY_END - DAY_START) / 60
    const candidatesChecked = affected.length * (rooms.length * periods * 5)
    // Reveal each completed stage in turn so the work reads clearly; the results
    // above were already computed and are shown with their real timing.
    for (let step = 1; step <= 4; step += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 260))
      setRun({ options, elapsedMs, candidatesChecked, completedSteps: step })
    }
    setSelectedOptionId(options[0]?.id ?? null)
    setRunning(false)
  }

  function approve() {
    if (!closure || !selectedOption) return
    demo.actions.approveRepair(closure.id, selectedOption)
    setRun(null)
    toast({
      title: 'Repair approved',
      description: `${selectedOption.moves.length} classes updated in the draft. Publish to notify people.`,
    })
  }

  function reject() {
    if (!closure || !selectedOption) return
    demo.actions.rejectRepair(closure.id, selectedOption, rejectReason.trim())
    setRejectOpen(false)
    setRejectReason('')
    toast({
      title: 'Repair option rejected',
      description: 'The published timetable is unchanged.',
      tone: 'warning',
    })
  }

  const nextVersion = (demo.versions[0]?.number ?? 0) + 1
  const movedSessions = moves
    .map((move) => afterSchedule.find((session) => session.id === move.sessionId))
    .filter((session): session is ClassSession => Boolean(session))
  const studentsNotified = movedSessions.reduce(
    (sum, session) => sum + enrollment(session),
    0,
  )
  const lecturersNotified = new Set(movedSessions.map((session) => session.lecturerId))
    .size

  return (
    <DemoShell>
      <PageHeader
        eyebrow={
          <>
            <span>Timetable repair</span>
            <span aria-hidden="true">·</span>
            <span>{DEMO_SESSION_LABEL}</span>
          </>
        }
        title="Repair Studio"
        description="Turn a disruption into a validated, reviewable timetable change — nothing reaches students until you approve and publish."
        actions={
          closure ? (
            published ? (
              <StatusBadge variant="success" dot>
                {`Published v${demo.versions[0]?.number}`}
              </StatusBadge>
            ) : approved ? (
              <StatusBadge variant="info" dot>
                Approved · awaiting publication
              </StatusBadge>
            ) : (
              <StatusBadge variant="danger" dot>
                Disruption open
              </StatusBadge>
            )
          ) : undefined
        }
      />

      <Card className="mb-6 px-4 py-3">
        <Stepper steps={STEPS} current={stage} label="Repair progress" />
      </Card>

      {!closure ? (
        <Card>
          <EmptyState
            icon={<ShieldCheck />}
            tone="success"
            title="No open disruptions"
            description={
              <>
                When Facilities closes a room or a lecturer becomes unavailable, the
                affected classes appear here with validated repair options. To walk
                through the demonstration, simulate the Room B12 maintenance report.
              </>
            }
            actions={
              <>
                <Button
                  onClick={() => {
                    demo.actions.reportClosure()
                    toast({
                      title: 'Room B12 marked unavailable',
                      description: 'Facilities reported a closure Wednesday–Friday.',
                      tone: 'warning',
                    })
                  }}
                >
                  <Siren aria-hidden="true" />
                  Simulate B12 maintenance (demo)
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/preview/admin/master-timetable">Open Master Timetable</Link>
                </Button>
              </>
            }
          />
        </Card>
      ) : published ? (
        <PublishedSummary
          version={demo.versions[0]?.number ?? nextVersion}
          closure={closure}
          notifications={demo.notifications.slice(0, 2).map((item) => item.body)}
          onReset={() => {
            demo.actions.reset()
            setRun(null)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-4">
            <DisruptionCard closure={closure} affectedCount={affected.length} />
            <Card className="p-0">
              <div className="p-5 pb-0">
                <CardHeader
                  title="Affected classes"
                  description={
                    moves.length > 0
                      ? `${moves.length} of ${affected.length} placed by the ${approved ? 'approved' : 'selected'} option`
                      : `${affected.length} classes are booked in ${roomById.get(closure.roomId)?.name} while it is closed`
                  }
                />
              </div>
              <motion.ul
                variants={listVariants}
                initial="initial"
                animate="animate"
                className="divide-y divide-border border-t border-border"
              >
                {affected.map((session) => {
                  const move = moves.find((item) => item.sessionId === session.id)
                  return (
                    <motion.li
                      key={session.id}
                      variants={listItemVariants}
                      onMouseEnter={() => setHoverId(session.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onFocus={() => setHoverId(session.id)}
                      onBlur={() => setHoverId(null)}
                      tabIndex={0}
                      className={cn(
                        'px-5 py-3 outline-none transition-colors focus-visible:bg-muted',
                        hoverId === session.id && 'bg-muted/70',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            hueDot[departmentOf(session).hue],
                          )}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                            <span className="truncate">
                              {session.courseCode}
                              <span className="font-normal text-muted-foreground">
                                {' '}
                                · {session.kind}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                              {enrollment(session)} students
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                            {formatPlacement(session, session.duration)}
                          </p>
                          <AnimatePresence mode="wait" initial={false}>
                            {move ? (
                              <motion.p
                                key="resolved"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={transitions.fade}
                                className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-success-text"
                              >
                                <ArrowRight
                                  className="size-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  {formatPlacement(move.to, session.duration)}
                                </span>
                              </motion.p>
                            ) : (
                              <motion.p
                                key="open"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="mt-1 flex items-center gap-1.5 text-[13px] text-danger-text"
                              >
                                <CircleAlert
                                  className="size-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                Needs a new room or time
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </motion.ul>
            </Card>
          </div>

          <div className="min-w-0 space-y-6 xl:col-span-8">
            {approved ? (
              <ApprovedCard
                optionTitle={demo.repair?.optionTitle ?? 'Approved repair'}
                moves={moves.length}
                students={studentsNotified}
                lecturers={lecturersNotified}
              />
            ) : (
              <EngineCard
                running={running}
                run={run}
                affectedCount={affected.length}
                roomLabel={roomById.get(closure.roomId)?.name ?? closure.roomId}
                onRun={() => void runEngine()}
                rejectedReason={
                  rejected ? demo.repair?.reason || 'No reason given' : null
                }
                rejectedTitle={rejected ? demo.repair?.optionTitle : undefined}
              />
            )}

            {!approved && run && run.completedSteps >= 4 ? (
              <OptionPicker
                options={run.options}
                selectedId={selectedOption?.id ?? null}
                onSelect={setSelectedOptionId}
              />
            ) : null}

            {moves.length > 0 && (approved || (run && run.completedSteps >= 4)) ? (
              <>
                <ImpactStrip
                  affected={affected.length}
                  resolved={moves.length}
                  students={studentsNotified}
                  lecturers={lecturersNotified}
                  unchanged={baseSchedule.length - moves.length}
                />
                <Card>
                  <CardHeader
                    title="Before and after"
                    description={
                      approved
                        ? 'Published timetable compared with the approved draft.'
                        : 'Published timetable compared with the proposed repair. Moved classes glide to their new slots.'
                    }
                  />
                  <RepairCompare
                    before={approved ? demo.published : demo.schedule}
                    after={afterSchedule}
                    moves={moves}
                    closures={demo.closures}
                    affectedIds={affected.map((session) => session.id)}
                    highlightId={hoverId}
                    playKey={approved ? 'approved' : (selectedOption?.id ?? 'none')}
                  />
                </Card>
                <div className="grid grid-cols-1 gap-6 2xl:grid-cols-5">
                  <Card className="2xl:col-span-3">
                    <CardHeader
                      title="Changes"
                      description="Every class this repair touches."
                    />
                    <ChangeTable moves={moves} schedule={afterSchedule} />
                  </Card>
                  <Card className="2xl:col-span-2">
                    <CardHeader
                      title="Constraint validation"
                      description="Checked for every moved class."
                    />
                    <ValidationList
                      option={approved ? null : selectedOption}
                      unrelated={unrelatedConflicts.length}
                    />
                  </Card>
                </div>
              </>
            ) : null}
          </div>

          {(moves.length > 0 && run && run.completedSteps >= 4) || approved ? (
            <div className="sticky bottom-4 z-20 xl:col-span-12">
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={transitions.panel}
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card/95 px-4 py-3 shadow-overlay backdrop-blur"
              >
                {approved ? (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary-border bg-primary-subtle px-2.5 text-xs font-semibold tracking-wide text-primary-text uppercase">
                    <Check className="size-3.5" aria-hidden="true" />
                    Approved · draft
                  </span>
                ) : (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-warning bg-warning-subtle px-2.5 text-xs font-semibold tracking-wide text-warning-text uppercase">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    Proposed
                  </span>
                )}
                <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
                  {approved
                    ? `Saved to the draft. Publishing creates version ${nextVersion} and notifies ${lecturersNotified} lecturers and ${studentsNotified} students.`
                    : 'Nothing has changed for students or lecturers yet. Approve to save this option to the draft.'}
                </p>
                {approved ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        demo.actions.discardDraft()
                        toast({
                          title: 'Approval undone',
                          description: 'The draft matches the published timetable again.',
                          tone: 'info',
                        })
                      }}
                    >
                      <Undo2 aria-hidden="true" />
                      Undo approval
                    </Button>
                    <Button onClick={() => setPublishOpen(true)}>
                      Publish v{nextVersion}…
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setRejectOpen(true)}>
                      Reject
                    </Button>
                    <Button
                      onClick={approve}
                      disabled={!selectedOption || selectedOption.hardViolations > 0}
                    >
                      Approve option
                    </Button>
                  </>
                )}
              </motion.div>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this repair option?"
        description="The published timetable stays as it is. You can pick another option or run the engine again."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            reject()
          }}
        >
          <label
            htmlFor="reject-reason"
            className="text-[13px] font-medium text-foreground"
          >
            Reason{' '}
            <span className="font-normal text-muted-foreground">
              (shared in the activity log)
            </span>
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={3}
            placeholder="e.g. LT1 is reserved for convocation rehearsals"
            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Reject option
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`Publish timetable version ${nextVersion}?`}
        description={`${moves.length} classes change. ${lecturersNotified} lecturers and ${studentsNotified} students are notified, and version ${nextVersion - 1} stays available in history for rollback.`}
        confirmLabel="Publish"
        onConfirm={() => {
          demo.actions.publish(
            `Repair: ${roomById.get(closure?.roomId ?? '')?.name} closure`,
          )
          toast({
            title: `Version ${nextVersion} published`,
            description: `${lecturersNotified} lecturers and ${studentsNotified} students notified.`,
          })
        }}
      />
    </DemoShell>
  )
}

function DisruptionCard({
  closure,
  affectedCount,
}: {
  closure: RoomClosure
  affectedCount: number
}) {
  const room = roomById.get(closure.roomId)
  return (
    <Card className="relative overflow-hidden">
      <span
        className="cf-hatch-danger absolute inset-x-0 top-0 h-1.5"
        aria-hidden="true"
      />
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-danger-subtle text-danger"
          aria-hidden="true"
        >
          <DoorClosed className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Room closure
          </p>
          <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-foreground">
            {room?.name} unavailable
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{closure.reason}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[13px]">
        <div>
          <dt className="text-xs text-muted-foreground">When</dt>
          <dd className="font-medium text-foreground">{formatDays(closure)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Room</dt>
          <dd className="font-medium text-foreground">
            {room?.building} · {room?.capacity} seats
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Reported by</dt>
          <dd className="font-medium text-foreground">{closure.reportedBy}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Reported</dt>
          <dd className="font-medium text-foreground">
            {formatWhen(closure.reportedAt)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 flex items-center gap-2 rounded-[var(--radius-sm)] bg-danger-subtle px-3 py-2 text-[13px] font-medium text-danger-text">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        {affectedCount} scheduled {affectedCount === 1 ? 'class is' : 'classes are'}{' '}
        affected
      </p>
    </Card>
  )
}

type EngineCardProps = {
  running: boolean
  run: EngineRun | null
  affectedCount: number
  roomLabel: string
  onRun: () => void
  rejectedReason: string | null
  rejectedTitle?: string
}

function EngineCard({
  running,
  run,
  affectedCount,
  roomLabel,
  onRun,
  rejectedReason,
  rejectedTitle,
}: EngineCardProps) {
  const steps = [
    {
      label: 'Collect affected classes',
      detail: `${affectedCount} classes in ${roomLabel}`,
    },
    {
      label: 'Search free rooms and periods',
      detail: run
        ? `${run.candidatesChecked.toLocaleString()} room-and-time candidates`
        : 'Every room, every start time',
    },
    { label: 'Validate hard constraints', detail: '7 rules for every candidate' },
    {
      label: 'Rank by disruption',
      detail: run
        ? `${run.options.length} feasible ${run.options.length === 1 ? 'option' : 'options'}`
        : 'Fewest time changes, best room fit',
    },
  ]
  const done = run?.completedSteps ?? 0
  return (
    <Card>
      <CardHeader
        icon={<Cpu />}
        title="Repair engine"
        description="Searches for alternatives that keep every hard constraint, then ranks them by how much they disturb people’s week."
        actions={
          <Button
            onClick={onRun}
            disabled={running}
            variant={run ? 'outline' : 'primary'}
          >
            {running ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {running ? 'Searching…' : run ? 'Run again' : 'Find repair options'}
          </Button>
        }
      />
      {rejectedReason ? (
        <p className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-warning-border bg-warning-subtle px-3 py-2 text-[13px] text-foreground">
          <XCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            You rejected <span className="font-medium">“{rejectedTitle}”</span> —{' '}
            {rejectedReason}. Pick another option or run the engine again.
          </span>
        </p>
      ) : null}
      <ol className="grid gap-2 sm:grid-cols-2" aria-live="polite">
        {steps.map((step, index) => {
          const complete = index < done
          const active = running && index === done
          return (
            <li
              key={step.label}
              className={cn(
                'flex items-start gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 transition-colors duration-[var(--duration-panel)]',
                complete ? 'border-success-border bg-success-subtle/60' : 'border-border',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                  complete
                    ? 'bg-success text-white'
                    : 'border border-border-strong text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {complete ? (
                  <motion.span
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={transitions.success}
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </motion.span>
                ) : active ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="text-[10px] font-semibold tabular-nums">
                    {index + 1}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-foreground">
                  {step.label}
                  <span className="sr-only">
                    {complete ? ' — done' : active ? ' — in progress' : ''}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          )
        })}
      </ol>
      {run && done >= 4 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" aria-hidden="true" />
          Computed in {run.elapsedMs < 1 ? 'under 1' : run.elapsedMs.toFixed(1)} ms in
          your browser by the demo engine. Production repairs use the CP-SAT solver on the
          server.
        </p>
      ) : null}
    </Card>
  )
}

function OptionPicker({
  options,
  selectedId,
  onSelect,
}: {
  options: RepairOption[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (options.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<XCircle />}
          tone="danger"
          title="No feasible repair found"
          description="Every alternative breaks at least one hard constraint. Free up a room, relax a lecturer’s availability, or split the class, then run the engine again."
        />
      </Card>
    )
  }
  return (
    <section aria-labelledby="options-heading">
      <h2 id="options-heading" className="mb-3 text-[15px] font-semibold text-foreground">
        Repair options
      </h2>
      <motion.div
        role="radiogroup"
        aria-labelledby="options-heading"
        variants={listVariants}
        initial="initial"
        animate="animate"
        className="grid gap-3 md:grid-cols-3"
      >
        {options.map((option, index) => {
          const selected = option.id === selectedId
          const passed = option.checks.filter((check) => check.passed).length
          return (
            <motion.button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              variants={listItemVariants}
              onClick={() => onSelect(option.id)}
              className={cn(
                'relative flex flex-col rounded-[var(--radius)] border bg-card p-4 text-left shadow-card transition-[border-color,box-shadow] duration-[var(--duration-hover)]',
                selected
                  ? 'border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_18%,transparent)]'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Option {String.fromCharCode(65 + index)}
                </span>
                {option.recommended ? (
                  <StatusBadge variant="info">Recommended</StatusBadge>
                ) : (
                  <span
                    className={cn(
                      'size-4 rounded-full border',
                      selected ? 'border-[5px] border-primary' : 'border-border-strong',
                    )}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="mt-2 text-[15px] leading-snug font-semibold text-foreground">
                {option.title}
              </span>
              <span className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {option.summary}
              </span>
              <span className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <Metric value={option.metrics.timeChanges} label="time changes" />
                <Metric value={option.metrics.roomChanges} label="room changes" />
                <Metric value={`${option.metrics.seatFitPercent}%`} label="seat fit" />
              </span>
              <span
                className={cn(
                  'mt-3 flex items-center gap-1.5 text-xs font-medium',
                  option.hardViolations === 0 ? 'text-success-text' : 'text-danger-text',
                )}
              >
                {option.hardViolations === 0 ? (
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                ) : (
                  <XCircle className="size-3.5" aria-hidden="true" />
                )}
                {passed}/{option.checks.length} hard constraints
              </span>
            </motion.button>
          )
        })}
      </motion.div>
    </section>
  )
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <span>
      <span className="block text-lg leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">
        {value}
      </span>
      <span className="mt-1 block text-[11px] text-muted-foreground">{label}</span>
    </span>
  )
}

function ImpactStrip(props: {
  affected: number
  resolved: number
  students: number
  lecturers: number
  unchanged: number
}) {
  const items = [
    { label: 'Affected classes', value: props.affected },
    {
      label: 'Conflicts resolved',
      value: `${props.resolved}/${props.affected}`,
      good: props.resolved === props.affected,
    },
    { label: 'Students to notify', value: props.students },
    { label: 'Lecturers to notify', value: props.lecturers },
    { label: 'Classes unchanged', value: props.unchanged },
  ]
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius)] border border-border bg-border shadow-card sm:grid-cols-5 [&>div]:bg-card">
      {items.map((item) => (
        <div
          key={item.label}
          className="px-4 py-3 sm:border-l sm:border-border first:sm:border-l-0"
        >
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              'mt-1 text-xl font-semibold tracking-[-0.02em] tabular-nums',
              item.good ? 'text-success-text' : 'text-foreground',
            )}
          >
            <motion.span
              key={String(item.value)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {item.value}
            </motion.span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ChangeTable({
  moves,
  schedule,
}: {
  moves: ScheduleChange[]
  schedule: ClassSession[]
}) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-[13px]">
        <caption className="sr-only">Classes changed by this repair</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="px-1 pb-2 font-medium">
              Class
            </th>
            <th scope="col" className="px-1 pb-2 font-medium">
              Before
            </th>
            <th scope="col" className="px-1 pb-2 font-medium">
              After
            </th>
            <th scope="col" className="px-1 pb-2 font-medium">
              Change
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {moves.map((move) => {
            const session = schedule.find((item) => item.id === move.sessionId)
            if (!session) return null
            return (
              <tr key={move.sessionId}>
                <th
                  scope="row"
                  className="px-1 py-2.5 font-medium whitespace-nowrap text-foreground"
                >
                  {session.courseCode}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {courseOf(session)?.title} · {lecturerName(session)}
                  </span>
                </th>
                <td className="px-1 py-2.5 whitespace-nowrap text-muted-foreground">
                  <span className="line-through decoration-muted-foreground/60">
                    {formatPlacement(move.from, session.duration)}
                  </span>
                </td>
                <td className="px-1 py-2.5 font-medium whitespace-nowrap text-foreground">
                  {formatPlacement(move.to, session.duration)}
                </td>
                <td className="px-1 py-2.5">
                  <StatusBadge variant={move.change === 'room' ? 'info' : 'warning'}>
                    {CHANGE_LABEL[move.change]}
                  </StatusBadge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ValidationList({
  option,
  unrelated,
}: {
  option: RepairOption | null
  unrelated: number
}) {
  return (
    <div>
      {option ? (
        <ul className="grid gap-2 md:grid-cols-2 2xl:grid-cols-1">
          {option.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 text-[13px]">
              {check.passed ? (
                <CheckCircle2
                  className="mt-px size-4 shrink-0 text-success"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  className="mt-px size-4 shrink-0 text-danger"
                  aria-hidden="true"
                />
              )}
              <span>
                <span className="font-medium text-foreground">{check.label}</span>
                <span className="sr-only">{check.passed ? ' passed.' : ' failed.'}</span>
                <span className="block text-xs text-muted-foreground">
                  {check.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-start gap-2 text-[13px] text-foreground">
          <CheckCircle2
            className="mt-px size-4 shrink-0 text-success"
            aria-hidden="true"
          />
          Validated when approved — all hard constraints satisfied.
        </p>
      )}
      {option && option.softNotes.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold text-foreground">Trade-offs</p>
          <ul className="mt-1.5 grid gap-1.5">
            {option.softNotes.map((note) => (
              <li
                key={note}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {unrelated > 0 ? (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-muted px-3 py-2 text-xs text-muted-foreground">
          {unrelated} unrelated {unrelated === 1 ? 'conflict' : 'conflicts'} elsewhere in
          the timetable {unrelated === 1 ? 'is' : 'are'} unchanged by this repair.{' '}
          <Link
            to="/preview/admin/master-timetable?conflicts=1"
            className="font-medium text-primary-text underline underline-offset-2"
          >
            Review in Master Timetable
          </Link>
        </p>
      ) : null}
    </div>
  )
}

function ApprovedCard({
  optionTitle,
  moves,
  students,
  lecturers,
}: {
  optionTitle: string
  moves: number
  students: number
  lecturers: number
}) {
  return (
    <Card className="border-primary-border bg-primary-subtle/40">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <Check className="size-5" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            “{optionTitle}” approved
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {moves} classes are updated in the draft timetable. Students ({students}) and
            lecturers ({lecturers}) are notified only when you publish.
          </p>
        </div>
      </div>
    </Card>
  )
}

function PublishedSummary({
  version,
  closure,
  notifications,
  onReset,
}: {
  version: number
  closure: RoomClosure
  notifications: string[]
  onReset: () => void
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className="flex size-16 items-center justify-center rounded-full bg-success-subtle text-success"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
            />
          </svg>
        </motion.span>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-foreground">
          Version {version} published
        </h2>
        <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
          {roomById.get(closure.roomId)?.name} closure repaired with zero hard-constraint
          violations. The previous version stays in history for rollback.
        </p>
        <ul className="mt-6 grid w-full max-w-lg gap-2 text-left">
          {notifications.map((body) => (
            <li
              key={body}
              className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-[13px] text-foreground"
            >
              <CheckCircle2
                className="mt-px size-4 shrink-0 text-success"
                aria-hidden="true"
              />
              {body}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/preview/admin/master-timetable">
              <CalendarDays aria-hidden="true" />
              View Master Timetable
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/preview/admin/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
          <Button variant="ghost" onClick={onReset}>
            Reset demo
          </Button>
        </div>
      </div>
    </Card>
  )
}
