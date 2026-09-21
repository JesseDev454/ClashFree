import { cn } from '../lib/utils'
import type { TimetableEntry } from '../types/timetable'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PERIODS = [
  '08:00-10:00',
  '10:00-12:00',
  '12:00-14:00',
  '14:00-16:00',
  '16:00-18:00',
]

const colorClass = {
  blue: 'border-l-4 border-l-info bg-tint-blue',
  green: 'border-l-4 border-l-success bg-tint-green',
  purple: 'border-l-4 border-l-primary bg-tint-purple',
  amber: 'border-l-4 border-l-warning bg-tint-amber',
  rose: 'border-l-4 border-l-danger bg-tint-rose',
} as const

type TimetableGridProps = {
  entries: TimetableEntry[]
  caption?: string
  days?: string[]
}

export function TimetableGrid({
  entries,
  caption = 'Weekly timetable',
  days = DAYS,
}: TimetableGridProps) {
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-28 border-b border-border px-2 py-3 text-xs text-muted-foreground"
              >
                Period
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="border-b border-border px-2 py-3 text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <tr key={period} className="h-20">
                <th
                  scope="row"
                  className="border-b border-border px-2 py-2 text-xs font-medium text-muted-foreground"
                >
                  {period}
                </th>
                {days.map((day) => {
                  const cellEntries = entries.filter(
                    (entry) => entry.day === day && entry.period === period,
                  )
                  const overlapping = cellEntries.length > 1
                  return (
                    <td key={day} className="border-b border-border px-1 py-1 align-top">
                      {cellEntries.length === 0 ? (
                        <span className="sr-only">No class</span>
                      ) : (
                        <div
                          className={cn(
                            'flex h-full gap-1',
                            overlapping && 'bg-tint-amber/40 p-0.5',
                          )}
                        >
                          {cellEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className={cn(
                                'min-w-0 flex-1 rounded-md px-2 py-1',
                                colorClass[entry.color ?? 'blue'],
                              )}
                            >
                              <p className="truncate text-xs font-semibold">
                                {entry.courseCode}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {entry.room}
                              </p>
                              {overlapping ? (
                                <p className="text-[10px] font-medium text-warning">
                                  Overlap
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Accessible timetable list</h3>
        <ol className="grid gap-2 text-sm">
          {entries.map((entry) => (
            <li key={entry.id}>
              {entry.courseCode} · {entry.courseTitle} · {entry.day} {entry.period} ·{' '}
              {entry.room} · {entry.lecturer} · {entry.cohort}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
