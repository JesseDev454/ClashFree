import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { MaintenanceSchedulePage } from './MaintenanceSchedulePage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        user: null,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter>
        <MaintenanceSchedulePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MaintenanceSchedulePage', () => {
  it('keeps Schedule Maintenance disabled until dates are filled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/rooms')) {
          return jsonResponse([
            {
              id: 3,
              code: 'ICT Lab 1',
              building: 'ICT',
              room_type: 'lab',
              capacity: 40,
              equipment: [],
              status: 'available',
            },
          ])
        }
        if (url.includes('/api/disruptions')) {
          return jsonResponse([])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    expect(screen.getByRole('button', { name: 'Schedule Maintenance' })).toBeDisabled()
    await waitFor(() => {
      expect(screen.getByText('No scheduled room disruptions.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Schedule Maintenance' })).toBeDisabled()
  })

  it('shows an error when the schedule cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Maintenance schedule could not be loaded.',
      )
    })
  })
})
