import { useMemo, useState, type FormEvent } from 'react'
import {
  createDepartment,
  createFaculty,
  deleteDepartment,
  deleteFaculty,
  fetchDepartments,
  fetchFaculties,
  updateDepartment,
  updateFaculty,
  type DepartmentRecord,
  type FacultyRecord,
} from '../../api/academic'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import type { TableColumn } from '../../types/table'
import { useReload } from '../../hooks/useReload'
import { AdminCrudShell } from './AdminCrudShell'

export function FacultiesDepartmentsPage() {
  const [faculties, setFaculties] = useState<FacultyRecord[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [tableState, setTableState] = useState<
    'loading' | 'empty' | 'error' | 'populated'
  >('loading')
  const [query, setQuery] = useState('')
  const [facultyFilter, setFacultyFilter] = useState('all')
  const [facultyModal, setFacultyModal] = useState(false)
  const [departmentModal, setDepartmentModal] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<FacultyRecord | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(
    null,
  )
  const [facultyForm, setFacultyForm] = useState({ code: '', name: '' })
  const [departmentForm, setDepartmentForm] = useState({
    code: '',
    name: '',
    faculty_id: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [pendingFaculty, setPendingFaculty] = useState<FacultyRecord | null>(null)
  const [pendingDepartment, setPendingDepartment] = useState<DepartmentRecord | null>(
    null,
  )

  async function load() {
    setTableState('loading')
    try {
      const [facultyRows, departmentRows] = await Promise.all([
        fetchFaculties({ q: query }),
        fetchDepartments({
          q: query,
          faculty_id: facultyFilter === 'all' ? undefined : Number(facultyFilter),
        }),
      ])
      setFaculties(facultyRows)
      setDepartments(departmentRows)
      setTableState(
        facultyRows.length === 0 && departmentRows.length === 0 ? 'empty' : 'populated',
      )
    } catch {
      setTableState('error')
    }
  }

  useReload(load, [query, facultyFilter])

  const facultyOptions = useMemo(
    () =>
      faculties.map((faculty) => ({ value: String(faculty.id), label: faculty.name })),
    [faculties],
  )

  const facultyColumns: TableColumn<FacultyRecord>[] = [
    { id: 'name', header: 'Faculty', accessor: (row) => row.name },
    { id: 'code', header: 'Code', accessor: (row) => row.code },
    {
      id: 'departments',
      header: 'Departments',
      accessor: (row) => String(row.department_count),
    },
    {
      id: 'status',
      header: 'Readiness',
      accessor: (row) => (
        <StatusBadge variant={row.department_count > 0 ? 'success' : 'warning'}>
          {row.department_count > 0 ? 'Configured' : 'Pending'}
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
              setEditingFaculty(row)
              setFacultyForm({ code: row.code, name: row.name })
              setError(null)
              setFacultyModal(true)
            }}
          >
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setPendingFaculty(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const departmentColumns: TableColumn<DepartmentRecord>[] = [
    { id: 'name', header: 'Department', accessor: (row) => row.name },
    { id: 'code', header: 'Code', accessor: (row) => row.code },
    { id: 'faculty', header: 'Faculty', accessor: (row) => row.faculty_name ?? '—' },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingDepartment(row)
              setDepartmentForm({
                code: row.code,
                name: row.name,
                faculty_id: String(row.faculty_id ?? ''),
              })
              setError(null)
              setDepartmentModal(true)
            }}
          >
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setPendingDepartment(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  async function saveFaculty(event: FormEvent) {
    event.preventDefault()
    if (!facultyForm.code.trim() || !facultyForm.name.trim()) {
      setError('Enter a faculty code and name.')
      return
    }
    try {
      if (editingFaculty) {
        await updateFaculty(editingFaculty.id, facultyForm)
      } else {
        await createFaculty(facultyForm)
      }
      setFacultyModal(false)
      await load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Could not save the faculty')
    }
  }

  async function saveDepartment(event: FormEvent) {
    event.preventDefault()
    if (
      !departmentForm.code.trim() ||
      !departmentForm.name.trim() ||
      !departmentForm.faculty_id
    ) {
      setError('Enter a department code, name and faculty.')
      return
    }
    const body = {
      code: departmentForm.code,
      name: departmentForm.name,
      faculty_id: Number(departmentForm.faculty_id),
    }
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, body)
      } else {
        await createDepartment(body)
      }
      setDepartmentModal(false)
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Could not save the department',
      )
    }
  }

  return (
    <AdminCrudShell
      title="Faculties & Departments"
      description="Organize academic units and assign coordinators responsible for department-level scheduling data."
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingDepartment(null)
              setDepartmentForm({
                code: '',
                name: '',
                faculty_id: faculties[0] ? String(faculties[0].id) : '',
              })
              setError(null)
              setDepartmentModal(true)
            }}
          >
            + Add Department
          </Button>
          <Button
            onClick={() => {
              setEditingFaculty(null)
              setFacultyForm({ code: '', name: '' })
              setError(null)
              setFacultyModal(true)
            }}
          >
            + Add Faculty
          </Button>
        </div>
      }
      metrics={[
        {
          id: 'faculties',
          label: 'Faculties',
          value: String(faculties.length),
          hint: 'Active academic faculties',
          tint: 'blue',
        },
        {
          id: 'departments',
          label: 'Departments',
          value: String(departments.length),
          hint: 'Across all faculties',
          tint: 'green',
        },
        {
          id: 'configured',
          label: 'Configured faculties',
          value: String(
            faculties.filter((faculty) => faculty.department_count > 0).length,
          ),
          hint: 'Have at least one department',
          tint: 'purple',
        },
        {
          id: 'pending',
          label: 'Empty faculties',
          value: String(
            faculties.filter((faculty) => faculty.department_count === 0).length,
          ),
          hint: 'Need departments',
          tint: 'amber',
        },
      ]}
      filters={[
        {
          id: 'org-search',
          type: 'search',
          label: 'Search',
          value: query,
          placeholder: 'Search faculty or department…',
          onChange: setQuery,
        },
        {
          id: 'org-faculty',
          type: 'select',
          label: 'Faculty',
          value: facultyFilter,
          options: [{ value: 'all', label: 'All faculties' }, ...facultyOptions],
          onChange: setFacultyFilter,
        },
      ]}
      onResetFilters={() => {
        setQuery('')
        setFacultyFilter('all')
      }}
    >
      <h2 className="mb-3 text-sm font-semibold">Faculties</h2>
      <DataTable
        caption="Faculties"
        columns={facultyColumns}
        data={faculties}
        getRowId={(row) => `faculty-${row.id}`}
        state={
          tableState === 'error' ? 'error' : faculties.length ? 'populated' : 'empty'
        }
      />
      <h2 className="mt-6 mb-3 text-sm font-semibold">Departments</h2>
      <DataTable
        caption="Departments"
        columns={departmentColumns}
        data={departments}
        getRowId={(row) => `department-${row.id}`}
        state={departments.length ? 'populated' : 'empty'}
      />
      <Modal
        open={facultyModal}
        onOpenChange={setFacultyModal}
        title={editingFaculty ? 'Edit faculty' : 'Add faculty'}
      >
        <form className="grid gap-3" onSubmit={(event) => void saveFaculty(event)}>
          {error ? (
            <p
              className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <Input
            label="Code"
            value={facultyForm.code}
            onChange={(event) =>
              setFacultyForm((current) => ({ ...current, code: event.target.value }))
            }
          />
          <Input
            label="Name"
            value={facultyForm.name}
            onChange={(event) =>
              setFacultyForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <Button type="submit">
            {editingFaculty ? 'Save faculty' : 'Create faculty'}
          </Button>
        </form>
      </Modal>
      <Modal
        open={departmentModal}
        onOpenChange={setDepartmentModal}
        title={editingDepartment ? 'Edit department' : 'Add department'}
      >
        <form className="grid gap-3" onSubmit={(event) => void saveDepartment(event)}>
          {error ? (
            <p
              className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <Input
            label="Code"
            value={departmentForm.code}
            onChange={(event) =>
              setDepartmentForm((current) => ({ ...current, code: event.target.value }))
            }
          />
          <Input
            label="Name"
            value={departmentForm.name}
            onChange={(event) =>
              setDepartmentForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <Select
            label="Faculty"
            value={departmentForm.faculty_id}
            options={facultyOptions}
            onValueChange={(value) =>
              setDepartmentForm((current) => ({ ...current, faculty_id: value }))
            }
          />
          <Button type="submit">
            {editingDepartment ? 'Save department' : 'Create department'}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingFaculty !== null}
        onOpenChange={(open) => {
          if (!open) setPendingFaculty(null)
        }}
        title="Delete this faculty?"
        description="Faculties that still have departments cannot be deleted."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingFaculty) void deleteFaculty(pendingFaculty.id).then(() => load())
        }}
      />
      <ConfirmDialog
        open={pendingDepartment !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDepartment(null)
        }}
        title="Delete this department?"
        description="Departments that still have courses, cohorts or staff cannot be deleted."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDepartment)
            void deleteDepartment(pendingDepartment.id).then(() => load())
        }}
      />
    </AdminCrudShell>
  )
}
