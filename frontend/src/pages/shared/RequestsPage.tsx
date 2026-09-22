import { useState } from 'react'
import {
  createRequest,
  decideRequest,
  fetchRequests,
  type ScheduleRequest,
} from '../../api/portals'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useReload } from '../../hooks/useReload'

export function RequestsPage({
  title,
  description,
  kind,
  canDecide,
}: {
  title: string
  description: string
  kind: 'scheduling' | 'change'
  canDecide: boolean
}) {
  const { user } = useAuth()
  const [rows, setRows] = useState<ScheduleRequest[]>([])
  const [heading, setHeading] = useState('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | null>(null)

  function load() {
    return fetchRequests()
      .then((body) => {
        setRows(body.filter((row) => row.kind === kind))
        setError(null)
      })
      .catch((caught) => {
        setError(
          caught instanceof ApiError ? caught.detail : 'Requests could not be loaded',
        )
      })
  }

  useReload(async () => {
    await load()
  }, [kind])

  async function onCreate() {
    setError(null)
    try {
      await createRequest({ kind, title: heading, detail })
      setHeading('')
      setDetail('')
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Request could not be submitted',
      )
    }
  }

  async function onDecide(id: number, status: string) {
    await decideRequest(id, status)
    await load()
  }

  const visible = rows.filter(
    (row) => (canDecide ? true : row.requester_id === user?.id) || canDecide,
  )

  return (
    <RoleShell>
      <PageHeader title={title} description={description} />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Title"
            value={heading}
            onChange={(event) => setHeading(event.target.value)}
          />
          <Input
            label="Detail"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
        </div>
        <Button
          className="mt-3"
          onClick={() => void onCreate()}
          disabled={!heading || !detail}
        >
          Submit request
        </Button>
      </Card>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <ul className="grid gap-3">
          {visible.map((row) => (
            <li key={row.id}>
              <Card>
                <p className="font-medium">
                  {row.title}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    {row.status}
                  </span>
                </p>
                <p className="text-sm">{row.detail}</p>
                <p className="text-xs text-muted-foreground">{row.requester_name}</p>
                {canDecide && row.status === 'pending' ? (
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => void onDecide(row.id, 'approved')}>
                      Approve
                    </Button>
                    <Button onClick={() => void onDecide(row.id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </RoleShell>
  )
}
