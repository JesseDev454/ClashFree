import { AlertTriangle, ArrowRightLeft, Ban, Check, GripVertical } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { transitions } from '../../lib/motion'
import { cn } from '../../lib/utils'
import { Tooltip } from '../Tooltip'
import { layoutDay, type PositionedEvent } from './layout'
import type { GridBlock, GridDay, GridEvent, GridTarget } from './types'

const hueClass = {
  blue: 'border-l-[var(--event-blue-border)] bg-[var(--event-blue-bg)] text-[var(--event-blue-text)]',
  sky: 'border-l-[var(--event-sky-border)] bg-[var(--event-sky-bg)] text-[var(--event-sky-text)]',
  indigo:
    'border-l-[var(--event-indigo-border)] bg-[var(--event-indigo-bg)] text-[var(--event-indigo-text)]',
  teal: 'border-l-[var(--event-teal-border)] bg-[var(--event-teal-bg)] text-[var(--event-teal-text)]',
  slate:
    'border-l-[var(--event-slate-border)] bg-[var(--event-slate-bg)] text-[var(--event-slate-text)]',
} as const

const targetCellClass: Record<GridTarget['status'], string> = {
  current: 'bg-primary/5',
  valid:
    'bg-primary/[0.07] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_22%,transparent)]',
  'room-change':
    'bg-warning/[0.08] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warning)_28%,transparent)]',
  invalid: 'cf-hatch-muted',
}

type WeekGridProps = {
  days: GridDay[]
  events: GridEvent[]
  startHour?: number
  endHour?: number
  density?: 'comfortable' | 'compact'
  caption: string
  selectedId?: string | null
  onSelect?: (id: string) => void
  /** When set, other events fade so these stand out. */
  highlightIds?: ReadonlySet<string> | null
  canDrag?: (id: string) => boolean
  /** Verdicts for the event being dragged or placed. */
  targets?: GridTarget[] | null
  onDragStart?: (id: string) => void
  onDragCancel?: () => void
  onDrop?: (id: string, day: string, start: number) => void
  /** Keyboard / touch alternative to dragging: the slots become buttons. */
  pickingId?: string | null
  onCancelPick?: () => void
  blocks?: GridBlock[]
  layoutPrefix?: string
  className?: string
  minColumnWidth?: number
}

type DragState = {
  id: string
  pointerId: number
  originX: number
  originY: number
  grabX: number
  grabY: number
  width: number
  height: number
  x: number
  y: number
  active: boolean
  target: { day: string; start: number } | null
}

function formatClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function WeekGrid({
  days,
  events,
  startHour = 8,
  endHour = 18,
  density = 'comfortable',
  caption,
  selectedId,
  onSelect,
  highlightIds,
  canDrag,
  targets,
  onDragStart,
  onDragCancel,
  onDrop,
  pickingId,
  onCancelPick,
  blocks = [],
  layoutPrefix = 'grid',
  className,
  minColumnWidth = 150,
}: WeekGridProps) {
  const hourHeight = density === 'compact' ? 30 : 56
  const startMin = startHour * 60
  const endMin = endHour * 60
  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  )
  const columnRefs = useRef<Array<HTMLDivElement | null>>([])
  const suppressClick = useRef(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const positioned = useMemo(() => {
    const map = new Map<string, PositionedEvent[]>()
    for (const day of days) {
      map.set(day.key, layoutDay(events.filter((event) => event.day === day.key)))
    }
    return map
  }, [days, events])

  const targetMap = useMemo(() => {
    const map = new Map<string, GridTarget>()
    for (const target of targets ?? []) {
      map.set(`${target.day}:${target.start}`, target)
    }
    return map
  }, [targets])

  const draggedEvent = drag ? events.find((event) => event.id === drag.id) : undefined
  const placingEvent =
    draggedEvent ??
    (pickingId ? events.find((event) => event.id === pickingId) : undefined)
  const showTargets = Boolean(targets && placingEvent && (drag?.active || pickingId))

  useEffect(() => {
    if (!drag?.active && !pickingId) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (drag) {
          setDrag(null)
          onDragCancel?.()
        } else {
          onCancelPick?.()
        }
        setAnnouncement('Move cancelled.')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drag, pickingId, onDragCancel, onCancelPick])

  function locate(clientX: number, clientY: number, state: DragState, duration: number) {
    for (let index = 0; index < days.length; index += 1) {
      const column = columnRefs.current[index]
      if (!column) {
        continue
      }
      const rect = column.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) {
        const top = clientY - state.grabY - rect.top
        const slots = Math.round(top / hourHeight)
        const start = Math.min(
          Math.max(startMin + slots * 60, startMin),
          endMin - Math.max(60, Math.ceil(duration / 60) * 60),
        )
        return { day: days[index].key, start }
      }
    }
    return null
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: GridEvent,
  ) {
    if (!canDrag?.(item.id) || event.button !== 0 || pickingId) {
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      id: item.id,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      x: event.clientX,
      y: event.clientY,
      active: false,
      target: null,
    })
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: GridEvent,
  ) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const distance = Math.hypot(
      event.clientX - drag.originX,
      event.clientY - drag.originY,
    )
    const active = drag.active || distance > 5
    if (active && !drag.active) {
      onDragStart?.(item.id)
      setAnnouncement(
        `Moving ${item.title}. Valid times are highlighted. Press Escape to cancel.`,
      )
    }
    const next = { ...drag, active, x: event.clientX, y: event.clientY }
    next.target = active
      ? locate(event.clientX, event.clientY, next, item.duration)
      : null
    setDrag(next)
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>, item: GridEvent) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const current = drag
    setDrag(null)
    if (!current.active) {
      return
    }
    suppressClick.current = true
    const target = current.target
      ? targetMap.get(`${current.target.day}:${current.target.start}`)
      : undefined
    if (target && (target.status === 'valid' || target.status === 'room-change')) {
      onDrop?.(item.id, target.day, target.start)
    } else {
      setAnnouncement(target ? `Can't move here: ${target.message}` : 'Move cancelled.')
      onDragCancel?.()
    }
  }

  function pick(target: GridTarget) {
    if (!pickingId) {
      return
    }
    if (target.status === 'valid' || target.status === 'room-change') {
      onDrop?.(pickingId, target.day, target.start)
    } else {
      setAnnouncement(
        target.status === 'current'
          ? 'That is the current time.'
          : `Can't move here: ${target.message}`,
      )
    }
  }

  const hovered =
    drag?.active && drag.target
      ? targetMap.get(`${drag.target.day}:${drag.target.start}`)
      : undefined

  const minWidth = 56 + days.length * minColumnWidth

  return (
    <div className={cn('relative', className)}>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div className="cf-scroll overflow-x-auto">
        <div
          role="group"
          aria-label={caption}
          className="grid select-none"
          style={{
            gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))`,
            minWidth: days.length > 1 ? minWidth : undefined,
          }}
        >
          <div aria-hidden="true" />
          {days.map((day) => (
            <div
              key={day.key}
              className={cn(
                'flex min-w-0 items-baseline justify-between gap-2 border-b border-border px-2 whitespace-nowrap',
                density === 'compact' ? 'pb-2' : 'pb-3',
              )}
            >
              <span className="text-[13px] font-semibold text-foreground">
                <span className="hidden sm:inline">{day.label}</span>
                <span className="sm:hidden">{day.short}</span>
              </span>
              {day.note ? (
                <span
                  className={cn(
                    'truncate text-xs text-muted-foreground tabular-nums',
                    days.length > 1 && 'hidden 2xl:inline',
                  )}
                >
                  {day.note}
                </span>
              ) : null}
            </div>
          ))}

          <div className="relative" aria-hidden="true">
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="relative pr-2 text-right text-[11px] font-medium text-muted-foreground tabular-nums"
                style={{ height: hourHeight }}
              >
                <span className={cn('relative', index === 0 ? 'top-1' : '-top-2')}>
                  {formatClock(hour * 60)}
                </span>
              </div>
            ))}
          </div>

          <LayoutGroup id={layoutPrefix}>
            {days.map((day, dayIndex) => {
              const dayEvents = positioned.get(day.key) ?? []
              const dayBlocks = blocks.filter((block) => block.day === day.key)
              return (
                <div
                  key={day.key}
                  ref={(node) => {
                    columnRefs.current[dayIndex] = node
                  }}
                  role="group"
                  aria-label={day.label}
                  className="relative border-l border-border"
                  style={{ height: hours.length * hourHeight }}
                >
                  {hours.map((hour, index) => (
                    <div
                      key={hour}
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-0 border-t',
                        index === 0 ? 'border-transparent' : 'border-border/70',
                      )}
                      style={{ top: index * hourHeight, height: hourHeight }}
                    />
                  ))}

                  {dayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="cf-hatch-danger absolute inset-x-0 border-y border-danger-border/60"
                      style={{
                        top: ((block.start - startMin) / 60) * hourHeight,
                        height: ((block.end - block.start) / 60) * hourHeight,
                      }}
                    >
                      <span className="absolute right-1 bottom-1 rounded bg-card/90 px-1.5 py-0.5 text-[10.5px] font-medium text-danger-text shadow-card">
                        {block.label}
                      </span>
                    </div>
                  ))}

                  {showTargets
                    ? hours.map((hour) => {
                        const target = targetMap.get(`${day.key}:${hour * 60}`)
                        const style = {
                          top: (hour - startHour) * hourHeight,
                          height: hourHeight,
                        }
                        if (pickingId && target) {
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => pick(target)}
                              aria-disabled={target.status === 'invalid' || undefined}
                              aria-label={`${day.label} ${formatClock(hour * 60)} — ${target.message}`}
                              className={cn(
                                'absolute inset-x-0 z-[5] cursor-pointer outline-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring',
                                targetCellClass[target.status],
                              )}
                              style={style}
                            />
                          )
                        }
                        return (
                          <div
                            key={hour}
                            aria-hidden="true"
                            className={cn(
                              'pointer-events-none absolute inset-x-0',
                              target ? targetCellClass[target.status] : 'cf-hatch-muted',
                            )}
                            style={style}
                          />
                        )
                      })
                    : null}

                  {dayEvents.map((item) => (
                    <EventCard
                      key={item.id}
                      item={item}
                      layoutPrefix={layoutPrefix}
                      top={((item.start - startMin) / 60) * hourHeight}
                      height={(item.duration / 60) * hourHeight}
                      compact={density === 'compact'}
                      selected={selectedId === item.id}
                      dimmed={
                        Boolean(
                          highlightIds &&
                          highlightIds.size > 0 &&
                          !highlightIds.has(item.id),
                        ) || Boolean(pickingId && pickingId !== item.id)
                      }
                      dragging={drag?.active === true && drag.id === item.id}
                      draggable={Boolean(canDrag?.(item.id))}
                      passThrough={showTargets}
                      onClick={() => {
                        if (suppressClick.current) {
                          suppressClick.current = false
                          return
                        }
                        onSelect?.(item.id)
                      }}
                      onPointerDown={(event) => handlePointerDown(event, item)}
                      onPointerMove={(event) => handlePointerMove(event, item)}
                      onPointerUp={(event) => finishDrag(event, item)}
                      onPointerCancel={() => {
                        setDrag(null)
                        onDragCancel?.()
                      }}
                    />
                  ))}

                  <AnimatePresence>
                    {drag?.active && drag.target?.day === day.key && draggedEvent ? (
                      <motion.div
                        key="drop-preview"
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                          top: ((drag.target.start - startMin) / 60) * hourHeight + 2,
                        }}
                        exit={{ opacity: 0 }}
                        transition={transitions.lift}
                        className={cn(
                          'pointer-events-none absolute inset-x-1 z-20 rounded-md border-2 border-dashed px-2 py-1.5',
                          hovered?.status === 'valid' &&
                            'border-primary bg-primary-subtle/80',
                          hovered?.status === 'room-change' &&
                            'border-warning bg-warning-subtle/90',
                          (hovered?.status === 'invalid' || !hovered) &&
                            'border-danger bg-danger-subtle/90',
                          hovered?.status === 'current' &&
                            'border-border-strong bg-muted/80',
                        )}
                        style={{ height: (draggedEvent.duration / 60) * hourHeight - 4 }}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
              )
            })}
          </LayoutGroup>
        </div>
      </div>

      {drag?.active && draggedEvent
        ? createPortal(
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.03, rotate: -1 }}
              transition={transitions.lift}
              className={cn(
                'pointer-events-none fixed z-[70] overflow-hidden rounded-md border-l-[3px] px-2 py-1.5 opacity-95 shadow-lift',
                hueClass[draggedEvent.hue],
              )}
              style={{
                left: drag.x - drag.grabX,
                top: drag.y - drag.grabY,
                width: drag.width,
                height: drag.height,
              }}
              aria-hidden="true"
            >
              <p className="truncate text-[12.5px] font-semibold">{draggedEvent.title}</p>
              {draggedEvent.subtitle ? (
                <p className="truncate text-[11.5px] opacity-80">
                  {draggedEvent.subtitle}
                </p>
              ) : null}
            </motion.div>,
            document.body,
          )
        : null}
      {drag?.active && draggedEvent
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[71] max-w-72 rounded-md border border-border bg-card px-2.5 py-1.5 shadow-overlay"
              style={{
                left: drag.x - drag.grabX,
                top: drag.y - drag.grabY + drag.height + 8,
              }}
              aria-hidden="true"
            >
              <DropHint target={hovered} />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function DropHint({ target }: { target?: GridTarget }) {
  if (!target) {
    return (
      <p className="flex items-start gap-1.5 text-[11.5px] leading-snug font-medium text-danger-text">
        <Ban className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        Outside teaching hours
      </p>
    )
  }
  const Icon =
    target.status === 'valid'
      ? Check
      : target.status === 'room-change'
        ? ArrowRightLeft
        : Ban
  return (
    <p
      className={cn(
        'flex items-start gap-1.5 text-[11.5px] leading-snug font-medium',
        target.status === 'valid' && 'text-primary-text',
        target.status === 'room-change' && 'text-warning-text',
        target.status === 'invalid' && 'text-danger-text',
        target.status === 'current' && 'text-muted-foreground',
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span className="line-clamp-3">{target.message}</span>
    </p>
  )
}

type EventCardProps = {
  item: PositionedEvent
  layoutPrefix: string
  top: number
  height: number
  compact: boolean
  selected: boolean
  dimmed: boolean
  dragging: boolean
  draggable: boolean
  passThrough: boolean
  onClick: () => void
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerCancel: () => void
}

function EventCard({
  item,
  layoutPrefix,
  top,
  height,
  compact,
  selected,
  dimmed,
  dragging,
  draggable,
  passThrough,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: EventCardProps) {
  const width = 100 / item.lanes
  const narrow = item.lanes >= 3
  const tall = height >= 100
  const label = [
    item.title,
    item.subtitle,
    ...item.details.map((detail) => `${detail.label}: ${detail.value}`),
    item.conflict ? `Conflict: ${item.conflictText ?? 'clash'}` : '',
    item.state === 'proposed' ? 'Unpublished draft change' : '',
  ]
    .filter(Boolean)
    .join('. ')

  const card = (
    <motion.button
      type="button"
      layoutId={`${layoutPrefix}-${item.id}`}
      layout="position"
      transition={transitions.move}
      initial={false}
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'group absolute z-10 flex flex-col overflow-hidden rounded-md border-l-[3px] text-left',
        'transition-[box-shadow,opacity,filter] duration-[var(--duration-hover)]',
        'hover:z-[15] hover:shadow-raised focus-visible:z-[15]',
        compact ? 'px-1.5 py-0.5' : item.lanes >= 2 ? 'px-1.5 py-1' : 'px-2 py-1.5',
        hueClass[item.hue],
        item.conflict && 'border-l-danger ring-1 ring-danger/70 ring-inset',
        item.state === 'affected' && 'border-l-danger',
        item.state === 'proposed' &&
          'shadow-[inset_0_0_0_1.5px_var(--primary)] outline-dashed outline-1 -outline-offset-1 outline-primary/0',
        item.state === 'moved-from' &&
          'border-l-border-strong bg-transparent text-muted-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] [border-left-style:dashed]',
        selected &&
          'z-[16] shadow-raised ring-2 ring-primary ring-offset-1 ring-offset-card',
        dimmed && 'opacity-35 saturate-50',
        dragging && 'opacity-40',
        draggable && 'cursor-grab active:cursor-grabbing',
        passThrough && !dragging && 'pointer-events-none',
      )}
      style={{
        top: top + 2,
        height: Math.max(height - 4, 18),
        left: `calc(${item.lane * width}% + 3px)`,
        width: `calc(${width}% - 6px)`,
        touchAction: draggable ? 'none' : undefined,
      }}
    >
      {item.conflict ? (
        <>
          <span
            className="cf-hatch-danger pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <span
            className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-danger-solid text-white shadow-sm"
            aria-hidden="true"
          >
            <AlertTriangle className="size-2.5" strokeWidth={2.75} />
          </span>
        </>
      ) : null}
      <span
        className={cn(
          'relative flex min-w-0 items-center gap-1',
          item.conflict && 'pr-4',
        )}
      >
        <span
          className={cn(
            'truncate font-semibold tracking-[-0.01em] tabular-nums',
            compact || item.lanes >= 2 ? 'text-[11.5px]' : 'text-[12.5px]',
          )}
        >
          {item.title}
        </span>
        {item.badge && !compact && item.lanes < 2 ? (
          <span className="ml-auto shrink-0 rounded bg-card/80 px-1 text-[10px] font-semibold tracking-wide text-primary-text uppercase shadow-[0_0_0_1px_var(--primary-border)]">
            {item.badge}
          </span>
        ) : null}
        {draggable && !compact && !narrow ? (
          <GripVertical
            className="ml-auto size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
            aria-hidden="true"
          />
        ) : null}
      </span>
      {!compact && item.subtitle && (tall || (!narrow && height >= 76)) ? (
        <span className="relative truncate text-[11.5px] leading-4 opacity-85">
          {item.subtitle}
        </span>
      ) : null}
      {!compact && item.meta && height >= 48 ? (
        <span className="relative mt-auto truncate text-[11px] leading-4 opacity-75">
          {item.meta}
        </span>
      ) : null}
    </motion.button>
  )

  return (
    <Tooltip
      disabled={dragging || passThrough}
      side="right"
      content={
        <div className="grid min-w-52 gap-1.5 py-0.5">
          <p className="text-[13px] font-semibold">{item.title}</p>
          {item.subtitle ? (
            <p className="-mt-1 text-xs opacity-80">{item.subtitle}</p>
          ) : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            {item.details.map((detail) => (
              <div key={detail.label} className="contents">
                <dt className="opacity-60">{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          {item.conflict ? (
            <p className="mt-1 flex gap-1.5 rounded bg-danger/20 px-2 py-1 text-xs">
              <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {item.conflictText}
            </p>
          ) : null}
        </div>
      }
    >
      {card}
    </Tooltip>
  )
}
