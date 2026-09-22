import { useState } from 'react'
import { createDepartmentCourse, fetchDepartmentCourses } from '../../api/portals'
import type { CourseRecord } from '../../api/academic'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'

const ROOM_TYPES = [
  { value: 'lecture_hall', label: 'Lecture hall' },
  { value: 'lab', label: 'Lab' },
  { value: 'computer_lab', label: 'Computer lab' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'seminar', label: 'Seminar' },
]

export function DepartmentCoursesPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<CourseRecord[]>([])
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [roomType, setRoomType] = useState('lecture_hall')
  const [error, setError] = useState<string | null>(null)

  function load() {
    return fetchDepartmentCourses()
      .then((body) => {
        setRows(body)
        setError(null)
      })
      .catch((caught) => {
        setError(
          caught instanceof ApiError ? caught.detail : 'Courses could not be loaded',
        )
      })
  }

  useReload(async () => {
    await load()
  }, [])

  async function onCreate() {
    if (!user?.department_id) {
      setError('This account has no department')
      return
    }
    try {
      await createDepartmentCourse({
        code,
        title,
        department_id: user.department_id,
        level: 300,
        units: 3,
        expected_size: 40,
        room_type: roomType,
      })
      setCode('')
      setTitle('')
      await load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'Course could not be created')
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Department Courses"
        description="Courses owned by your department."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Select
          label="Room type"
          value={roomType}
          options={ROOM_TYPES}
          onValueChange={setRoomType}
        />
        <Button onClick={() => void onCreate()}>Add course</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No department courses yet.</p>
      ) : (
        <ul className="grid gap-1 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              {row.code} — {row.title} ({row.status})
            </li>
          ))}
        </ul>
      )}
    </RoleShell>
  )
}
