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
})
