import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { resendVerification } from '../../api/auth'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/Button'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [message, setMessage] = useState(
    'Check your inbox for a ClashFree link. It expires after two hours.',
  )
  const [submitting, setSubmitting] = useState(false)

  async function resend() {
    if (!email) {
      setMessage(
        'Open this page from the forgot-password form so we know which email to use.',
      )
      return
    }
    setSubmitting(true)
    try {
      await resendVerification(email)
      setMessage(`A new message was sent to ${email}.`)
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : 'Could not resend the message',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Check your email" description={message}>
      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => void resend()}
        >
          {submitting ? 'Sending…' : 'Resend message'}
        </Button>
        <Link
          className="text-center text-sm font-medium text-primary underline"
          to="/auth/login"
        >
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
