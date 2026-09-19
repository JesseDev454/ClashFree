import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { initialsFor, ROLE_LABELS } from '../auth/paths'
import { useAuth } from '../auth/useAuth'
import { navGroupsFor, notificationsHrefFor } from '../config/navigation'
import { AppShell } from './AppShell'

type RoleShellProps = {
  children: ReactNode
}

export function RoleShell({ children }: RoleShellProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return children
  }

  return (
    <AppShell
      groups={navGroupsFor(user.role)}
      user={{
        initials: initialsFor(user.full_name),
        name: user.full_name,
        roleLabel: ROLE_LABELS[user.role],
        role: user.role,
        online: true,
      }}
      navLabel={ROLE_LABELS[user.role]}
      notificationsHref={notificationsHrefFor(user.role)}
      onSignOut={async () => {
        await logout()
        navigate('/auth/login', { replace: true })
      }}
    >
      {children}
    </AppShell>
  )
}
