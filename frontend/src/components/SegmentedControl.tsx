import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { transitions } from '../lib/motion'
import { cn } from '../lib/utils'

type Option<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

type SegmentedControlProps<T extends string> = {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const id = useId()
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center rounded-[var(--radius-control)] border border-border bg-muted p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] font-medium transition-colors duration-[var(--duration-hover)] [&_svg]:size-3.5',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segment-${id}`}
                transition={transitions.panel}
                className="absolute inset-0 rounded-[calc(var(--radius-control)-2px)] bg-card shadow-[0_1px_2px_rgb(15_23_42/0.08),0_0_0_1px_var(--border)]"
                aria-hidden="true"
              />
            ) : null}
            <span className="relative inline-flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
