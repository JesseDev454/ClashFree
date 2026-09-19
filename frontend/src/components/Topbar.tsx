import { Bell, Menu, Search } from 'lucide-react'
import type { RefObject } from 'react'
import { Link } from 'react-router'
import { sessionChip } from '../fixtures/adminDashboard'
import type { PreviewUser } from '../types/navigation'
import { Button } from './Button'
import { StatusBadge } from './StatusBadge'

type TopbarProps = {
  user: PreviewUser
  onOpenNavigation: () => void
  navigationTriggerRef: RefObject<HTMLButtonElement | null>
  notificationsHref?: string
  onSignOut?: () => void | Promise<void>
}

export function Topbar({
  user,
  onOpenNavigation,
  navigationTriggerRef,
  notificationsHref = '/preview/unavailable/admin-notifications',
  onSignOut,
}: TopbarProps) {
  return (
    <header
      className="flex h-[var(--topbar-height)] items-center gap-3 border-b border-border bg-card px-4 lg:px-6"
      style={{ height: 'var(--topbar-height)' }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        aria-label="Open navigation"
        ref={navigationTriggerRef}
        onClick={onOpenNavigation}
      >
        <Menu className="size-5" />
      </Button>
      <form
        className="relative min-w-0 flex-1"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <label htmlFor="global-search" className="sr-only">
          Search courses, lecturers, rooms, cohorts
        </label>
        <input
          id="global-search"
          name="q"
          placeholder="Search courses, lecturers, rooms, cohorts..."
          className="h-10 w-full rounded-full border border-border bg-background pr-4 pl-10 text-sm"
        />
      </form>
      <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 sm:flex">
        <p className="text-xs font-medium text-foreground">{sessionChip.label}</p>
        <StatusBadge variant="success">{sessionChip.state}</StatusBadge>
      </div>
      <Link
        to={notificationsHref}
        className="relative inline-flex size-10 items-center justify-center rounded-full border border-border"
        aria-label="Notifications, 1 unread"
      >
        <Bell className="size-4" />
        <span
          className="absolute top-2 right-2 size-2 rounded-full bg-danger"
          aria-hidden="true"
        />
      </Link>
      <div className="hidden items-center gap-2 md:flex">
        <div className="flex size-10 items-center justify-center rounded-full bg-sidebar text-sm font-semibold text-white">
          {user.initials}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.roleLabel}</p>
        </div>
      </div>
      {onSignOut ? (
        <Button variant="outline" size="sm" onClick={() => void onSignOut()}>
          Sign out
        </Button>
      ) : null}
    </header>
  )
}
