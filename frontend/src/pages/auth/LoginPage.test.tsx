import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthProvider'
import { LoginPage } from './LoginPage'

const adminUser = {
  id: 1,
  email: 'admin@clashfree.test',
  full_name: 'Ada Okonkwo',
  role: 'timetable_administrator',
  department_id: null,
  department_name: null,
  capabilities: ['generate', 'publish', 'view'],
  home_path: '/admin/dashboard',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderLogin() {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={['/auth/login']}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    )
  }

  return render(
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/admin/dashboard" element={<p>Administrator dashboard</p>} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginPage', () => {
  it('validates empty credentials before calling the API', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/me')) {
        return jsonResponse({ detail: 'Not authenticated' }, 401)
      }
      return jsonResponse({ detail: 'unexpected' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderLogin()
    await screen.findByRole('heading', { name: 'Sign in' })
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your email and password/i)
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/api/auth/login')),
    ).toBe(false)
  })

  it('renders the API error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/api/me')) {
          return jsonResponse({ detail: 'Not authenticated' }, 401)
        }
        if (url.endsWith('/api/auth/login')) {
          return jsonResponse({ detail: 'Invalid email or password' }, 401)
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    const user = userEvent.setup()
    renderLogin()
    await screen.findByRole('heading', { name: 'Sign in' })
    await user.type(screen.getByLabelText('Email'), 'admin@clashfree.test')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password',
    )
  })

  it('sends the signed-in user to their dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/me')) {
          return jsonResponse({ detail: 'Not authenticated' }, 401)
        }
        if (url.endsWith('/api/auth/login') && init?.method === 'POST') {
          return jsonResponse({ user: adminUser })
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    const user = userEvent.setup()
    renderLogin()
    await screen.findByRole('heading', { name: 'Sign in' })
    await user.type(screen.getByLabelText('Email'), 'admin@clashfree.test')
    await user.type(screen.getByLabelText('Password'), 'ClashFree!dev')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => {
      expect(screen.getByText('Administrator dashboard')).toBeInTheDocument()
    })
  })
})
