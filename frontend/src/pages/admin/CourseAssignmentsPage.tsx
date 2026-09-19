import { useMemo, useState, type FormEvent } from 'react'
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  fetchCohorts,
  fetchCourses,
  fetchDepartments,
  fetchLecturers,
  updateAssignment,
  type AssignmentRecord,
  type CohortRecord,
  type CourseRecord,
  type DepartmentRecord,
  type LecturerRecord,
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
  ROOM_TYPE_OPTIONS,
  departmentOptions,
  labelFor,
  statusVariant,
} from '../../lib/academicLabels'
import type { TableColumn } from '../../types/table'
import { useReload } from '../../hooks/useReload'
import { AdminCrudShell } from './AdminCrudShell'

type AssignmentForm = {
  course_id: string
  cohort_id: string
  lecturer_id: string
  contact_pattern: string
}

const emptyForm: AssignmentForm = {
  course_id: '',
  cohort_id: '',
  lecturer_id: 'none',
  contact_pattern: '2 x 2h',
}

export function CourseAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [cohorts, setCohorts] = useState<CohortRecord[]>([])
  const [lecturers, setLecturers] = useState<LecturerRecord[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [tableState, setTableState] = useState<
    'loading' | 'empty' | 'error' | 'populated'
  >('loading')
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [attentionFilter, setAttentionFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AssignmentRecord | null>(null)
  const [form, setForm] = useState<AssignmentForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AssignmentRecord | null>(null)

  async function load() {
    setTableState('loading')
    try {
      const [rows, courseRows, cohortRows, lecturerRows, departmentRows] =
        await Promise.all([
          fetchAssignments({
            q: query,
            department_id:
              departmentFilter === 'all' ? undefined : Number(departmentFilter),
            needs_attention: attentionFilter === 'attention' ? true : undefined,
          }),
          fetchCourses(),
          fetchCohorts(),
          fetchLecturers(),
          fetchDepartments(),
        ])
      setAssignments(rows)
      setCourses(courseRows)
      setCohorts(cohortRows)
      setLecturers(lecturerRows)
      setDepartments(departmentRows)
      setTableState(rows.length === 0 ? 'empty' : 'populated')
    } catch {
      setTableState('error')
    }
  }

  useReload(load, [query, departmentFilter, attentionFilter])

  const deptOptions = useMemo(() => departmentOptions(departments), [departments])
  const missingLecturer = assignments.filter((row) => !row.lecturer_id).length
  const complete = assignments.filter((row) => row.status === 'complete').length

  const columns: TableColumn<AssignmentRecord>[] = [
    { id: 'code', header: 'Code', accessor: (row) => row.course_code ?? '—' },
    { id: 'course', header: 'Course', accessor: (row) => row.course_title ?? '—' },
    { id: 'cohort', header: 'Cohort', accessor: (row) => row.cohort_code ?? '—' },
    { id: 'lecturer', header: 'Lecturer', accessor: (row) => row.lecturer_name ?? '—' },
    { id: 'pattern', header: 'Contact Pattern', accessor: (row) => row.contact_pattern },
    {
      id: 'room',
      header: 'Room Requirement',
      accessor: (row) =>
        `${labelFor(ROOM_TYPE_OPTIONS, row.room_type ?? '')}${row.expected_size ? ` ≥ ${row.expected_size}` : ''}`,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <StatusBadge variant={statusVariant(row.status)}>
          {row.status === 'complete' ? 'Complete' : 'Needs attention'}
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
                course_id: String(row.course_id),
                cohort_id: String(row.cohort_id),
                lecturer_id: row.lecturer_id ? String(row.lecturer_id) : 'none',
                contact_pattern: row.contact_pattern,
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
    if (!form.course_id || !form.cohort_id || !form.contact_pattern.trim()) {
      setFormError('Choose a course, cohort and contact pattern.')
      return
    }
    const body = {
      course_id: Number(form.course_id),
      cohort_id: Number(form.cohort_id),
      lecturer_id: form.lecturer_id === 'none' ? null : Number(form.lecturer_id),
      contact_pattern: form.contact_pattern.trim(),
    }
    try {
      if (editing) {
        await updateAssignment(editing.id, body)
      } else {
        await createAssignment(body)
      }
      setModalOpen(false)
      await load()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.detail : 'Could not save the assignment',
      )
    }
  }

  return (
    <AdminCrudShell
      title="Course Assignments"
      description="Connect courses to lecturers, student cohorts, required contact hours, and eligible room types before optimization."
      actions={
        <Button
          onClick={() => {
            setEditing(null)
            setForm({
              ...emptyForm,
              course_id: courses[0] ? String(courses[0].id) : '',
              cohort_id: cohorts[0] ? String(cohorts[0].id) : '',
            })
            setFormError(null)
            setModalOpen(true)
          }}
        >
          + New Assignment
        </Button>
      }
      metrics={[
        {
          id: 'count',
          label: 'Assignments',
          value: String(assignments.length),
          hint: 'Course–cohort links',
          tint: 'blue',
        },
        {
          id: 'complete',
          label: 'Complete',
          value: String(complete),
          hint: 'Ready for solver',
          tint: 'green',
        },
        {
          id: 'missing',
          label: 'Missing Lecturer',
          value: String(missingLecturer),
          hint: 'Must be resolved',
          tint: 'rose',
        },
        {
          id: 'courses',
          label: 'Courses covered',
          value: String(new Set(assignments.map((row) => row.course_id)).size),
          hint: 'Distinct courses',
          tint: 'purple',
        },
      ]}
      extras={
        <div className="mb-4">
          <Card>
            <h2 className="mb-2 text-sm font-semibold">Preflight readiness</h2>
            <p className="text-sm text-muted-foreground">
              Course catalogue loaded. {missingLecturer} assignment
              {missingLecturer === 1 ? '' : 's'} still missing a lecturer. CSV import and
              copy from a previous semester are deferred.
            </p>
          </Card>
        </div>
      }
      filters={[
        {
          id: 'assignment-search',
          type: 'search',
          label: 'Search',
          value: query,
          placeholder: 'Search assignment…',
          onChange: setQuery,
        },
        {
          id: 'assignment-department',
          type: 'select',
          label: 'Department',
          value: departmentFilter,
          options: [{ value: 'all', label: 'All departments' }, ...deptOptions],
          onChange: setDepartmentFilter,
        },
        {
          id: 'assignment-attention',
          type: 'select',
          label: 'Attention',
          value: attentionFilter,
          options: [
            { value: 'all', label: 'All assignments' },
            { value: 'attention', label: 'Needs attention' },
          ],
          onChange: setAttentionFilter,
        },
      ]}
      onResetFilters={() => {
        setQuery('')
        setDepartmentFilter('all')
        setAttentionFilter('all')
      }}
    >
      <DataTable
        caption="Course assignments"
        columns={columns}
        data={assignments}
        getRowId={(row) => String(row.id)}
        state={tableState}
      />
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit assignment' : 'New assignment'}
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
          <Select
            label="Course"
            value={form.course_id}
            options={courses.map((course) => ({
              value: String(course.id),
              label: `${course.code} · ${course.title}`,
            }))}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, course_id: value }))
            }
          />
          <Select
            label="Cohort"
            value={form.cohort_id}
            options={cohorts.map((cohort) => ({
              value: String(cohort.id),
              label: cohort.code,
            }))}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, cohort_id: value }))
            }
          />
          <Select
            label="Lecturer"
            value={form.lecturer_id}
            options={[
              { value: 'none', label: 'Unassigned' },
              ...lecturers.map((lecturer) => ({
                value: String(lecturer.id),
                label: lecturer.full_name,
              })),
            ]}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, lecturer_id: value }))
            }
          />
          <Input
            label="Contact pattern"
            value={form.contact_pattern}
            onChange={(event) =>
              setForm((current) => ({ ...current, contact_pattern: event.target.value }))
            }
          />
          <Button type="submit">
            {editing ? 'Save assignment' : 'Create assignment'}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete this assignment?"
        description="The course will drop back to draft if it no longer has a lecturer."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) void deleteAssignment(pendingDelete.id).then(() => load())
        }}
      />
    </AdminCrudShell>
  )
}
