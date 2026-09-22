import { useState } from 'react'
import type { AssignmentRecord } from '../../api/academic'
import {
  createDepartmentAssignment,
  fetchDepartmentAssignments,
  fetchDepartmentCohorts,
  fetchDepartmentCourses,
  fetchLecturerAvailabilitySummary,
} from '../../api/portals'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'

export function DepartmentAssignmentsPage() {
  const [rows, setRows] = useState<AssignmentRecord[]>([])
  const [courses, setCourses] = useState<Array<{ value: string; label: string }>>([])
  const [cohorts, setCohorts] = useState<Array<{ value: string; label: string }>>([])
  const [lecturers, setLecturers] = useState<Array<{ value: string; label: string }>>([])
  const [courseId, setCourseId] = useState('none')
  const [cohortId, setCohortId] = useState('none')
  const [lecturerId, setLecturerId] = useState('none')
  const [error, setError] = useState<string | null>(null)

  useReload(async () => {
    try {
      const [assignmentRows, courseRows, cohortRows, lecturerRows] = await Promise.all([
        fetchDepartmentAssignments(),
        fetchDepartmentCourses(),
        fetchDepartmentCohorts(),
        fetchLecturerAvailabilitySummary(),
      ])
      setRows(assignmentRows)
      setCourses(courseRows.map((row) => ({ value: String(row.id), label: row.code })))
      setCohorts(cohortRows.map((row) => ({ value: String(row.id), label: row.code })))
      setLecturers(
        lecturerRows.map((row) => ({
          value: String(row.lecturer_id),
          label: row.full_name,
        })),
      )
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Assignments could not be loaded',
      )
    }
  }, [])

  async function onCreate() {
    try {
      await createDepartmentAssignment({
        course_id: Number(courseId),
        cohort_id: Number(cohortId),
        lecturer_id: lecturerId === 'none' ? null : Number(lecturerId),
        contact_pattern: '1 x 2h',
      })
      setRows(await fetchDepartmentAssignments())
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Assignment could not be created',
      )
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Course Assignments"
        description="Link department courses to lecturers and cohorts."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Select
          label="Course"
          value={courseId}
          options={[{ value: 'none', label: 'Select' }, ...courses]}
          onValueChange={setCourseId}
        />
        <Select
          label="Cohort"
          value={cohortId}
          options={[{ value: 'none', label: 'Select' }, ...cohorts]}
          onValueChange={setCohortId}
        />
        <Select
          label="Lecturer"
          value={lecturerId}
          options={[{ value: 'none', label: 'Unassigned' }, ...lecturers]}
          onValueChange={setLecturerId}
        />
        <Button
          onClick={() => void onCreate()}
          disabled={courseId === 'none' || cohortId === 'none'}
        >
          Add assignment
        </Button>
      </div>
      <ul className="grid gap-1 text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {row.course_code} · {row.cohort_code} · {row.lecturer_name ?? 'Unassigned'}
          </li>
        ))}
      </ul>
    </RoleShell>
  )
}
