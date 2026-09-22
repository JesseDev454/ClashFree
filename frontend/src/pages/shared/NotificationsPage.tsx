import { useState } from 'react'
import { Link } from 'react-router'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../api/activity'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function NotificationsPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const [rows, setRows] = useState<NotificationItem[]>([])
  const [error, setError] = useState<string | null>(null)

  function load() {
    return fetchNotifications()
      .then((body) => {
        setRows(body)
        setError(null)
      })
      .catch((caught) => {
        setError(
          caught instanceof ApiError
            ? caught.detail
            : 'Notifications could not be loaded',
        )
      })
  }

  useReload(async () => {
    await load()
  }, [])

  async function onRead(id: number) {
    await markNotificationRead(id)
    await load()
  }

  async function onReadAll() {
    await markAllNotificationsRead()
    await load()
  }

  const unread = rows.some((row) => row.read_at === null)

  return (
    <RoleShell>
      <PageHeader
        title={title}
        description={description}
        actions={
          unread ? <Button onClick={() => void onReadAll()}>Mark all read</Button> : null
        }
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">{row.title}</p>
              <p className="mt-1 text-muted-foreground">{row.body}</p>
              <div className="mt-2 flex gap-3">
                {row.href ? (
                  <Link className="text-primary" to={row.href}>
                    Open
                  </Link>
                ) : null}
                {row.read_at === null ? (
                  <Button onClick={() => void onRead(row.id)}>Mark read</Button>
                ) : (
                  <span className="text-muted-foreground">Read</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </RoleShell>
  )
}
