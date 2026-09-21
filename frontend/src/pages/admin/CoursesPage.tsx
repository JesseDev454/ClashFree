import { useMemo, useState, type FormEvent } from 'react'
import {
  createCourse,
  deleteCourse,
  fetchCourses,
  fetchDepartments,
  updateCourse,
  type CourseRecord,
  type DepartmentRecord,
} from '../../api/academic'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import {
  LEVEL_OPTIONS,
  ROOM_TYPE_OPTIONS,
  departmentOptions,
  labelFor,
  statusVariant,
} from '../../lib/academicLabels'
import type { TableColumn } from '../../types/table'
import { useReload } from '../../hooks/useReload'
import { AdminCrudShell } from './AdminCrudShell'

type CourseForm = {
  code: string
  title: string
  department_id: string
  level: string
  units: string
  expected_size: string
  room_type: string
}

const emptyForm: CourseForm = {
  code: '',
  title: '',
  department_id: '',
  level: '400',
  units: '3',
  expected_size: '80',
  room_type: 'lecture_hall',
}

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [tableState, setTableState] = useState<
    'loading' | 'empty' | 'error' | 'populated'
  >('loading')
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CourseRecord | null>(null)
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CourseRecord | null>(null)

  async function load() {
    setTableState('loading')
    try {
      const [courseRows, departmentRows] = await Promise.all([
        fetchCourses({
          q: query,
          department_id:
            departmentFilter === 'all' ? undefined : Number(departmentFilter),
          level: levelFilter === 'all' ? undefined : Number(levelFilter),
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        fetchDepartments(),
      ])
      setCourses(courseRows)
      setDepartments(departmentRows)
      setTableState(courseRows.length === 0 ? 'empty' : 'populated')
    } catch {
      setTableState('error')
    }
  }

  useReload(load, [query, departmentFilter, levelFilter, statusFilter])

  const ready = courses.filter((course) => course.status === 'ready').length
  const missing = courses.filter((course) => !course.lecturer_name).length

  const columns: TableColumn<CourseRecord>[] = [
    { id: 'code', header: 'Code', accessor: (row) => row.code },
    { id: 'title', header: 'Course', accessor: (row) => row.title },
    {
      id: 'department',
      header: 'Department',
      accessor: (row) => row.department_name ?? '—',
    },
    { id: 'level', header: 'Level', accessor: (row) => `${row.level}L` },
    { id: 'units', header: 'Units', accessor: (row) => String(row.units) },
    { id: 'size', header: 'Size', accessor: (row) => String(row.expected_size) },
    {
      id: 'room',
      header: 'Room Type',
      accessor: (row) => labelFor(ROOM_TYPE_OPTIONS, row.room_type),
    },
    { id: 'lecturer', header: 'Lecturer', accessor: (row) => row.lecturer_name ?? '—' },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <StatusBadge variant={statusVariant(row.status)}>
          {row.status === 'ready' ? 'Ready' : 'Draft'}
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
                title: row.title,
                department_id: String(row.department_id),
                level: String(row.level),
                units: String(row.units),
                expected_size: String(row.expected_size),
                room_type: row.room_type,
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

  const deptOptions = useMemo(() => departmentOptions(departments), [departments])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.code.trim() || !form.title.trim() || !form.department_id) {
      setFormError('Enter a course code, title and department.')
      return
    }
    const body = {
      code: form.code.trim(),
      title: form.title.trim(),
      department_id: Number(form.department_id),
      level: Number(form.level),
      units: Number(form.units),
      expected_size: Number(form.expected_size),
      room_type: form.room_type,
    }
    try {
      if (editing) {
        await updateCourse(editing.id, body)
      } else {
        await createCourse(body)
      }
      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await load()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.detail : 'Could not save the course',
      )
    }
  }

  return (
    <AdminCrudShell
      title="Courses"
      description="Maintain the catalogue and define class size, duration, room requirements, and teaching assignments."
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
          + Add Course
        </Button>
      }
      metrics={[
        {
          id: 'total',
          label: 'Total Courses',
          value: String(courses.length),
          hint: 'This semester',
          tint: 'blue',
        },
        {
          id: 'ready',
          label: 'Ready to Schedule',
          value: String(ready),
          hint: 'Have a lecturer and cohort',
          tint: 'green',
        },
        {
          id: 'missing',
          label: 'Missing Assignment',
          value: String(missing),
          hint: 'Lecturer or cohort',
          tint: 'rose',
        },
        {
          id: 'labs',
          label: 'Special Room Needs',
          value: String(
            courses.filter((course) =>
              ['lab', 'computer_lab', 'auditorium'].includes(course.room_type),
            ).length,
          ),
          hint: 'Labs / auditorium',
          tint: 'amber',
        },
      ]}
      filters={[
        {
          id: 'course-search',
          type: 'search',
          label: 'Search',
          value: query,
          placeholder: 'Search by code or title…',
          onChange: setQuery,
        },
        {
          id: 'course-department',
          type: 'select',
          label: 'Department',
          value: departmentFilter,
          options: [{ value: 'all', label: 'All departments' }, ...deptOptions],
          onChange: setDepartmentFilter,
        },
        {
          id: 'course-level',
          type: 'select',
          label: 'Level',
          value: levelFilter,
          options: [{ value: 'all', label: 'All levels' }, ...LEVEL_OPTIONS],
          onChange: setLevelFilter,
        },
        {
          id: 'course-status',
          type: 'select',
          label: 'Status',
          value: statusFilter,
          options: [
            { value: 'all', label: 'All statuses' },
            { value: 'ready', label: 'Ready' },
            { value: 'draft', label: 'Draft' },
          ],
          onChange: setStatusFilter,
        },
      ]}
      onResetFilters={() => {
        setQuery('')
        setDepartmentFilter('all')
        setLevelFilter('all')
        setStatusFilter('all')
      }}
    >
      <DataTable
        caption="Course catalogue"
        columns={columns}
        data={courses}
        getRowId={(row) => String(row.id)}
        state={tableState}
        emptyMessage="No courses match these filters."
      />
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit course' : 'Add course'}
        description="Codes must be unique. Status becomes Ready once a lecturer and cohort are assigned."
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
          <Input
            label="Title"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
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
            label="Units"
            type="number"
            value={form.units}
            onChange={(event) =>
              setForm((current) => ({ ...current, units: event.target.value }))
            }
          />
          <Input
            label="Expected size"
            type="number"
            value={form.expected_size}
            onChange={(event) =>
              setForm((current) => ({ ...current, expected_size: event.target.value }))
            }
          />
          <Select
            label="Room type"
            value={form.room_type}
            options={ROOM_TYPE_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, room_type: value }))
            }
          />
          <Button type="submit">{editing ? 'Save course' : 'Create course'}</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
          }
        }}
        title="Delete this course?"
        description="Courses with assignments cannot be deleted until those links are removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!pendingDelete) {
            return
          }
          void deleteCourse(pendingDelete.id).then(() => load())
        }}
      />
    </AdminCrudShell>
  )
}
