import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { UsersRolesPage } from './UsersRolesPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const seedUser = {
  id: 1,
  email: 'admin@clashfree.test',
  full_name: 'Ada Okonkwo',
  role: 'timetable_administrator',
  department_id: null,
  department_name: null,
  cohort_id: null,
  is_active: true,
  capabilities: ['view', 'edit'],
  home_path: '/admin/dashboard',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UsersRolesPage', () => {
  it('lists seed accounts and submits a new user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/api/users') && init?.method === 'POST') {
          return jsonResponse({ ...seedUser, id: 9, email: 'new@clashfree.test' }, 201)
        }
        if (url.includes('/api/users')) {
          return jsonResponse([seedUser])
        }
        return jsonResponse([])
      }),
    )

    render(
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <UsersRolesPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('admin@clashfree.test')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new@clashfree.test' },
    })
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'New Person' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'ClashFree!dev' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch)
      const posted = fetchMock.mock.calls.find((call) => {
        const init = call[1] as RequestInit | undefined
        return String(call[0]).includes('/api/users') && init?.method === 'POST'
      })
      expect(posted).toBeTruthy()
      const body = JSON.parse(String((posted?.[1] as RequestInit).body)) as {
        email: string
      }
      expect(body.email).toBe('new@clashfree.test')
    })
  })
})
