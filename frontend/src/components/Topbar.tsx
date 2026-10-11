import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, ChevronDown, LogOut, Menu, Search } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { Link } from 'react-router'
import { useThemeToggle } from '../hooks/useThemeToggle'
import { sessionChip } from '../fixtures/adminDashboard'
import { cn } from '../lib/utils'
import type { PreviewUser } from '../types/navigation'
import { Button } from './Button'
import { Kbd } from './Kbd'
import { ThemeToggle } from './ThemeToggle'
import { Tooltip } from './Tooltip'

type TopbarProps = {
  user: PreviewUser
  onOpenNavigation: () => void
  navigationTriggerRef: RefObject<HTMLButtonElement | null>
  onOpenSearch: () => void
  notificationsHref?: string
  unreadCount?: number
  onSignOut?: () => void | Promise<void>
  sessionLabel?: string
  statusSlot?: ReactNode
}

export function Topbar({
  user,
  onOpenNavigation,
  navigationTriggerRef,
  onOpenSearch,
  notificationsHref = '/preview/unavailable/admin-notifications',
  unreadCount = 0,
  onSignOut,
  sessionLabel = sessionChip.label,
  statusSlot,
}: TopbarProps) {
  const { theme, toggle } = useThemeToggle()
  const notificationsLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'

  return (
    <header className="cf-no-print sticky top-0 z-30 flex h-[var(--topbar-height)] items-center gap-2 border-b border-border bg-card/85 px-[var(--page-padding)] backdrop-blur-md supports-[backdrop-filter]:bg-card/75 sm:gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 lg:hidden"
        aria-label="Open navigation"
        ref={navigationTriggerRef}
        onClick={onOpenNavigation}
      >
        <Menu className="size-5" />
      </Button>

      <button
        type="button"
        onClick={onOpenSearch}
        className="group flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-control)] border border-border bg-background px-3 text-left text-sm text-muted-foreground transition-colors duration-[var(--duration-hover)] hover:border-border-strong md:max-w-sm"
        aria-label="Search courses, lecturers, rooms and screens"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search or jump to…</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex" aria-hidden="true">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {statusSlot}
        <div className="hidden h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-background px-3 xl:flex">
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          <p className="text-[13px] font-medium whitespace-nowrap text-foreground">
            {sessionLabel}
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggle} />
        <Tooltip content={notificationsLabel} side="bottom">
          <Link
            to={notificationsHref}
            className="relative inline-flex size-10 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground transition-colors duration-[var(--duration-hover)] hover:bg-muted hover:text-foreground"
            aria-label={notificationsLabel}
          >
            <Bell className="size-[18px]" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span
                className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-[10px] leading-4 font-semibold text-white tabular-nums ring-2 ring-card"
                aria-hidden="true"
              >
                {unreadCount}
              </span>
            ) : null}
          </Link>
        </Tooltip>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] pr-1.5 pl-1 transition-colors duration-[var(--duration-hover)] hover:bg-muted md:pr-2"
              aria-label={`Account menu for ${user.name}`}
            >
              <span
                className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-electric)] to-[var(--brand-deep-navy)] text-xs font-semibold text-white"
                aria-hidden="true"
              >
                {user.initials}
              </span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-[13px] font-medium text-foreground">
                  {user.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {user.roleLabel}
                </span>
              </span>
              <ChevronDown
                className="hidden size-4 text-muted-foreground md:block"
                aria-hidden="true"
              />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="cf-menu z-50 w-64 rounded-[var(--radius-sm)] border border-border bg-card p-1.5 shadow-overlay"
            >
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.roleLabel}</p>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item asChild>
                <Link to={notificationsHref} className={menuItemClass}>
                  <Bell aria-hidden="true" />
                  Notifications
                </Link>
              </DropdownMenu.Item>
              {onSignOut ? (
                <DropdownMenu.Item
                  className={menuItemClass}
                  onSelect={() => void onSignOut()}
                >
                  <LogOut aria-hidden="true" />
                  Sign out
                </DropdownMenu.Item>
              ) : null}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}

const menuItemClass = cn(
  'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground outline-none select-none',
  'data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground',
)
