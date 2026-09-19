import * as Dialog from '@radix-ui/react-dialog'
import { useRef, useState, type ReactNode } from 'react'
import { adminNavGroups, previewAdminUser } from '../config/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

type AppShellProps = {
  children: ReactNode
  groups?: typeof adminNavGroups
  user?: typeof previewAdminUser
  navLabel?: string
  notificationsHref?: string
  onSignOut?: () => void | Promise<void>
}

export function AppShell({
  children,
  groups = adminNavGroups,
  user = previewAdminUser,
  navLabel = 'Administrator',
  notificationsHref = '/preview/unavailable/admin-notifications',
  onSignOut,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigationTriggerRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className="sticky top-0 hidden h-screen w-[var(--sidebar-width)] shrink-0 lg:flex"
        aria-label="Desktop navigation"
      >
        <Sidebar groups={groups} user={user} navLabel={navLabel} />
      </aside>
      <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 w-[min(20rem,90vw)] overflow-hidden lg:hidden"
            onCloseAutoFocus={(event) => {
              if (navigationTriggerRef.current) {
                event.preventDefault()
                navigationTriggerRef.current.focus()
              }
            }}
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">
              Administrator screens. Press Escape to close.
            </Dialog.Description>
            <Sidebar
              groups={groups}
              user={user}
              navLabel={navLabel}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          notificationsHref={notificationsHref}
          onSignOut={onSignOut}
          navigationTriggerRef={navigationTriggerRef}
          onOpenNavigation={() => setMobileNavOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden p-[var(--page-padding)]">
          {children}
        </main>
      </div>
    </div>
  )
}
