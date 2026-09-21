import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { ReportUnavailabilityPage } from './ReportUnavailabilityPage'

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
        <ReportUnavailabilityPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ReportUnavailabilityPage', () => {
  it('keeps Submit Report disabled until required fields are filled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/api/disruptions')) {
          return jsonResponse([])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    expect(screen.getByRole('button', { name: 'Submit Report' })).toBeDisabled()
    await waitFor(() => {
      expect(
        screen.getByText(/You have not reported unavailability yet/),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Submit Report' })).toBeDisabled()
  })

  it('shows an error when reports cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Unavailability reports could not be loaded.',
      )
    })
  })
})
