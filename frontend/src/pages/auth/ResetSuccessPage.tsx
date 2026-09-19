import { Link } from 'react-router'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/Button'

export function ResetSuccessPage() {
  return (
    <AuthLayout
      title="Password updated"
      description="You can now sign in with your new password."
    >
      <Button asChild>
        <Link to="/auth/login">Return to sign in</Link>
      </Button>
    </AuthLayout>
  )
}
