import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { TimetableVersionsPage } from './TimetableVersionsPage'

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
        <TimetableVersionsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TimetableVersionsPage', () => {
  it('prompts to publish when no versions exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/api/timetables/versions')) {
          return jsonResponse([])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/No published timetable yet/)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Publish a draft' })).toHaveAttribute(
      'href',
      '/admin/publish-timetable',
    )
  })

  it('shows an error when versions cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Timetable versions could not be loaded.',
      )
    })
  })
})
