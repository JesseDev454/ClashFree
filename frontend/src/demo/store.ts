import { useMemo, useSyncExternalStore } from 'react'
import { b12MaintenanceClosure, initialSessions, roomById } from './data'
import {
  affectedByClosure,
  cohortLabels,
  detectConflicts,
  diffSchedules,
  enrollment,
  formatPlacement,
  lecturerName,
  moveSession,
  type RepairOption,
} from './engine'
import type { ClassSession, Placement, RoomClosure } from './types'

/*
 * Client-side store for the design-lab demonstration. State lives in
 * sessionStorage so the dashboard, timetable and repair studio stay coherent
 * as you move between them, and resets when the tab closes.
 */

export type DemoVersion = {
  number: number
  publishedAt: string
  publishedBy: string
  note: string
  changeCount: number
}

export type DemoActivity = {
  id: string
  at: string
  actor: string
  text: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  href?: string
}

export type DemoNotification = {
  id: string
  at: string
  audience: 'Administrator' | 'Lecturers' | 'Students'
  title: string
  body: string
  unread: boolean
  href?: string
}

export type RepairDecision = {
  closureId: string
  optionId: string
  optionTitle: string
  status: 'approved' | 'rejected'
  reason?: string
  at: string
}

export type DemoState = {
  schedule: ClassSession[]
  published: ClassSession[]
  versions: DemoVersion[]
  closures: RoomClosure[]
  repair: RepairDecision | null
  activity: DemoActivity[]
  notifications: DemoNotification[]
}

const STORAGE_KEY = 'clashfree-demo-v1'

function seedState(): DemoState {
  return {
    schedule: initialSessions,
    published: initialSessions,
    versions: [
      {
        number: 3,
        publishedAt: '2026-10-05T09:12:00+01:00',
        publishedBy: 'Timetable Administrator',
        note: 'Added CSC 400L section B lab sessions',
        changeCount: 4,
      },
      {
        number: 2,
        publishedAt: '2026-09-28T16:40:00+01:00',
        publishedBy: 'Timetable Administrator',
        note: 'Moved GST 401 to the Main Auditorium',
        changeCount: 2,
      },
      {
        number: 1,
        publishedAt: '2026-09-21T08:05:00+01:00',
        publishedBy: 'Timetable Administrator',
        note: 'First semester timetable',
        changeCount: 27,
      },
    ],
    closures: [],
    repair: null,
    activity: [
      {
        id: 'seed-3',
        at: '2026-10-09T15:20:00+01:00',
        actor: 'SEN Coordinator',
        text: 'confirmed SEN 400L course requirements for next semester',
        tone: 'neutral',
      },
      {
        id: 'seed-2',
        at: '2026-10-07T11:02:00+01:00',
        actor: 'Conflict monitor',
        text: 'flagged Room A08 double-booked on Tuesday 14:00–16:00',
        tone: 'danger',
        href: '/preview/admin/master-timetable?conflicts=1',
      },
      {
        id: 'seed-1',
        at: '2026-10-05T09:12:00+01:00',
        actor: 'Timetable Administrator',
        text: 'published timetable version 3',
        tone: 'success',
      },
    ],
    notifications: [],
  }
}

function load(): DemoState {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as DemoState
    }
  } catch {
    // Fall through to the seed when storage is unavailable or corrupt.
  }
  return seedState()
}

let state: DemoState | null = null
const listeners = new Set<() => void>()

function getState(): DemoState {
  if (!state) {
    state = load()
  }
  return state
}

function setState(update: (current: DemoState) => DemoState) {
  state = update(getState())
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The demo keeps working in memory without storage.
  }
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let counter = 0
function uid(prefix: string) {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

const now = () => new Date().toISOString()

function withActivity(
  current: DemoState,
  entry: Omit<DemoActivity, 'id' | 'at'>,
): DemoActivity[] {
  return [{ ...entry, id: uid('activity'), at: now() }, ...current.activity].slice(0, 30)
}

export const demoActions = {
  reset() {
    setState(() => seedState())
  },

  reportClosure() {
    setState((current) => {
      if (
        current.closures.some(
          (closure) =>
            closure.id === b12MaintenanceClosure.id && closure.status !== 'repaired',
        )
      ) {
        return current
      }
      const draft: RoomClosure = { ...b12MaintenanceClosure, reportedAt: now() }
      const affected = affectedByClosure(current.schedule, draft)
      const closure: RoomClosure = { ...draft, affectedCount: affected.length }
      return {
        ...current,
        closures: [...current.closures.filter((item) => item.id !== closure.id), closure],
        repair: null,
        activity: withActivity(current, {
          actor: 'Facilities Manager',
          text: `marked ${roomById.get(closure.roomId)?.name} unavailable Wed–Fri · ${affected.length} classes affected`,
          tone: 'danger',
          href: '/preview/admin/repair-studio',
        }),
        notifications: [
          {
            id: uid('notification'),
            at: now(),
            audience: 'Administrator',
            title: `${roomById.get(closure.roomId)?.name} closed for maintenance`,
            body: `${affected.length} scheduled classes are affected Wednesday to Friday. Open Repair Studio to review options.`,
            unread: true,
            href: '/preview/admin/repair-studio',
          },
          ...current.notifications,
        ],
      }
    })
  },

  moveClass(sessionId: string, placement: Placement) {
    setState((current) => {
      const session = current.schedule.find((item) => item.id === sessionId)
      if (!session) {
        return current
      }
      return {
        ...current,
        schedule: moveSession(current.schedule, sessionId, placement),
        activity: withActivity(current, {
          actor: 'You',
          text: `moved ${session.courseCode} to ${formatPlacement(placement, session.duration)} in the draft`,
          tone: 'info',
          href: '/preview/admin/master-timetable',
        }),
      }
    })
  },

  discardDraft() {
    setState((current) => ({
      ...current,
      schedule: current.published,
      repair: null,
      closures: current.closures.map((closure) =>
        closure.status === 'repair-approved' ? { ...closure, status: 'open' } : closure,
      ),
      activity: withActivity(current, {
        actor: 'You',
        text: 'discarded unpublished draft changes',
        tone: 'neutral',
      }),
    }))
  },

  approveRepair(closureId: string, option: RepairOption) {
    setState((current) => ({
      ...current,
      schedule: option.schedule,
      closures: current.closures.map((closure) =>
        closure.id === closureId ? { ...closure, status: 'repair-approved' } : closure,
      ),
      repair: {
        closureId,
        optionId: option.id,
        optionTitle: option.title,
        status: 'approved',
        at: now(),
      },
      activity: withActivity(current, {
        actor: 'You',
        text: `approved repair “${option.title}” · ${option.moves.length} classes in draft`,
        tone: 'info',
        href: '/preview/admin/repair-studio',
      }),
    }))
  },

  rejectRepair(closureId: string, option: RepairOption, reason: string) {
    setState((current) => ({
      ...current,
      repair: {
        closureId,
        optionId: option.id,
        optionTitle: option.title,
        status: 'rejected',
        reason,
        at: now(),
      },
      activity: withActivity(current, {
        actor: 'You',
        text: `rejected repair “${option.title}”${reason ? ` — ${reason}` : ''}`,
        tone: 'warning',
      }),
    }))
  },

  publish(note: string) {
    setState((current) => {
      const changes = diffSchedules(current.published, current.schedule)
      if (changes.length === 0) {
        return current
      }
      const number = (current.versions[0]?.number ?? 0) + 1
      const moved = changes
        .map((change) =>
          current.schedule.find((session) => session.id === change.sessionId),
        )
        .filter((session): session is ClassSession => Boolean(session))
      const lecturers = new Set(moved.map((session) => lecturerName(session)))
      const students = moved.reduce((sum, session) => sum + enrollment(session), 0)
      const groups = new Set(moved.flatMap((session) => cohortLabels(session)))
      return {
        ...current,
        published: current.schedule,
        versions: [
          {
            number,
            publishedAt: now(),
            publishedBy: 'Timetable Administrator',
            note,
            changeCount: changes.length,
          },
          ...current.versions,
        ],
        closures: current.closures.map((closure) =>
          closure.status === 'repair-approved'
            ? { ...closure, status: 'repaired' }
            : closure,
        ),
        repair: null,
        activity: withActivity(current, {
          actor: 'You',
          text: `published timetable version ${number} · ${changes.length} classes changed`,
          tone: 'success',
        }),
        notifications: [
          {
            id: uid('notification'),
            at: now(),
            audience: 'Lecturers',
            title: `Timetable v${number} published`,
            body: `${lecturers.size} lecturers notified: ${[...lecturers].join(', ')}.`,
            unread: true,
          },
          {
            id: uid('notification'),
            at: now(),
            audience: 'Students',
            title: `Timetable v${number} published`,
            body: `${students} student seats across ${[...groups].join(', ')} have an updated class.`,
            unread: true,
          },
          ...current.notifications,
        ],
      }
    })
  },

  markNotificationsRead() {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((item) => ({ ...item, unread: false })),
    }))
  },
}

export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getState, getState)
}

/** State plus the derived values every demo screen needs. */
export function useDemo() {
  const demo = useDemoState()
  const derived = useMemo(() => {
    const openClosures = demo.closures.filter((closure) => closure.status === 'open')
    const conflicts = detectConflicts(demo.schedule, demo.closures)
    const draftChanges = diffSchedules(demo.published, demo.schedule)
    const publishedConflicts = detectConflicts(demo.published, demo.closures)
    return { openClosures, conflicts, draftChanges, publishedConflicts }
  }, [demo])
  return { ...demo, ...derived, actions: demoActions }
}

export function resetDemoStoreForTests() {
  state = seedState()
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
