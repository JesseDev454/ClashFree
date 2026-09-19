import type { Capability, DataScope, Role } from './permissions'

export type PageMeta = {
  id: string
  title: string
  purpose: string
  route: string
  referenceFile: string
  width: number
  height: number
  roles: Role[]
  phase: number
  capabilities: Capability[]
  scope: DataScope
}
