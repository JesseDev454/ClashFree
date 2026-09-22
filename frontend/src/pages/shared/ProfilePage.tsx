import { useState } from 'react'
import { updateProfile } from '../../api/portals'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'

export function ProfilePage({ description }: { description: string }) {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.full_name ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSave() {
    setError(null)
    setMessage(null)
    try {
      await updateProfile(name)
      if (refresh) {
        await refresh()
      }
      setMessage('Profile saved.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Profile could not be saved')
    }
  }

  return (
    <RoleShell>
      <PageHeader title="Profile" description={description} />
      <Card className="max-w-lg">
        <div className="grid gap-3">
          <Input
            label="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {user?.email} · {user?.role.split('_').join(' ')}
            {user?.department_name ? ` · ${user.department_name}` : ''}
          </p>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm text-foreground">{message}</p> : null}
          <Button onClick={() => void onSave()}>Save profile</Button>
        </div>
      </Card>
    </RoleShell>
  )
}
