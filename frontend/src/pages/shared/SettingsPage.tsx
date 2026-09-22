import { useState } from 'react'
import { fetchSettings, saveSettings, type UserSettings } from '../../api/portals'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'

const EMPTY: UserSettings = {
  display_density: 'comfortable',
  week_starts_on: 'mon',
  notify_timetable_changes: true,
  notify_requests: true,
}

export function SettingsPage({ description }: { description: string }) {
  const [settings, setSettings] = useState<UserSettings>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useReload(async () => {
    try {
      setSettings(await fetchSettings())
      setError(null)
    } catch {
      setError('Settings could not be loaded')
    }
  }, [])

  async function onSave() {
    setMessage(null)
    try {
      setSettings(await saveSettings(settings))
      setMessage(
        'Settings saved. Notification toggles are stored for a later delivery phase.',
      )
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Settings could not be saved')
    }
  }

  return (
    <RoleShell>
      <PageHeader title="Settings" description={description} />
      <Card className="max-w-lg">
        <div className="grid gap-3">
          <Select
            label="Display density"
            value={settings.display_density}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
            onValueChange={(value) =>
              setSettings((current) => ({
                ...current,
                display_density: value as UserSettings['display_density'],
              }))
            }
          />
          <Select
            label="Week starts on"
            value={settings.week_starts_on}
            options={[
              { value: 'mon', label: 'Monday' },
              { value: 'sun', label: 'Sunday' },
            ]}
            onValueChange={(value) =>
              setSettings((current) => ({
                ...current,
                week_starts_on: value as UserSettings['week_starts_on'],
              }))
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.notify_timetable_changes}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  notify_timetable_changes: event.target.checked,
                }))
              }
            />
            Timetable change alerts
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.notify_requests}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  notify_requests: event.target.checked,
                }))
              }
            />
            Request alerts
          </label>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm">{message}</p> : null}
          <Button onClick={() => void onSave()}>Save settings</Button>
        </div>
      </Card>
    </RoleShell>
  )
}
