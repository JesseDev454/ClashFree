import { Check } from 'lucide-react'
import { cn } from '../lib/utils'

type Step = { id: string; label: string }

type StepperProps = {
  steps: Step[]
  current: number
  label: string
  className?: string
}

/** Read-only progress through a workflow; `current` is the active step index. */
export function Stepper({ steps, current, label, className }: StepperProps) {
  return (
    <ol
      aria-label={label}
      className={cn('flex items-center gap-1.5 overflow-x-auto', className)}
    >
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step.id} className="flex shrink-0 items-center gap-1.5">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full pr-3 pl-1 text-[13px] font-medium transition-colors duration-[var(--duration-panel)]',
                active && 'bg-primary-subtle text-primary-text',
                done && 'text-foreground',
                !active && !done && 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                  active && 'bg-primary text-primary-foreground',
                  done && 'bg-success text-white',
                  !active && !done && 'border border-border-strong',
                )}
                aria-hidden="true"
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              {step.label}
              {done ? <span className="sr-only">(complete)</span> : null}
            </span>
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  'h-px w-5 shrink-0',
                  done ? 'bg-success' : 'bg-border-strong',
                )}
                aria-hidden="true"
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
