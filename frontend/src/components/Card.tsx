import type { HTMLAttributes } from 'react'
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
