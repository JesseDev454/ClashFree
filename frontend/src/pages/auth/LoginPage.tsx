import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { fetchAuthConfig } from '../../api/auth'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { safeNextPath } from '../../auth/paths'
import { useAuth } from '../../auth/useAuth'

export function LoginPage() {
  const { user, loading, login, loginWithNeon } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [neonToken, setNeonToken] = useState('')
  const [neonEnabled, setNeonEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAuthConfig()
      .then((config) => {
        if (!cancelled) {
          setNeonEnabled(config.neon)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNeonEnabled(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loading && user) {
    const next = safeNextPath(params.get('next'))
    return <Navigate to={next ?? user.home_path} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    try {
      const nextUser = await login(email.trim(), password)
      const next = safeNextPath(params.get('next'))
      navigate(next ?? nextUser.home_path, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Use your university email and password to open your ClashFree workspace."
    >
      <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        {error ? (
          <p
            className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        {neonEnabled && loginWithNeon ? (
          <div className="grid gap-3 border-t border-border pt-4">
            <Input
              label="Neon access token"
              value={neonToken}
              onChange={(event) => setNeonToken(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={submitting || !neonToken.trim()}
              onClick={() => {
                setSubmitting(true)
                setError(null)
                void loginWithNeon(neonToken.trim())
                  .then((nextUser) => {
                    const next = safeNextPath(params.get('next'))
                    navigate(next ?? nextUser.home_path, { replace: true })
                  })
                  .catch((caught: unknown) => {
                    setError(
                      caught instanceof Error ? caught.message : 'Neon sign-in failed',
                    )
                  })
                  .finally(() => setSubmitting(false))
              }}
            >
              Sign in with Neon
            </Button>
          </div>
        ) : null}
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-primary underline" to="/auth/forgot-password">
            Forgot password?
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-primary underline" to="/auth/register">
            Create a student account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
