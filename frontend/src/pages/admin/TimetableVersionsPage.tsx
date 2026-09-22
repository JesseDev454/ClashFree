import { useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../api/client'
import {
  downloadVersionCsv,
  fetchVersion,
  fetchVersions,
  restoreVersion,
  unpublishVersion,
  type TimetableSlot,
  type TimetableVersion,
} from '../../api/timetables'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { StatusBadge } from '../../components/StatusBadge'
import { TimetableGrid } from '../../components/TimetableGrid'
import { useReload } from '../../hooks/useReload'
import { slotsToEntries } from '../../lib/timetableEntries'
import type { TableColumn } from '../../types/table'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function formatWhen(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TimetableVersionsPage() {
  const [versions, setVersions] = useState<TimetableVersion[]>([])
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [detailError, setDetailError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function runAction(work: () => Promise<void>) {
    setActionError(null)
    try {
      await work()
      await load()
    } catch (caught) {
      setActionError(
        caught instanceof ApiError
          ? caught.detail
          : 'That action could not be completed.',
      )
    }
  }

  async function showVersion(id: number) {
    setDetailError(null)
    setSelectedId(id)
    try {
      const detail = await fetchVersion(id)
      setSlots(detail.slots)
    } catch {
      setSlots([])
      setDetailError('That version snapshot could not be loaded.')
    }
  }

  async function load() {
    setState('loading')
    setDetailError(null)
    try {
      const rows = await fetchVersions()
      setVersions(rows)
      if (rows.length === 0) {
        setSlots([])
        setSelectedId(null)
        setState('empty')
        return
      }
      setState('ready')
      const current = rows.find((row) => row.is_current) ?? rows[0]
      await showVersion(current.id)
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const columns: TableColumn<TimetableVersion>[] = [
    {
      id: 'version',
      header: 'Version',
      accessor: (row) => `v${row.version_number}`,
    },
    {
      id: 'published_at',
      header: 'Published',
      accessor: (row) => formatWhen(row.published_at),
    },
    {
      id: 'publisher',
      header: 'Published by',
      accessor: (row) => row.publisher_name ?? '—',
    },
    {
      id: 'notes',
      header: 'Notes',
      accessor: (row) => row.notes || '—',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <StatusBadge variant={row.is_current ? 'success' : 'neutral'}>
          {row.is_current ? 'Current' : 'Superseded'}
        </StatusBadge>
      ),
    },
    {
      id: 'slots',
      header: 'Classes',
      accessor: (row) => String(row.slot_count),
    },
    {
      id: 'view',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedId === row.id ? 'primary' : 'outline'}
            onClick={() => void showVersion(row.id)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void runAction(async () => {
                await downloadVersionCsv(row.id, row.version_number)
              })
            }
          >
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          {row.is_current ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void runAction(() => unpublishVersion(row.id).then(() => undefined))
              }
            >
              Unpublish
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void runAction(() => restoreVersion(row.id).then(() => undefined))
            }
          >
            Restore
          </Button>
        </div>
      ),
    },
  ]

  const selected = versions.find((row) => row.id === selectedId)

  return (
    <RoleShell>
      <PageHeader
        title="Timetable Versions"
        description="Published snapshots for the active session. Export, print, unpublish the current version, or restore one as a draft."
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/publish-timetable">Publish Timetable</Link>
          </Button>
        }
      />
      <style>{`@media print { nav, aside, button, a { display: none !important; } }`}</style>
      {actionError ? (
        <p
          className="mb-4 rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          Timetable versions could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          No published timetable yet.{' '}
          <Link className="font-medium text-primary" to="/admin/publish-timetable">
            Publish a draft
          </Link>{' '}
          first.
        </p>
      ) : null}
      {state === 'ready' ? (
        <>
          <Card className="mb-4">
            <DataTable
              caption="Published timetable versions"
              columns={columns}
              data={versions}
              getRowId={(row) => String(row.id)}
            />
          </Card>
          {detailError ? (
            <p
              className="mb-4 rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {detailError}
            </p>
          ) : null}
          <Card>
            <h2 className="mb-4 text-[0.95rem] font-semibold">
              {selected ? `v${selected.version_number} snapshot` : 'Version snapshot'}
            </h2>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Select a version to inspect its Monday–Friday grid.
              </p>
            ) : (
              <TimetableGrid
                entries={slotsToEntries(slots)}
                caption="Published version snapshot"
                days={WEEKDAYS}
              />
            )}
          </Card>
        </>
      ) : null}
    </RoleShell>
  )
}
