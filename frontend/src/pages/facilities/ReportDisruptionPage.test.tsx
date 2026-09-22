import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { ReportDisruptionPage } from './ReportDisruptionPage'

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
        <ReportDisruptionPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ReportDisruptionPage', () => {
  it('keeps Report Disruption disabled until required fields are filled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse([
          {
            id: 2,
            code: 'LT2',
            building: 'Main',
            room_type: 'lecture_theatre',
            capacity: 120,
            equipment: null,
            status: 'available',
          },
        ]),
      ),
    )
    renderPage()
    expect(screen.getByRole('button', { name: 'Report Disruption' })).toBeDisabled()
    expect(screen.getByLabelText('Reason')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report Disruption' })).toBeDisabled()
  })

  it('shows an error when rooms cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Rooms could not be loaded.')
    })
  })
})
