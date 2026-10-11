import { Columns2, History, Play, SquareStack } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../components/Button'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { WeekGrid } from '../../../components/timetable/WeekGrid'
import type { GridEvent } from '../../../components/timetable/types'
import { conflictIndex, gridDays, sessionToEvent } from '../../../demo/gridAdapters'
import { detectConflicts, type ScheduleChange } from '../../../demo/engine'
import {
  DAY_KEYS,
  type ClassSession,
  type DayKey,
  type RoomClosure,
} from '../../../demo/types'
import { useMediaQuery } from '../../../hooks/useMediaQuery'

export type CompareMode = 'before' | 'after' | 'split'

type RepairCompareProps = {
  before: ClassSession[]
  after: ClassSession[]
  moves: ScheduleChange[]
  closures: RoomClosure[]
  affectedIds: string[]
  highlightId?: string | null
  /** Changing this key replays the before → after animation. */
  playKey: string
}

function beforeEvents(
  before: ClassSession[],
  closures: RoomClosure[],
  affected: Set<string>,
) {
  const conflicts = conflictIndex(detectConflicts(before, closures))
  return before.map((session) =>
    sessionToEvent(session, {
      conflicts,
      state: affected.has(session.id) ? 'affected' : undefined,
    }),
  )
}

function afterEvents(
  after: ClassSession[],
  before: ClassSession[],
  moves: ScheduleChange[],
  closures: RoomClosure[],
) {
  const conflicts = conflictIndex(detectConflicts(after, closures))
  const moved = new Map(moves.map((move) => [move.sessionId, move]))
  const events: GridEvent[] = after.map((session) => {
    const move = moved.get(session.id)
    return sessionToEvent(session, {
      conflicts,
      state: move ? 'proposed' : undefined,
      badge: move ? (move.change === 'room' ? 'New room' : 'Moved') : undefined,
    })
  })
  for (const move of moves) {
    const original = before.find((session) => session.id === move.sessionId)
    if (original && move.change !== 'room') {
      events.push({
        ...sessionToEvent(original, { idSuffix: '-was', state: 'moved-from' }),
        subtitle: 'Previous time',
        meta: undefined,
      })
    }
  }
  return events
}

export function RepairCompare({
  before,
  after,
  moves,
  closures,
  affectedIds,
  highlightId,
  playKey,
}: RepairCompareProps) {
  const canSplit = useMediaQuery('(min-width: 1024px)')
  const [mode, setMode] = useState<CompareMode>('before')
  const [scope, setScope] = useState<'affected' | 'week'>('affected')
  // Each replay bumps this; 0 means "no pending before → after transition".
  const [replayTick, setReplayTick] = useState(1)
  const [lastPlayKey, setLastPlayKey] = useState(playKey)

  if (lastPlayKey !== playKey) {
    setLastPlayKey(playKey)
    setMode('before')
    setReplayTick((tick) => tick + 1)
  }

  useEffect(() => {
    if (replayTick === 0) return
    const id = window.setTimeout(() => setMode('after'), 650)
    return () => window.clearTimeout(id)
  }, [replayTick])

  const replay = () => {
    setMode('before')
    setReplayTick((tick) => tick + 1)
  }

  const affected = new Set(affectedIds)
  const touched = new Set<DayKey>()
  for (const move of moves) {
    touched.add(move.from.day)
    touched.add(move.to.day)
  }
  for (const id of affectedIds) {
    const session = before.find((item) => item.id === id)
    if (session) touched.add(session.day)
  }
  const dayKeys =
    scope === 'week' ? [...DAY_KEYS] : DAY_KEYS.filter((day) => touched.has(day))
  const highlight = highlightId ? new Set([highlightId, `${highlightId}-was`]) : null
  const effectiveMode = mode === 'split' && !canSplit ? 'after' : mode

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Comparison view"
          value={effectiveMode}
          onChange={(value) => {
            setReplayTick(0)
            setMode(value)
          }}
          size="sm"
          options={[
            { value: 'before', label: 'Before', icon: <History aria-hidden="true" /> },
            { value: 'after', label: 'After', icon: <SquareStack aria-hidden="true" /> },
            ...(canSplit
              ? [
                  {
                    value: 'split' as const,
                    label: 'Side by side',
                    icon: <Columns2 aria-hidden="true" />,
                  },
                ]
              : []),
          ]}
        />
        <SegmentedControl
          label="Days shown"
          value={scope}
          onChange={setScope}
          size="sm"
          options={[
            { value: 'affected', label: 'Affected days' },
            { value: 'week', label: 'Full week' },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={replay} className="ml-auto">
          <Play aria-hidden="true" />
          Replay changes
        </Button>
      </div>

      {effectiveMode === 'split' ? (
        <div className="grid grid-cols-2 gap-4">
          <figure>
            <figcaption className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Before · published
            </figcaption>
            <WeekGrid
              caption="Timetable before repair"
              days={gridDays(before, dayKeys)}
              events={beforeEvents(before, closures, affected)}
              density="compact"
              layoutPrefix="split-before"
              highlightIds={highlight}
              minColumnWidth={72}
            />
          </figure>
          <figure>
            <figcaption className="mb-2 text-xs font-semibold tracking-wide text-primary-text uppercase">
              After · proposed
            </figcaption>
            <WeekGrid
              caption="Timetable after repair"
              days={gridDays(after, dayKeys)}
              events={afterEvents(after, before, moves, closures)}
              density="compact"
              layoutPrefix="split-after"
              highlightIds={highlight}
              minColumnWidth={72}
            />
          </figure>
        </div>
      ) : (
        <WeekGrid
          caption={
            effectiveMode === 'before'
              ? 'Timetable before repair'
              : 'Timetable after repair'
          }
          days={gridDays(effectiveMode === 'before' ? before : after, dayKeys)}
          events={
            effectiveMode === 'before'
              ? beforeEvents(before, closures, affected)
              : afterEvents(after, before, moves, closures)
          }
          layoutPrefix="repair"
          highlightIds={highlight}
          minColumnWidth={dayKeys.length <= 3 ? 180 : 130}
        />
      )}
    </div>
  )
}
