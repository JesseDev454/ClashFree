import { useState } from 'react'
import { fetchCohorts, fetchDepartments, fetchLecturers } from '../../api/academic'
import { createUser, fetchUsers, updateUser, type PortalUser } from '../../api/portals'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { useReload } from '../../hooks/useReload'

const ROLES = [
  { value: 'timetable_administrator', label: 'Administrator' },
  { value: 'department_coordinator', label: 'Department coordinator' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'facilities_manager', label: 'Facilities manager' },
  { value: 'student', label: 'Student' },
]

export function UsersRolesPage() {
  const [users, setUsers] = useState<PortalUser[]>([])
  const [departments, setDepartments] = useState<Array<{ value: string; label: string }>>(
    [],
  )
  const [cohorts, setCohorts] = useState<Array<{ value: string; label: string }>>([])
  const [lecturers, setLecturers] = useState<Array<{ value: string; label: string }>>([])
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [departmentId, setDepartmentId] = useState('none')
  const [cohortId, setCohortId] = useState('none')
  const [lecturerId, setLecturerId] = useState('none')
  const [error, setError] = useState<string | null>(null)

  function load() {
    return Promise.all([
      fetchUsers(),
      fetchDepartments(),
      fetchCohorts(),
      fetchLecturers(),
    ])
      .then(([userRows, departmentRows, cohortRows, lecturerRows]) => {
        setUsers(userRows)
        setDepartments(
          departmentRows.map((row) => ({ value: String(row.id), label: row.code })),
        )
        setCohorts(cohortRows.map((row) => ({ value: String(row.id), label: row.code })))
        setLecturers(
          lecturerRows.map((row) => ({ value: String(row.id), label: row.full_name })),
        )
        setError(null)
      })
      .catch((caught) => {
        setError(caught instanceof ApiError ? caught.detail : 'Users could not be loaded')
      })
  }

  useReload(async () => {
    await load()
  }, [])

  async function onCreate() {
    setError(null)
    try {
      await createUser({
        email,
        full_name: fullName,
        password,
        role,
        department_id: departmentId === 'none' ? null : Number(departmentId),
        cohort_id: role === 'student' && cohortId !== 'none' ? Number(cohortId) : null,
        lecturer_id:
          role === 'lecturer' && lecturerId !== 'none' ? Number(lecturerId) : null,
      })
      setEmail('')
      setFullName('')
      setPassword('')
      await load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'User could not be created')
    }
  }

  async function toggleActive(user: PortalUser) {
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      await load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'User could not be updated')
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Users & Roles"
        description="Create accounts and assign a role, department, and cohort."
      />
      {error ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Input
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Select label="Role" value={role} options={ROLES} onValueChange={setRole} />
        <Select
          label="Department"
          value={departmentId}
          options={[{ value: 'none', label: 'None' }, ...departments]}
          onValueChange={setDepartmentId}
        />
        {role === 'student' ? (
          <Select
            label="Cohort"
            value={cohortId}
            options={[{ value: 'none', label: 'Select' }, ...cohorts]}
            onValueChange={setCohortId}
          />
        ) : null}
        {role === 'lecturer' ? (
          <Select
            label="Lecturer profile"
            value={lecturerId}
            options={[{ value: 'none', label: 'None' }, ...lecturers]}
            onValueChange={setLecturerId}
          />
        ) : null}
        <Button onClick={() => void onCreate()}>Create user</Button>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-border">
              <td className="py-2">{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <Button onClick={() => void toggleActive(user)}>
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </RoleShell>
  )
}
