import { useState, type FormEvent } from 'react'
import {
  activateSession,
  createSession,
  deleteSession,
  fetchSessions,
  updateSession,
  type SessionRecord,
} from '../../api/academic'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import {
  SEMESTER_OPTIONS,
  SESSION_STATUS_OPTIONS,
  formatDate,
  labelFor,
  statusVariant,
} from '../../lib/academicLabels'
import type { TableColumn } from '../../types/table'
import { useReload } from '../../hooks/useReload'
import { AdminCrudShell } from './AdminCrudShell'

type SessionForm = {
  label: string
  semester: string
  starts_on: string
  ends_on: string
  status: string
  draft_opens_on: string
  publish_deadline_on: string
}

const emptyForm: SessionForm = {
  label: '',
  semester: 'first',
  starts_on: '',
  ends_on: '',
  status: 'draft',
  draft_opens_on: '',
  publish_deadline_on: '',
}

export function AcademicSessionsPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [tableState, setTableState] = useState<
    'loading' | 'empty' | 'error' | 'populated'
  >('loading')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SessionRecord | null>(null)
  const [form, setForm] = useState<SessionForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SessionRecord | null>(null)

  async function load() {
    setTableState('loading')
    try {
      const rows = await fetchSessions({ q: query, status: statusFilter })
      setSessions(rows)
      setTableState(rows.length === 0 ? 'empty' : 'populated')
    } catch {
      setTableState('error')
    }
  }

  useReload(load, [query, statusFilter])

  const active = sessions.find((session) => session.status === 'active')

  const columns: TableColumn<SessionRecord>[] = [
    { id: 'label', header: 'Session', accessor: (row) => row.label },
    {
      id: 'semester',
      header: 'Semester',
      accessor: (row) => labelFor(SEMESTER_OPTIONS, row.semester),
    },
    { id: 'start', header: 'Start', accessor: (row) => formatDate(row.starts_on) },
    { id: 'end', header: 'End', accessor: (row) => formatDate(row.ends_on) },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <StatusBadge variant={statusVariant(row.status)}>
          {labelFor(SESSION_STATUS_OPTIONS, row.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status !== 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void activateSession(row.id).then(load)}
            >
              Activate
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(row)
              setForm({
                label: row.label,
                semester: row.semester,
                starts_on: row.starts_on,
                ends_on: row.ends_on,
                status: row.status,
                draft_opens_on: row.draft_opens_on ?? '',
                publish_deadline_on: row.publish_deadline_on ?? '',
              })
              setFormError(null)
              setModalOpen(true)
            }}
          >
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setPendingDelete(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.label.trim() || !form.starts_on || !form.ends_on) {
      setFormError('Enter a label and start/end dates.')
      return
    }
    const body = {
      label: form.label.trim(),
      semester: form.semester,
      starts_on: form.starts_on,
      ends_on: form.ends_on,
      status: form.status,
      draft_opens_on: form.draft_opens_on || null,
      publish_deadline_on: form.publish_deadline_on || null,
    }
    try {
      if (editing) {
        await updateSession(editing.id, body)
      } else {
        await createSession(body)
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.detail : 'Could not save the session',
      )
    }
  }

  return (
    <AdminCrudShell
      title="Academic Sessions"
      description="Create and manage scheduling periods, semesters, publication windows, and active timetable cycles."
      actions={
        <Button
          onClick={() => {
            setEditing(null)
            setForm(emptyForm)
            setFormError(null)
            setModalOpen(true)
          }}
        >
          + New Session
        </Button>
      }
      metrics={[
        {
          id: 'current',
          label: 'Current Session',
          value: active?.label ?? '—',
          hint: active ? labelFor(SEMESTER_OPTIONS, active.semester) : 'None active',
          tint: 'blue',
        },
        {
          id: 'window',
          label: 'Scheduling Window',
          value: active ? `${active.duration_days} days` : '—',
          hint: active
            ? `${formatDate(active.starts_on)} – ${formatDate(active.ends_on)}`
            : '',
          tint: 'green',
        },
        {
          id: 'draft',
          label: 'Draft opens',
          value: formatDate(active?.draft_opens_on ?? null),
          hint: 'Planning window',
          tint: 'purple',
        },
        {
          id: 'published',
          label: 'Published Version',
          value: '—',
          hint: 'Available after Phase 6',
          tint: 'amber',
        },
      ]}
      extras={
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <h2 className="mb-2 text-sm font-semibold">Current Session Configuration</h2>
            <p className="text-sm text-muted-foreground">
              {active
                ? `${active.label} · ${labelFor(SEMESTER_OPTIONS, active.semester)}`
                : 'Activate a session to use it for scheduling.'}
            </p>
          </Card>
          <Card>
            <h2 className="mb-2 text-sm font-semibold">Publishing Window</h2>
            <p className="text-sm text-muted-foreground">
              Draft opens {formatDate(active?.draft_opens_on ?? null)}. Final publish
              deadline {formatDate(active?.publish_deadline_on ?? null)}.
            </p>
          </Card>
          <Card>
            <h2 className="mb-2 text-sm font-semibold">Session Status</h2>
            <p className="text-sm text-muted-foreground">
              {active ? 'Active scheduling period' : 'No active session'}
            </p>
          </Card>
        </div>
      }
      filters={[
        {
          id: 'session-search',
          type: 'search',
          label: 'Search',
          value: query,
          placeholder: 'Search sessions…',
          onChange: setQuery,
        },
        {
          id: 'session-status',
          type: 'select',
          label: 'Status',
          value: statusFilter,
          options: [{ value: 'all', label: 'All statuses' }, ...SESSION_STATUS_OPTIONS],
          onChange: setStatusFilter,
        },
      ]}
      onResetFilters={() => {
        setQuery('')
        setStatusFilter('all')
      }}
    >
      <DataTable
        caption="Academic sessions"
        columns={columns}
        data={sessions}
        getRowId={(row) => String(row.id)}
        state={tableState}
      />
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit session' : 'New session'}
      >
        <form className="grid gap-3" onSubmit={(event) => void onSubmit(event)}>
          {formError ? (
            <p
              className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          <Input
            label="Label"
            value={form.label}
            placeholder="2026/2027"
            onChange={(event) =>
              setForm((current) => ({ ...current, label: event.target.value }))
            }
          />
          <Select
            label="Semester"
            value={form.semester}
            options={SEMESTER_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, semester: value }))
            }
          />
          <Input
            label="Start date"
            type="date"
            value={form.starts_on}
            onChange={(event) =>
              setForm((current) => ({ ...current, starts_on: event.target.value }))
            }
          />
          <Input
            label="End date"
            type="date"
            value={form.ends_on}
            onChange={(event) =>
              setForm((current) => ({ ...current, ends_on: event.target.value }))
            }
          />
          <Select
            label="Status"
            value={form.status}
            options={SESSION_STATUS_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, status: value }))
            }
          />
          <Input
            label="Draft opens"
            type="date"
            value={form.draft_opens_on}
            onChange={(event) =>
              setForm((current) => ({ ...current, draft_opens_on: event.target.value }))
            }
          />
          <Input
            label="Publish deadline"
            type="date"
            value={form.publish_deadline_on}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                publish_deadline_on: event.target.value,
              }))
            }
          />
          <Button type="submit">{editing ? 'Save session' : 'Create session'}</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
          }
        }}
        title="Delete this session?"
        description="This removes the academic session record. It does not affect generated timetables."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            void deleteSession(pendingDelete.id).then(() => load())
          }
        }}
      />
    </AdminCrudShell>
  )
}
