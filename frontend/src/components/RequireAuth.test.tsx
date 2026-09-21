import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../api/auth'
import { AuthContext } from '../auth/useAuth'
import { RequireAuth } from './RequireAuth'

const student: AuthUser = {
  id: 5,
  email: 'student@clashfree.test',
  full_name: 'Ngozi Eze',
  role: 'student',
  department_id: 1,
  department_name: 'Software Engineering',
  capabilities: ['view'],
  home_path: '/student/dashboard',
}

const lecturer: AuthUser = {
  id: 3,
  email: 'lecturer@clashfree.test',
  full_name: 'Dr. Amina Yusuf',
  role: 'lecturer',
  department_id: 1,
  department_name: 'Software Engineering',
  capabilities: ['view', 'edit'],
  home_path: '/lecturer/dashboard',
}

function LoginMarker() {
  const [params] = useSearchParams()
  return <p>Login screen {params.get('next')}</p>
}

function renderGuarded(path: string, user: AuthUser | null) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth roles={['timetable_administrator']}>
                <p>Administrator secret</p>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <RequireAuth roles={['timetable_administrator']}>
                <p>Courses catalogue</p>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/constraint-weights"
            element={
              <RequireAuth roles={['timetable_administrator']}>
                <p>Constraint weights</p>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/scheduling-constraints"
            element={
              <RequireAuth roles={['timetable_administrator']}>
                <p>Scheduling constraints</p>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/generate-timetable"
            element={
              <RequireAuth roles={['timetable_administrator']}>
                <p>Generate timetable</p>
              </RequireAuth>
            }
          />
          <Route
            path="/lecturer/availability"
            element={
              <RequireAuth roles={['lecturer']}>
                <p>Lecturer availability</p>
              </RequireAuth>
            }
          />
          <Route path="/auth/login" element={<LoginMarker />} />
          <Route path="/forbidden" element={<p>Forbidden screen</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireAuth', () => {
  it('sends a logged-out visitor to login with a next path', () => {
    renderGuarded('/admin/dashboard', null)
    expect(screen.getByText('Login screen /admin/dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Administrator secret')).not.toBeInTheDocument()
  })

  it('sends a student away from the administrator dashboard', () => {
    renderGuarded('/admin/dashboard', student)
    expect(screen.getByText('Forbidden screen')).toBeInTheDocument()
    expect(screen.queryByText('Administrator secret')).not.toBeInTheDocument()
  })

  it('sends a student away from administrator courses', () => {
    renderGuarded('/admin/courses', student)
    expect(screen.getByText('Forbidden screen')).toBeInTheDocument()
    expect(screen.queryByText('Courses catalogue')).not.toBeInTheDocument()
  })

  it('sends a student away from constraint weights', () => {
    renderGuarded('/admin/constraint-weights', student)
    expect(screen.getByText('Forbidden screen')).toBeInTheDocument()
    expect(screen.queryByText('Constraint weights')).not.toBeInTheDocument()
  })

  it('sends a lecturer away from scheduling constraints', () => {
    renderGuarded('/admin/scheduling-constraints', lecturer)
    expect(screen.getByText('Forbidden screen')).toBeInTheDocument()
    expect(screen.queryByText('Scheduling constraints')).not.toBeInTheDocument()
  })

  it('sends a lecturer away from generate timetable', () => {
    renderGuarded('/admin/generate-timetable', lecturer)
    expect(screen.getByText('Forbidden screen')).toBeInTheDocument()
    expect(screen.queryByText('Generate timetable')).not.toBeInTheDocument()
  })

  it('lets a lecturer stay on availability', () => {
    renderGuarded('/lecturer/availability', lecturer)
    expect(screen.getByText('Lecturer availability')).toBeInTheDocument()
  })
})
