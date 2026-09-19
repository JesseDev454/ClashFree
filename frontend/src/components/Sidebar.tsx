import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  CircleQuestionMark,
  DoorOpen,
  GitCompare,
  GitMerge,
  History,
  LayoutDashboard,
  ListChecks,
  Play,
  Scale,
  ScrollText,
  Settings,
  Shield,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  UserRound,
  Users,
  Wrench,
  Zap,
  ChartNoAxesCombined,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router'
import { cn } from '../lib/utils'
import type { NavGroup, PreviewUser } from '../types/navigation'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const icons: Record<string, IconComponent> = {
  'layout-dashboard': LayoutDashboard,
  'calendar-range': CalendarRange,
  'building-2': Building2,
  'book-open': BookOpen,
  users: Users,
  'user-round': UserRound,
  'door-open': DoorOpen,
  'git-merge': GitMerge,
  'sliders-horizontal': SlidersHorizontal,
  scale: Scale,
  play: Play,
  'chart-no-axes-combined': ChartNoAxesCombined,
  'calendar-days': CalendarDays,
  'triangle-alert': TriangleAlert,
  zap: Zap,
  wrench: Wrench,
  'git-compare': GitCompare,
  'list-checks': ListChecks,
  upload: Upload,
  history: History,
  'bar-chart-3': BarChart3,
  shield: Shield,
  'scroll-text': ScrollText,
  bell: Bell,
  settings: Settings,
  'circle-help': CircleQuestionMark,
}

type SidebarProps = {
  groups: NavGroup[]
  user: PreviewUser
  navLabel?: string
  onNavigate?: () => void
}

export function Sidebar({
  groups,
  user,
  navLabel = 'Administrator',
  onNavigate,
}: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-lg font-bold tracking-tight text-white">ClashFree</p>
        <p className="text-[11px] text-sidebar-muted">
          Smarter Timetables. Smoother Campuses.
        </p>
      </div>
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
          {user.initials}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-sidebar-muted">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            {user.online ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-label={navLabel}>
        {groups.map((group) => (
          <div key={group.id} className="mb-4">
            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-muted uppercase">
              {group.label}
            </p>
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const Icon = icons[item.icon] ?? LayoutDashboard
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.href}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium',
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-sidebar-foreground hover:bg-white/5',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                          <span>{item.label}</span>
                          {isActive ? (
                            <span className="sr-only">(current page)</span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
