import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
}

export function Input({ id, label, hint, className, ...props }: InputProps) {
  const inputId = id ?? label.replace(/\s+/g, '-').toLowerCase()
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className={cn(
          'h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[border-color,box-shadow] duration-[var(--duration-hover)] placeholder:text-subtle-foreground hover:border-border-strong focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
