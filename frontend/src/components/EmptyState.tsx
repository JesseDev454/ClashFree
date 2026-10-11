import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: ReactNode
  actions?: ReactNode
  tone?: 'neutral' | 'success' | 'danger'
  className?: string
}

const toneClass = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success-subtle text-success',
  danger: 'bg-danger-subtle text-danger',
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  tone = 'neutral',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-6 py-12 text-center sm:py-16',
        className,
      )}
    >
      <span
        className={cn(
          'mb-4 flex size-12 items-center justify-center rounded-xl [&_svg]:size-6',
          toneClass[tone],
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      <div className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </div>
      {actions ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
