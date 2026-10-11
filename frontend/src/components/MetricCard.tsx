import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../lib/utils'

const accentClass = {
  blue: 'bg-primary',
  green: 'bg-success',
  purple: 'bg-brand-sky',
  lavender: 'bg-subtle-foreground',
  amber: 'bg-warning',
  rose: 'bg-danger',
} as const

type MetricCardProps = {
  label: string
  value: string
  hint?: string
  tint?: keyof typeof accentClass
  icon?: ReactNode
  href?: string
  emphasis?: boolean
}

export function MetricCard({
  label,
  value,
  hint,
  tint = 'blue',
  icon,
  href,
  emphasis = false,
}: MetricCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-muted-foreground">
          <span
            className={cn('size-1.5 rounded-full', accentClass[tint])}
            aria-hidden="true"
          />
          <span className="truncate">{label}</span>
        </p>
        {icon ? (
          <span className="text-subtle-foreground [&_svg]:size-4" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-3 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] text-foreground tabular-nums',
          emphasis && 'text-danger-text',
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </>
  )
  const className = cn(
    'block h-full rounded-[var(--radius)] border border-border bg-card p-4 shadow-card',
    emphasis && 'border-danger-border',
    href &&
      'transition-[border-color,box-shadow,transform] duration-[var(--duration-hover)] hover:-translate-y-px hover:border-border-strong hover:shadow-raised',
  )
  if (href) {
    return (
      <Link to={href} className={className}>
        {body}
      </Link>
    )
  }
  return <article className={className}>{body}</article>
}
