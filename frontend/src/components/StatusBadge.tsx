import { cn } from '../lib/utils'
import type { StatusVariant } from '../types/status'

const variantClass: Record<StatusVariant, string> = {
  neutral: 'bg-background text-muted-foreground',
  success: 'bg-tint-green text-[#047857]',
  warning: 'bg-tint-amber text-[#b45309]',
  danger: 'bg-tint-rose text-[#be123c]',
  info: 'bg-tint-blue text-info',
}

type StatusBadgeProps = {
  variant?: StatusVariant
  children: string
}

export function StatusBadge({ variant = 'neutral', children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        variantClass[variant],
      )}
    >
      {children}
    </span>
  )
}
