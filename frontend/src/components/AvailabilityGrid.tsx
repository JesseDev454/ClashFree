import { cn } from '../lib/utils'
import {
  PERIODS,
  PERIOD_LABELS,
  WEEKDAYS,
  WEEKDAY_FULL,
  WEEKDAY_LABELS,
  slotLookup,
  type GridSlot,
  type Period,
  type Weekday,
} from '../lib/schedule'

const stateClass: Record<string, string> = {
  available: 'bg-tint-green text-[#047857]',
  preferred: 'bg-tint-blue text-info',
  reserved: 'bg-background text-muted-foreground',
  unavailable: 'bg-tint-rose text-[#be123c]',
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

type AvailabilityGridProps = {
  slots: GridSlot[]
  onCycle?: (weekday: Weekday, period: Period) => void
  caption: string
}

export function AvailabilityGrid({ slots, onCycle, caption }: AvailabilityGridProps) {
  const lookup = slotLookup(slots)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-2">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">
              Time
            </th>
            {WEEKDAYS.map((weekday) => (
              <th
                key={weekday}
                className="px-2 py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {WEEKDAY_LABELS[weekday]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((period) => (
            <tr key={period}>
              <th className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">
                {PERIOD_LABELS[period]}
              </th>
              {WEEKDAYS.map((weekday) => {
                const state = lookup.get(`${weekday}:${period}`) ?? 'available'
                const label = `${WEEKDAY_FULL[weekday]} ${period} ${state}`
                const className = cn(
                  'w-full rounded-full px-2 py-2 text-xs font-medium',
                  stateClass[state] ?? 'bg-background text-muted-foreground',
                )
                if (!onCycle) {
                  return (
                    <td key={weekday}>
                      <span className={cn(className, 'inline-flex justify-center')}>
                        {titleCase(state)}
                      </span>
                    </td>
                  )
                }
                return (
                  <td key={weekday}>
                    <button
                      type="button"
                      aria-label={label}
                      className={className}
                      onClick={() => onCycle(weekday, period)}
                    >
                      {titleCase(state)}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
