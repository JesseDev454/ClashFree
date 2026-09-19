import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'

export function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <p className="p-6 text-sm text-muted-foreground" role="status">
        Checking your session…
      </p>
    )
  }
  if (!user) {
    return <Navigate to="/auth/login" replace />
  }
  return <Navigate to={user.home_path} replace />
}
