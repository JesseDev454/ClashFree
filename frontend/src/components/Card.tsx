import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article' | 'div'
}

export function Card({ as: Comp = 'section', className, ...props }: CardProps) {
  return (
    <Comp
      className={cn(
        'rounded-[var(--radius)] border border-border bg-card p-[var(--card-padding)] shadow-card',
        className,
      )}
      {...props}
    />
  )
}

type CardHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  id?: string
  className?: string
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  id,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? (
          <span
            className="mt-0.5 text-muted-foreground [&_svg]:size-4"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2
            id={id}
            className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-[13px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
