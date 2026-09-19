import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { forgotPassword } from '../../api/auth'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      setError('Enter the email for your account.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await forgotPassword(email.trim())
      navigate(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`, {
        replace: true,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start recovery')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      description="We’ll send a reset link if this email belongs to a ClashFree account."
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  )
}
