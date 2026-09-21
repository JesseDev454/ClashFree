import { useMemo, useState, type FormEvent } from 'react'
import {
  createCohort,
  deleteCohort,
  fetchCohorts,
  fetchDepartments,
  updateCohort,
  type CohortRecord,
  type DepartmentRecord,
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
  COHORT_STATUS_OPTIONS,
  LEVEL_OPTIONS,
  departmentOptions,
  labelFor,
  statusVariant,
} from '../../lib/academicLabels'
import type { TableColumn } from '../../types/table'
import { useReload } from '../../hooks/useReload'
import { AdminCrudShell } from './AdminCrudShell'

type CohortForm = {
  code: string
  department_id: string
  level: string
  size: string
  status: string
}

const emptyForm: CohortForm = {
  code: '',
  department_id: '',
  level: '400',
  size: '80',
  status: 'complete',
}

export function StudentCohortsPage() {
  const [cohorts, setCohorts] = useState<CohortRecord[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [tableState, setTableState] = useState<
    'loading' | 'empty' | 'error' | 'populated'
  >('loading')
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CohortRecord | null>(null)
  const [form, setForm] = useState<CohortForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CohortRecord | null>(null)

  async function load() {
    setTableState('loading')
    try {
      const [rows, departmentRows] = await Promise.all([
        fetchCohorts({
          q: query,
          department_id:
            departmentFilter === 'all' ? undefined : Number(departmentFilter),
          level: levelFilter === 'all' ? undefined : Number(levelFilter),
        }),
        fetchDepartments(),
      ])
      setCohorts(rows)
      setDepartments(departmentRows)
      setTableState(rows.length === 0 ? 'empty' : 'populated')
    } catch {
      setTableState('error')
    }
  }

  useReload(load, [query, departmentFilter, levelFilter])

  const deptOptions = useMemo(() => departmentOptions(departments), [departments])
  const byLevel = LEVEL_OPTIONS.map((option) => ({
    label: option.label,
    value: cohorts.filter((cohort) => String(cohort.level) === option.value).length,
  }))

  const columns: TableColumn<CohortRecord>[] = [
    { id: 'code', header: 'Cohort', accessor: (row) => row.code },
    {
      id: 'programme',
      header: 'Programme',
      accessor: (row) => row.department_name ?? '—',
    },
    { id: 'level', header: 'Level', accessor: (row) => `${row.level}L` },
    { id: 'size', header: 'Students', accessor: (row) => String(row.size) },
    { id: 'courses', header: 'Courses', accessor: (row) => String(row.course_count) },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <StatusBadge variant={statusVariant(row.status)}>
          {labelFor(COHORT_STATUS_OPTIONS, row.status)}
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
                code: row.code,
                department_id: String(row.department_id),
                level: String(row.level),
                size: String(row.size),
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
    if (!form.code.trim() || !form.department_id) {
      setFormError('Enter a cohort code and department.')
      return
    }
    const body = {
      code: form.code.trim(),
      department_id: Number(form.department_id),
      level: Number(form.level),
      size: Number(form.size),
      status: form.status,
    }
    try {
      if (editing) {
        await updateCohort(editing.id, body)
      } else {
        await createCohort(body)
      }
      setModalOpen(false)
      await load()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.detail : 'Could not save the cohort',
      )
    }
  }

  return (
    <AdminCrudShell
      title="Student Cohorts"
      description="Define scheduling groups used to prevent compulsory-course clashes and estimate room capacity requirements."
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
          + Add Cohort
        </Button>
      }
      metrics={[
        {
          id: 'count',
          label: 'Cohorts',
          value: String(cohorts.length),
          hint: 'Across programmes',
          tint: 'blue',
        },
        {
          id: 'students',
          label: 'Students Represented',
          value: String(cohorts.reduce((sum, cohort) => sum + cohort.size, 0)),
          hint: 'Scheduling population',
          tint: 'green',
        },
        {
          id: 'largest',
          label: 'Largest Cohort',
          value: String(Math.max(0, ...cohorts.map((cohort) => cohort.size))),
          hint: 'Headcount',
          tint: 'purple',
        },
        {
          id: 'average',
          label: 'Average Size',
          value:
            cohorts.length === 0
              ? '0'
              : String(
                  Math.round(
                    cohorts.reduce((sum, cohort) => sum + cohort.size, 0) /
                      cohorts.length,
                  ),
                ),
          hint: 'Students per cohort',
          tint: 'amber',
        },
      ]}
      extras={
        <div className="mb-4">
          <ChartCard kind="bar" title="Cohort composition by level" data={byLevel} />
        </div>
      }
      filters={[
        {
          id: 'cohort-search',
          type: 'search',
          label: 'Search',
          value: query,
          placeholder: 'Search cohorts…',
          onChange: setQuery,
        },
        {
          id: 'cohort-department',
          type: 'select',
          label: 'Programme',
          value: departmentFilter,
          options: [{ value: 'all', label: 'All programmes' }, ...deptOptions],
          onChange: setDepartmentFilter,
        },
        {
          id: 'cohort-level',
          type: 'select',
          label: 'Level',
          value: levelFilter,
          options: [{ value: 'all', label: 'All levels' }, ...LEVEL_OPTIONS],
          onChange: setLevelFilter,
        },
      ]}
      onResetFilters={() => {
        setQuery('')
        setDepartmentFilter('all')
        setLevelFilter('all')
      }}
    >
      <DataTable
        caption="Student cohorts"
        columns={columns}
        data={cohorts}
        getRowId={(row) => String(row.id)}
        state={tableState}
      />
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit cohort' : 'Add cohort'}
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
            label="Code"
            value={form.code}
            onChange={(event) =>
              setForm((current) => ({ ...current, code: event.target.value }))
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
          <Select
            label="Level"
            value={form.level}
            options={LEVEL_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, level: value }))
            }
          />
          <Input
            label="Size"
            type="number"
            value={form.size}
            onChange={(event) =>
              setForm((current) => ({ ...current, size: event.target.value }))
            }
          />
          <Select
            label="Status"
            value={form.status}
            options={COHORT_STATUS_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, status: value }))
            }
          />
          <Button type="submit">{editing ? 'Save cohort' : 'Create cohort'}</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete this cohort?"
        description="Cohorts with course assignments cannot be deleted."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) void deleteCohort(pendingDelete.id).then(() => load())
        }}
      />
    </AdminCrudShell>
  )
}
