import { cn } from '../lib/utils'

type LogoMarkProps = {
  className?: string
}

/**
 * Three time blocks sharing lanes without ever overlapping — the ClashFree promise.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('size-8 shrink-0', className)}
    >
      <rect width="32" height="32" rx="8" fill="var(--brand-electric)" />
      <rect x="6.5" y="7.5" width="12" height="4.5" rx="2.25" fill="#fff" />
      <rect
        x="13.5"
        y="13.75"
        width="12"
        height="4.5"
        rx="2.25"
        fill="var(--brand-sky)"
      />
      <rect x="6.5" y="20" width="12" height="4.5" rx="2.25" fill="#fff" />
    </svg>
  )
}

type LogoProps = {
  className?: string
  tone?: 'light' | 'dark'
  showTagline?: boolean
}

export function Logo({ className, tone = 'dark', showTagline = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="grid leading-none">
        <span
          className={cn(
            'text-[1.0625rem] font-semibold tracking-[-0.02em]',
            tone === 'light' ? 'text-white' : 'text-foreground',
          )}
        >
          ClashFree
        </span>
        {showTagline ? (
          <span
            className={cn(
              'mt-1 text-[11px] font-medium',
              tone === 'light' ? 'text-sidebar-muted' : 'text-muted-foreground',
            )}
          >
            Smarter Timetables. Fewer Conflicts.
          </span>
        ) : null}
      </span>
    </span>
  )
}
