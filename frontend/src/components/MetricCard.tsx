import { cn } from '../lib/utils'

const tintClass = {
  blue: 'bg-tint-blue',
  green: 'bg-tint-green',
  purple: 'bg-tint-purple',
  lavender: 'bg-tint-lavender',
  amber: 'bg-tint-amber',
  rose: 'bg-tint-rose',
} as const

type MetricCardProps = {
  label: string
  value: string
  hint?: string
  tint?: keyof typeof tintClass
}

export function MetricCard({ label, value, hint, tint = 'blue' }: MetricCardProps) {
  return (
    <article
      className={cn(
        'rounded-[var(--radius)] border border-border p-4 shadow-card',
        tintClass[tint],
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-[1.75rem] leading-none font-bold text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  )
}
