import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useId } from 'react'
import { NavLink } from 'react-router'
import { transitions } from '../lib/motion'
import { cn } from '../lib/utils'
import type { NavGroup, PreviewUser } from '../types/navigation'
import { Logo, LogoMark } from './Logo'
import { navIcon } from './navIcons'
import { Tooltip } from './Tooltip'

type SidebarProps = {
  groups: NavGroup[]
  user: PreviewUser
  navLabel?: string
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
  sessionLabel?: string
}

export function Sidebar({
  groups,
  user,
  navLabel = 'Administrator',
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
  sessionLabel,
}: SidebarProps) {
  const indicatorId = useId()

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          'flex h-[var(--topbar-height)] shrink-0 items-center',
          collapsed ? 'justify-center px-2' : 'justify-between px-5',
        )}
      >
        {collapsed ? <LogoMark /> : <Logo tone="light" />}
      </div>

      {sessionLabel && !collapsed ? (
        <div className="mx-3 mb-2 rounded-[var(--radius-sm)] border border-sidebar-border bg-sidebar-accent px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-wide text-sidebar-muted uppercase">
            Active session
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-[13px] font-medium text-white">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            {sessionLabel}
          </p>
        </div>
      ) : null}

      <nav
        className="cf-scroll min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-6 [scrollbar-color:var(--sidebar-active)_transparent]"
        aria-label={navLabel}
      >
        {groups.map((group, index) => (
          <div key={group.id} className="mb-4 last:mb-0">
            {collapsed ? (
              index > 0 ? (
                <div className="mx-3 mb-3 h-px bg-sidebar-border" aria-hidden="true" />
              ) : null
            ) : (
              <p className="px-3 pt-1 pb-1.5 text-[11px] font-medium tracking-[0.06em] text-sidebar-muted uppercase">
                {group.label}
              </p>
            )}
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const Icon = navIcon(item.icon)
                return (
                  <li key={item.id}>
                    <Tooltip content={item.label} side="right" disabled={!collapsed}>
                      <span className="block">
                        <NavLink
                          to={item.href}
                          onClick={onNavigate}
                          aria-label={collapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            cn(
                              'group relative flex h-9 items-center gap-3 rounded-[var(--radius-sm)] text-[13.5px] font-medium',
                              'transition-colors duration-[var(--duration-hover)]',
                              collapsed ? 'justify-center px-0' : 'px-3',
                              isActive
                                ? 'bg-sidebar-active text-white'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive ? (
                                <motion.span
                                  layoutId={`nav-indicator-${indicatorId}`}
                                  transition={transitions.panel}
                                  className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-primary"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <Icon
                                className={cn(
                                  'size-[18px] shrink-0',
                                  isActive
                                    ? 'text-brand-sky'
                                    : 'text-sidebar-muted group-hover:text-sidebar-foreground',
                                )}
                                aria-hidden="true"
                              />
                              {collapsed ? null : (
                                <span className="truncate">{item.label}</span>
                              )}
                              {isActive ? (
                                <span className="sr-only">(current page)</span>
                              ) : null}
                            </>
                          )}
                        </NavLink>
                      </span>
                    </Tooltip>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          'flex shrink-0 items-center gap-3 border-t border-sidebar-border py-3',
          collapsed ? 'flex-col px-2' : 'px-4',
        )}
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-electric)] to-[var(--brand-deep-navy)] text-[13px] font-semibold text-white ring-1 ring-white/10"
          aria-hidden="true"
        >
          {user.initials}
        </div>
        {collapsed ? (
          <span className="sr-only">
            Signed in as {user.name}, {user.roleLabel}
          </span>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-sidebar-muted">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  user.online ? 'bg-success' : 'bg-sidebar-muted',
                )}
                aria-hidden="true"
              />
              {user.roleLabel}
              <span className="sr-only">{user.online ? ', online' : ', offline'}</span>
            </p>
          </div>
        )}
        {onToggleCollapsed ? (
          <Tooltip
            content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            side="right"
          >
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className="inline-flex size-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white"
            >
              {collapsed ? (
                <ChevronsRight className="size-4" aria-hidden="true" />
              ) : (
                <ChevronsLeft className="size-4" aria-hidden="true" />
              )}
            </button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
