import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  Move,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '../../../components/Button'
import { StatusBadge } from '../../../components/StatusBadge'
import { cohortById, lecturerById, roomById } from '../../../demo/data'
import {
  availableRooms,
  courseOf,
  departmentOf,
  enrollment,
  formatPlacement,
  formatRange,
} from '../../../demo/engine'
import {
  DAY_NAMES,
  type ClassSession,
  type Conflict,
  type Placement,
  type RoomClosure,
} from '../../../demo/types'
import { cn } from '../../../lib/utils'

const hueDot = {
  blue: 'bg-[var(--event-blue-border)]',
  sky: 'bg-[var(--event-sky-border)]',
  indigo: 'bg-[var(--event-indigo-border)]',
  teal: 'bg-[var(--event-teal-border)]',
  slate: 'bg-[var(--event-slate-border)]',
} as const

const EQUIPMENT = {
  projector: 'Projector',
  workstations: 'Workstations',
  smartboard: 'Smartboard',
  audio: 'Sound system',
} as const

type ClassDetailPanelProps = {
  session: ClassSession
  schedule: ClassSession[]
  closures: RoomClosure[]
  conflicts: Conflict[]
  publishedPlacement?: Placement
  onClose: () => void
  onStartMove: () => void
  onProposeRoom: (roomId: string) => void
}

export function ClassDetailPanel({
  session,
  schedule,
  closures,
  conflicts,
  publishedPlacement,
  onClose,
  onStartMove,
  onProposeRoom,
}: ClassDetailPanelProps) {
  const course = courseOf(session)
  const department = departmentOf(session)
  const room = roomById.get(session.roomId)
  const lecturer = lecturerById.get(session.lecturerId)
  const size = enrollment(session)
  const fill = room ? Math.min(100, Math.round((size / room.capacity) * 100)) : 0
  const freeRooms = availableRooms(
    session,
    session.day,
    session.start,
    schedule,
    closures,
  ).filter((candidate) => candidate.id !== session.roomId)
  const changed =
    publishedPlacement &&
    (publishedPlacement.day !== session.day ||
      publishedPlacement.start !== session.start ||
      publishedPlacement.roomId !== session.roomId)
  const roomProblem = conflicts.some((conflict) =>
    ['room', 'closure', 'capacity', 'equipment'].includes(conflict.kind),
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span
              className={cn('size-2 rounded-full', hueDot[department.hue])}
              aria-hidden="true"
            />
            {department.name} · {session.kind}
          </p>
          <h2 className="mt-1 text-lg leading-snug font-semibold tracking-[-0.015em] text-foreground">
            {session.courseCode}
            <span className="block text-[15px] font-medium text-muted-foreground">
              {course?.title}
            </span>
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close class details"
        >
          <X />
        </Button>
      </div>

      <div className="cf-scroll min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {conflicts.length > 0 ? (
          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="rounded-[var(--radius-sm)] border border-danger-border bg-danger-subtle p-3"
                role="alert"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-danger-text">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  {conflict.title}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-foreground">
                  {conflict.detail}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-success-border bg-success-subtle px-3 py-2.5 text-[13px] font-medium text-success-text">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            No conflicts — all hard constraints satisfied
          </p>
        )}

        {changed && publishedPlacement ? (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-primary-border bg-primary-subtle/60 p-3 text-[13px]">
            <p className="flex items-center gap-2 font-medium text-primary-text">
              <StatusBadge variant="info">Draft</StatusBadge>
              Unpublished change
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-foreground">
              <span className="text-muted-foreground line-through">
                {formatPlacement(publishedPlacement, session.duration)}
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">
                {formatPlacement(session, session.duration)}
              </span>
            </p>
          </div>
        ) : null}

        <dl className="grid gap-4 text-sm">
          <Fact icon={<CalendarClock />} label="When">
            {DAY_NAMES[session.day]} · {formatRange(session.start, session.duration)}
          </Fact>
          <Fact icon={<DoorOpen />} label="Room">
            <span>
              {room?.name} · {room?.building}
            </span>
            <span className="mt-2 block">
              <span className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>
                  {size} students / {room?.capacity} seats
                </span>
                <span>{fill}%</span>
              </span>
              <span
                className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <span
                  className={cn(
                    'block h-full rounded-full',
                    size > (room?.capacity ?? 0) ? 'bg-danger' : 'bg-primary',
                  )}
                  style={{ width: `${fill}%` }}
                />
              </span>
            </span>
          </Fact>
          <Fact icon={<UserRound />} label="Lecturer">
            {lecturer?.name}
            {lecturer?.unavailable.length ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Unavailable:{' '}
                {lecturer.unavailable
                  .map(
                    (window) =>
                      `${DAY_NAMES[window.day].slice(0, 3)} ${formatRange(window.start, window.end - window.start)}`,
                  )
                  .join(', ')}
              </span>
            ) : null}
            {lecturer?.preferred ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Preference: {lecturer.preferred.label}
              </span>
            ) : null}
          </Fact>
          <Fact icon={<Users />} label="Student groups">
            {session.cohortIds.map((id) => {
              const cohort = cohortById.get(id)
              return (
                <span key={id} className="flex justify-between gap-2">
                  <span>{cohort?.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {cohort?.size}
                  </span>
                </span>
              )
            })}
          </Fact>
          <Fact icon={<Wrench />} label="Needs">
            <span className="flex flex-wrap gap-1.5">
              {course?.requires.map((item) => (
                <span
                  key={item}
                  className={cn(
                    'rounded-md border px-1.5 py-0.5 text-xs',
                    room?.equipment.includes(item)
                      ? 'border-border bg-muted text-foreground'
                      : 'border-danger-border bg-danger-subtle text-danger-text',
                  )}
                >
                  {EQUIPMENT[item]}
                </span>
              ))}
            </span>
          </Fact>
        </dl>

        {roomProblem || freeRooms.length > 0 ? (
          <section aria-labelledby="free-rooms-heading">
            <h3
              id="free-rooms-heading"
              className="text-[13px] font-semibold text-foreground"
            >
              Free rooms at this time
            </h3>
            <p className="text-xs text-muted-foreground">
              Checked against every hard constraint.
            </p>
            {freeRooms.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted-foreground">
                No suitable room is free — try moving the class instead.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-[var(--radius-sm)] border border-border">
                {freeRooms.slice(0, 4).map((candidate) => (
                  <li
                    key={candidate.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <span className="min-w-0 text-[13px]">
                      <span className="font-medium text-foreground">
                        {candidate.name}
                      </span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {candidate.building} · {candidate.capacity} seats ·{' '}
                        {Math.round((size / candidate.capacity) * 100)}% full
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onProposeRoom(candidate.id)}
                      aria-label={`Propose ${candidate.name} for ${session.courseCode}`}
                    >
                      Use
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-border p-5">
        <Button className="w-full" onClick={onStartMove}>
          <Move aria-hidden="true" />
          Move to another time…
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Or drag the class on the timetable. Changes stay in the draft until you publish.
        </p>
        {conflicts.some((conflict) => conflict.kind === 'closure') ? (
          <Button variant="outline" className="w-full" asChild>
            <Link to="/preview/admin/repair-studio">Open Repair Studio</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[1.25rem_1fr] gap-x-3">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-foreground">{children}</dd>
      </div>
    </div>
  )
}
