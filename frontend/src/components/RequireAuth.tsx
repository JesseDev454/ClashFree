import { Navigate, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import type { Role } from '../types/permissions'

type RequireAuthProps = {
  children: ReactNode
  roles?: Exclude<Role, 'unauthenticated'>[]
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <p className="p-6 text-sm text-muted-foreground" role="status">
        Checking your session…
      </p>
    )
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/auth/login?next=${next}`} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return children
}
