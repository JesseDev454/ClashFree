import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export const TooltipProvider = TooltipPrimitive.Provider

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  disabled?: boolean
}

export function Tooltip({
  content,
  children,
  side = 'top',
  disabled = false,
}: TooltipProps) {
  // Keep the element tree stable when disabled so the trigger is never remounted
  // (remounting would drop focus or an active pointer capture).
  return (
    <TooltipPrimitive.Root open={disabled ? false : undefined}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="cf-menu z-[60] max-w-xs rounded-md bg-brand-midnight px-2.5 py-1.5 text-xs font-medium text-white shadow-overlay dark:bg-muted dark:text-foreground"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
