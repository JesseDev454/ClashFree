import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
  type AuthUser,
} from '../api/auth'
import { AuthContext, type AuthContextValue } from './useAuth'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((current) => {
        if (!cancelled) {
          setUser(current)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginRequest(email, password)
    setUser(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
