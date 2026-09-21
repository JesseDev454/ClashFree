import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { PublishTimetablePage } from './PublishTimetablePage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const preflight = {
  session_label: '2026/2027',
  semester: 'first',
  profile_name: 'Balanced',
  ready_assignments: 6,
  incomplete_assignments: 2,
  incomplete_codes: ['GST 203', 'CSC 201'],
  rooms_total: 7,
  rooms_usable: 5,
  rooms_excluded: 2,
  lecturers_total: 5,
  lecturers_submitted: 1,
  hard_constraints: 6,
  soft_constraints: 5,
  soft_enabled: 5,
  can_generate: true,
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
        <PublishTimetablePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PublishTimetablePage', () => {
  it('disables Confirm publish while loading and when no draft exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/timetables/draft')) {
          return new Promise<Response>((resolve) => {
            window.setTimeout(() => resolve(new Response('', { status: 404 })), 50)
          })
        }
        if (url.includes('/api/timetables/published')) {
          return new Response('', { status: 404 })
        }
        if (url.includes('/api/timetables/preflight')) {
          return jsonResponse(preflight)
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    expect(screen.getByRole('button', { name: 'Confirm publish' })).toBeDisabled()
    await waitFor(() => {
      expect(screen.getByText(/No draft timetable is selected/)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Confirm publish' })).toBeDisabled()
  })
})
