import { RotateCcw, Siren } from 'lucide-react'
import type { ReactNode } from 'react'
import { AppShell } from '../../../components/AppShell'
import { PreviewBanner } from '../../../components/PreviewBanner'
import { useDemo } from '../../../demo/store'
import { DEMO_SESSION_LABEL } from '../../../demo/data'
import { toast } from '../../../lib/toast'

type DemoShellProps = {
  children: ReactNode
  wide?: boolean
}

/** Administrator shell for the design-lab screens, wired to the demo store. */
export function DemoShell({ children, wide }: DemoShellProps) {
  const demo = useDemo()
  const unread = demo.notifications.filter(
    (item) => item.unread && item.audience === 'Administrator',
  ).length

  function reset() {
    demo.actions.reset()
    toast({
      title: 'Demo data reset',
      description: `Back to the published ${DEMO_SESSION_LABEL} timetable.`,
      tone: 'info',
    })
  }

  return (
    <AppShell
      wide={wide}
      unreadCount={unread}
      commandActions={[
        {
          id: 'demo-closure',
          label: 'Simulate Room B12 maintenance closure',
          group: 'Demo actions',
          keywords: 'disruption facilities repair',
          icon: <Siren className="size-4" aria-hidden="true" />,
          onSelect: () => {
            demo.actions.reportClosure()
            toast({
              title: 'Room B12 marked unavailable',
              description: 'Facilities reported a closure Wednesday–Friday.',
              tone: 'warning',
            })
          },
        },
        {
          id: 'demo-reset',
          label: 'Reset demo data',
          group: 'Demo actions',
          icon: <RotateCcw className="size-4" aria-hidden="true" />,
          onSelect: reset,
        },
      ]}
    >
      <PreviewBanner onReset={reset} />
      {children}
    </AppShell>
  )
}
