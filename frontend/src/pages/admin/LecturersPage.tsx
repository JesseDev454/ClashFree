import { useMemo, useState, type FormEvent } from 'react'
import {
  createLecturer,
  deleteLecturer,
  fetchDepartments,
  fetchLecturers,
  updateLecturer,
  type DepartmentRecord,
  type LecturerRecord,
} from '../../api/academic'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { ChartCard } from '../../components/ChartCard'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import {
  LECTURER_STATUS_OPTIONS,
  departmentOptions,
  labelFor,
  statusVariant,
} from '../../lib/academicLabels'
import type { TableColumn } from '../../types/table'
import { useReload } from '../../hooks/useReload'
import { AdminCrudShell } from './AdminCrudShell'

type LecturerForm = {
  full_name: string
  department_id: string
  max_weekly_hours: string
  status: string
}

const emptyForm: LecturerForm = {
  full_name: '',
  department_id: '',
  max_weekly_hours: '24',
  status: 'available',
}

export function LecturersPage() {
  const [lecturers, setLecturers] = useState<LecturerRecord[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [tableState, setTableState] = useState<
    'loading' | 'empty' | 'error' | 'populated'
  >('loading')
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LecturerRecord | null>(null)
  const [form, setForm] = useState<LecturerForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<LecturerRecord | null>(null)

  async function load() {
    setTableState('loading')
    try {
      const [rows, departmentRows] = await Promise.all([
        fetchLecturers({
          q: query,
          department_id:
            departmentFilter === 'all' ? undefined : Number(departmentFilter),
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        fetchDepartments(),
      ])
      setLecturers(rows)
      setDepartments(departmentRows)
      setTableState(rows.length === 0 ? 'empty' : 'populated')
    } catch {
      setTableState('error')
    }
  }

  useReload(load, [query, departmentFilter, statusFilter])

  const deptOptions = useMemo(() => departmentOptions(departments), [departments])
  const buckets = [
    { label: '0-5', value: lecturers.filter((row) => row.max_weekly_hours <= 5).length },
    {
      label: '6-10',
      value: lecturers.filter(
        (row) => row.max_weekly_hours > 5 && row.max_weekly_hours <= 10,
      ).length,
    },
    {
      label: '11-15',
      value: lecturers.filter(
        (row) => row.max_weekly_hours > 10 && row.max_weekly_hours <= 15,
      ).length,
    },
    {
      label: '16-20',
      value: lecturers.filter(
        (row) => row.max_weekly_hours > 15 && row.max_weekly_hours <= 20,
      ).length,
    },
    { label: '21+', value: lecturers.filter((row) => row.max_weekly_hours > 20).length },
  ]

  const columns: TableColumn<LecturerRecord>[] = [
    { id: 'name', header: 'Lecturer', accessor: (row) => row.full_name },
    {
      id: 'department',
      header: 'Department',
      accessor: (row) => row.department_name ?? '—',
    },
    { id: 'courses', header: 'Courses', accessor: (row) => String(row.course_count) },
    { id: 'hours', header: 'Workload', accessor: (row) => `${row.max_weekly_hours} hrs` },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <StatusBadge variant={statusVariant(row.status)}>
          {labelFor(LECTURER_STATUS_OPTIONS, row.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(row)
              setForm({
                full_name: row.full_name,
                department_id: String(row.department_id),
                max_weekly_hours: String(row.max_weekly_hours),
                status: row.status,
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
    if (!form.full_name.trim() || !form.department_id) {
      setFormError('Enter a lecturer name and department.')
      return
    }
    const body = {
      full_name: form.full_name.trim(),
      department_id: Number(form.department_id),
      max_weekly_hours: Number(form.max_weekly_hours),
      status: form.status,
      user_id: editing?.user_id ?? null,
    }
    try {
      if (editing) {
        await updateLecturer(editing.id, body)
      } else {
        await createLecturer(body)
      }
      setModalOpen(false)
      await load()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.detail : 'Could not save the lecturer',
      )
    }
  }

  return (
    <AdminCrudShell
      title="Lecturers"
      description="Manage teaching assignments, availability windows, workload, and scheduling preferences."
      actions={
        <Button
          onClick={() => {
            setEditing(null)
            setForm({
              ...emptyForm,
              department_id: departments[0] ? String(departments[0].id) : '',
            })
            setFormError(null)
            setModalOpen(true)
          }}
        >
          + Add Lecturer
        </Button>
      }
      metrics={[
        {
          id: 'count',
          label: 'Lecturers',
          value: String(lecturers.length),
          hint: 'Staff records this semester',
          tint: 'blue',
        },
        {
          id: 'available',
          label: 'Available',
          value: String(lecturers.filter((row) => row.status === 'available').length),
          hint: 'Ready to schedule',
          tint: 'green',
        },
        {
          id: 'overloaded',
          label: 'Overloaded',
          value: String(lecturers.filter((row) => row.status === 'overloaded').length),
          hint: 'Above target hours',
          tint: 'rose',
        },
        {
          id: 'limited',
          label: 'Limited',
          value: String(lecturers.filter((row) => row.status === 'limited').length),
          hint: 'Reduced availability',
          tint: 'amber',
        },
      ]}
      extras={
        <div className="mb-4">
          <ChartCard
            kind="bar"
            title="Workload distribution (max weekly hours)"
            data={buckets}
          />
        </div>
      }
      filters={[
        {
          id: 'lecturer-search',
          type: 'search',
          label: 'Search',
          value: query,
          placeholder: 'Search lecturers…',
          onChange: setQuery,
        },
        {
          id: 'lecturer-department',
          type: 'select',
          label: 'Department',
          value: departmentFilter,
          options: [{ value: 'all', label: 'All departments' }, ...deptOptions],
          onChange: setDepartmentFilter,
        },
        {
          id: 'lecturer-status',
          type: 'select',
          label: 'Status',
          value: statusFilter,
          options: [{ value: 'all', label: 'All statuses' }, ...LECTURER_STATUS_OPTIONS],
          onChange: setStatusFilter,
        },
      ]}
      onResetFilters={() => {
        setQuery('')
        setDepartmentFilter('all')
        setStatusFilter('all')
      }}
    >
      <DataTable
        caption="Lecturers"
        columns={columns}
        data={lecturers}
        getRowId={(row) => String(row.id)}
        state={tableState}
      />
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit lecturer' : 'Add lecturer'}
        description="Weekly availability windows belong to Phase 4. This record stores identity and max hours."
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
            label="Full name"
            value={form.full_name}
            onChange={(event) =>
              setForm((current) => ({ ...current, full_name: event.target.value }))
            }
          />
          <Select
            label="Department"
            value={form.department_id}
            options={deptOptions}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, department_id: value }))
            }
          />
          <Input
            label="Max weekly hours"
            type="number"
            value={form.max_weekly_hours}
            onChange={(event) =>
              setForm((current) => ({ ...current, max_weekly_hours: event.target.value }))
            }
          />
          <Select
            label="Status"
            value={form.status}
            options={LECTURER_STATUS_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, status: value }))
            }
          />
          <Button type="submit">{editing ? 'Save lecturer' : 'Create lecturer'}</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete this lecturer?"
        description="Lecturers with course assignments cannot be deleted."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) void deleteLecturer(pendingDelete.id).then(() => load())
        }}
      />
    </AdminCrudShell>
  )
}
