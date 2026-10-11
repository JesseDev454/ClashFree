import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { transitions } from '../lib/motion'
import { dismissToast, useToasts, type ToastTone } from '../lib/toast'
import { cn } from '../lib/utils'

const toneIcon: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
}

const toneClass: Record<ToastTone, string> = {
  success: 'text-success',
  info: 'text-primary',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function Toaster() {
  const toasts = useToasts()
  return (
    <div
      className="cf-no-print pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const Icon = toneIcon[item.tone]
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.16 } }}
              transition={transitions.panel}
              className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-card p-3.5 shadow-overlay"
            >
              <Icon
                className={cn('mt-0.5 size-[18px] shrink-0', toneClass[item.tone])}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="-m-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
