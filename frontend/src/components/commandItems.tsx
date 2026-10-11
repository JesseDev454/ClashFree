import type { ReactNode } from 'react'
import type { NavGroup } from '../types/navigation'
import { navIcon } from './navIcons'

export type CommandItem = {
  id: string
  label: string
  group: string
  icon?: ReactNode
  keywords?: string
  href?: string
  onSelect?: () => void
}

export function commandItemsFromNav(groups: NavGroup[]): CommandItem[] {
  return groups.flatMap((group) =>
    group.items.map((item) => {
      const Icon = navIcon(item.icon)
      return {
        id: `nav-${item.id}`,
        label: item.label,
        group: group.label,
        href: item.href,
        icon: <Icon className="size-4" aria-hidden="true" />,
      }
    }),
  )
}
