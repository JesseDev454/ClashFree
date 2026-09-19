import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { resetPassword } from '../../api/auth'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token) {
      setError('This reset link is missing a token. Request a new one.')
      return
    }
    if (password.length < 8) {
      setError('Use a password of at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await resetPassword(token, password)
      navigate('/auth/reset-success', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset the password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      description="Choose a new password for your ClashFree account."
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
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save password'}
        </Button>
      </form>
    </AuthLayout>
  )
}
