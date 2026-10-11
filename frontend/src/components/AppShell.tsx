import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { adminNavGroups, previewAdminUser } from '../config/navigation'
import { pageVariants } from '../lib/motion'
import { cn } from '../lib/utils'
import type { CommandItem } from './commandItems'
import { CommandPalette } from './CommandPalette'
import { Sidebar } from './Sidebar'
import { Toaster } from './Toaster'
import { TooltipProvider } from './Tooltip'
import { Topbar } from './Topbar'

const COLLAPSE_KEY = 'clashfree-sidebar-collapsed'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === 'true'
  } catch {
    return false
  }
}

type AppShellProps = {
  children: ReactNode
  groups?: typeof adminNavGroups
  user?: typeof previewAdminUser
  navLabel?: string
  notificationsHref?: string
  unreadCount?: number
  onSignOut?: () => void | Promise<void>
  commandActions?: CommandItem[]
  topbarStatus?: ReactNode
  /** Lets dense workspaces such as the timetable use the full content width. */
  wide?: boolean
}

export function AppShell({
  children,
  groups = adminNavGroups,
  user = previewAdminUser,
  navLabel = 'Administrator',
  notificationsHref = '/preview/unavailable/admin-notifications',
  unreadCount,
  onSignOut,
  commandActions,
  topbarStatus,
  wide = false,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const navigationTriggerRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(COLLAPSE_KEY, String(next))
      } catch {
        // Ignore unavailable storage; the preference lasts for this visit.
      }
      return next
    })
  }

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={100}>
      <div className="flex min-h-screen bg-background">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <aside
          className={cn(
            'cf-no-print sticky top-0 hidden h-screen shrink-0 transition-[width] duration-[var(--duration-panel)] ease-[var(--ease-out)] lg:flex',
            collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
          )}
          aria-label="Desktop navigation"
        >
          <Sidebar
            groups={groups}
            user={user}
            navLabel={navLabel}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
        </aside>
        <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="cf-overlay fixed inset-0 z-40 bg-[var(--overlay)] lg:hidden" />
            <Dialog.Content
              className="cf-drawer fixed inset-y-0 left-0 z-50 w-[min(18rem,86vw)] overflow-hidden shadow-overlay lg:hidden"
              onCloseAutoFocus={(event) => {
                if (navigationTriggerRef.current) {
                  event.preventDefault()
                  navigationTriggerRef.current.focus()
                }
              }}
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Dialog.Description className="sr-only">
                {navLabel} screens. Press Escape to close.
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
        <Toaster />
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          groups={groups}
          actions={commandActions}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={user}
            notificationsHref={notificationsHref}
            unreadCount={unreadCount}
            onSignOut={onSignOut}
            navigationTriggerRef={navigationTriggerRef}
            onOpenNavigation={() => setMobileNavOpen(true)}
            onOpenSearch={() => setPaletteOpen(true)}
            statusSlot={topbarStatus}
          />
          <main
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-x-hidden px-[var(--page-padding)] pt-6 pb-12 outline-none sm:pt-8"
          >
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              className={cn(
                'mx-auto w-full',
                wide ? 'max-w-none' : 'max-w-[var(--content-max-width)]',
              )}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
