import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { ChangeReviewPage } from './ChangeReviewPage'

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
        <ChangeReviewPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChangeReviewPage', () => {
  it('prompts to generate when no draft exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/api/timetables/draft')) {
          return new Response('', { status: 404 })
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/No draft timetable is selected/)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Generate a timetable' })).toHaveAttribute(
      'href',
      '/admin/generate-timetable',
    )
  })

  it('shows an error when change review cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Change review could not be loaded.',
      )
    })
  })
})
