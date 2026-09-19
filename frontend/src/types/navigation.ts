import type { Role } from './permissions'

export type NavItem = {
  id: string
  label: string
  href: string
  icon: string
  pageId?: string
  previewOnly?: boolean
}

export type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

export type PreviewUser = {
  initials: string
  name: string
  roleLabel: string
  role: Role
  online: boolean
}
