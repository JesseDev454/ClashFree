import { cn } from '../lib/utils'
import type { StatusVariant } from '../types/status'

const variantClass: Record<StatusVariant, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  success: 'border-success-border bg-success-subtle text-success-text',
  warning: 'border-warning-border bg-warning-subtle text-warning-text',
  danger: 'border-danger-border bg-danger-subtle text-danger-text',
  info: 'border-primary-border bg-primary-subtle text-primary-text',
}

const dotClass: Record<StatusVariant, string> = {
  neutral: 'bg-subtle-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
}

type StatusBadgeProps = {
  variant?: StatusVariant
  children: string
  dot?: boolean
  className?: string
}

export function StatusBadge({
  variant = 'neutral',
  children,
  dot = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap',
        variantClass[variant],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn('size-1.5 rounded-full', dotClass[variant])}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  )
}
