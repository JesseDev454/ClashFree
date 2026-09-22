import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { RepairTimetablePage } from './RepairTimetablePage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const disruption = {
  id: 4,
  code: 'D-004',
  session_id: 1,
  kind: 'room',
  room_id: 2,
  lecturer_id: null,
  resource_label: 'LT1',
  reason: 'Projector failure',
  description: null,
  severity: 'high',
  starts_on: '2026-09-07',
  ends_on: '2026-09-07',
  start_period: '08-10',
  end_period: '08-10',
  status: 'open',
  reported_by: 1,
  reporter_name: 'Admin',
  reporter_role: 'timetable_administrator',
  block_id: null,
  classes_affected: 1,
  students_affected: 40,
  created_at: '2026-09-22T10:00:00+00:00',
  updated_at: '2026-09-22T10:00:00+00:00',
  impact: {
    classes_affected: 1,
    students_affected: 40,
    published: true,
    classes: [
      {
        assignment_id: 3,
        meeting_index: 0,
        course_code: 'CSC 401',
        course_title: 'Compilers',
        cohort_code: 'CSC 400',
        cohort_size: 40,
        weekday: 'mon',
        start_period: '08-10',
        end_period: '08-10',
        room_code: 'LT1',
        lecturer_name: 'Dr. Amina Yusuf',
      },
    ],
  },
}

function renderPage(path = '/admin/repair-timetable') {
  return render(
    <AuthContext.Provider
      value={{ user: null, loading: false, login: vi.fn(), logout: vi.fn() }}
    >
      <MemoryRouter initialEntries={[path]}>
        <RepairTimetablePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RepairTimetablePage', () => {
  it('keeps Start Repair disabled when nothing can be repaired', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/timetables/published')) {
          return jsonResponse({ detail: 'missing' }, 404)
        }
        if (url.includes('/api/disruptions')) {
          return jsonResponse([])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    expect(screen.getByRole('button', { name: 'Start Repair' })).toBeDisabled()
    expect(
      await screen.findByText(/Nothing is published yet/, undefined, { timeout: 10_000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Repair' })).toBeDisabled()
  }, 15_000)

  it('shows an error when repair options cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    expect(
      await screen.findByRole('alert', undefined, { timeout: 10_000 }),
    ).toHaveTextContent('Repair options could not be loaded.')
    expect(screen.getByRole('button', { name: 'Start Repair' })).toBeDisabled()
  }, 15_000)

  it('enables Start Repair after a disruption is chosen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/timetables/published')) {
          return jsonResponse({ id: 1, version_number: 1, slots: [] })
        }
        if (url.match(/\/api\/disruptions\/\d+/)) {
          return jsonResponse(disruption)
        }
        if (url.includes('/api/disruptions')) {
          return jsonResponse([disruption])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    expect(screen.getByRole('button', { name: 'Start Repair' })).toBeDisabled()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Repair' })).toBeEnabled()
    })
    expect(screen.getByText(/CSC 401/)).toBeInTheDocument()
  })
})
