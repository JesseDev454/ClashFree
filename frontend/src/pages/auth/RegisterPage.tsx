import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { registerAccount } from '../../api/auth'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'

export function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError('Enter your name, email, and a password of at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      await registerAccount({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      })
      navigate(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Registration could not be completed',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create a student account"
      description="Staff accounts are provisioned by a timetable administrator."
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
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-primary underline" to="/auth/login">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
