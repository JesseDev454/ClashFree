import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { LecturerPreferencesPage } from './LecturerPreferencesPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const preferences = {
  lecturer_id: 1,
  prefer_morning: true,
  avoid_friday_afternoon: true,
  no_early_after_late: false,
  max_classes_per_day: 2,
  max_consecutive_hours: 4,
  min_break_minutes: 60,
  preferred_days: ['mon', 'tue', 'thu', 'fri'],
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
        <LecturerPreferencesPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LecturerPreferencesPage', () => {
  it('validates workload fields before calling the API', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (
        url.includes('/api/me/preferences') &&
        (!init?.method || init.method === 'GET')
      ) {
        return jsonResponse(preferences)
      }
      return jsonResponse({ detail: 'unexpected' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    const classes = await screen.findByLabelText('Preferred maximum classes per day')
    await user.clear(classes)
    await user.type(classes, '0')
    await user.click(screen.getAllByRole('button', { name: 'Save Preferences' })[0])
    expect(screen.getByRole('alert')).toHaveTextContent(/enter 1–8 classes per day/i)
    expect(
      fetchMock.mock.calls.some(
        (call) => call[1] && (call[1] as RequestInit).method === 'PUT',
      ),
    ).toBe(false)
  })

  it('shows an error when preferences cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Preferences could not be loaded.',
      )
    })
  })
})
