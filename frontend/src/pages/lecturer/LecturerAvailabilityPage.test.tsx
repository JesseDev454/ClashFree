import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { allSlots } from '../../lib/schedule'
import { LecturerAvailabilityPage } from './LecturerAvailabilityPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const availability = {
  lecturer_id: 1,
  lecturer_name: 'Dr. Amina Yusuf',
  submitted: true,
  coverage_percent: 100,
  available_slots: 25,
  preferred_slots: 0,
  unavailable_slots: 0,
  slots: allSlots('available'),
  exceptions: [],
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
        <LecturerAvailabilityPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LecturerAvailabilityPage', () => {
  it('cycles a slot and saves the weekly grid', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (
        url.includes('/api/me/availability') &&
        (!init?.method || init.method === 'GET')
      ) {
        return jsonResponse(availability)
      }
      if (url.includes('/api/me/availability') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as { slots: typeof availability.slots }
        const preferred = body.slots.filter((slot) => slot.state === 'preferred').length
        return jsonResponse({
          ...availability,
          preferred_slots: preferred,
          available_slots: 25 - preferred,
          slots: body.slots,
        })
      }
      return jsonResponse({ detail: 'unexpected' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await screen.findByRole('button', { name: 'Monday 08-10 available' })
    await user.click(screen.getByRole('button', { name: 'Monday 08-10 available' }))
    expect(
      screen.getByRole('button', { name: 'Monday 08-10 preferred' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Availability' }))
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Availability saved.')
    })
    expect(
      fetchMock.mock.calls.some(
        (call) => call[1] && (call[1] as RequestInit).method === 'PUT',
      ),
    ).toBe(true)
  })

  it('shows an error when availability cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Availability could not be loaded.',
      )
    })
  })
})
