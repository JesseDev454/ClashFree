import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { DisruptionCentrePage } from './DisruptionCentrePage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const sampleImpact = {
  classes_affected: 1,
  students_affected: 45,
  published: true,
  classes: [
    {
      assignment_id: 11,
      meeting_index: 0,
      course_code: 'SWE 401',
      course_title: 'Software Architecture',
      cohort_code: 'SWE 400',
      cohort_size: 45,
      weekday: 'mon',
      start_period: '08-10',
      end_period: '08-10',
      room_code: 'LT2',
      lecturer_name: 'Dr. Amina Yusuf',
    },
  ],
}

const sampleDisruption = {
  id: 1,
  code: 'D-001',
  session_id: 1,
  kind: 'room',
  room_id: 2,
  lecturer_id: null,
  resource_label: 'LT2',
  reason: 'Electrical fault',
  description: 'LT2 unavailable',
  severity: 'high',
  starts_on: '2026-09-21',
  ends_on: '2026-09-28',
  start_period: null,
  end_period: null,
  status: 'open',
  reported_by: 4,
  reporter_name: 'Facilities Manager',
  reporter_role: 'facilities_manager',
  block_id: null,
  classes_affected: 1,
  students_affected: 45,
  created_at: '2026-09-21T10:00:00+00:00',
  updated_at: '2026-09-21T10:00:00+00:00',
  impact: null,
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
        <DisruptionCentrePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DisruptionCentrePage', () => {
  it('links Repair Timetable and shows an empty catalogue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/summary')) {
          return jsonResponse({
            active: 0,
            scheduled: 0,
            open: 0,
            in_review: 0,
            room_active: 0,
            lecturer_active: 0,
            classes_affected: 0,
            students_affected: 0,
            published: false,
          })
        }
        return jsonResponse([])
      }),
    )
    renderPage()
    expect(screen.getByRole('link', { name: 'Repair Timetable' })).toHaveAttribute(
      'href',
      '/admin/repair-timetable',
    )
    expect(
      await screen.findByText('No disruptions match the current filters.', undefined, {
        timeout: 10_000,
      }),
    ).toBeInTheDocument()
  }, 15_000)

  it('shows an error when disruptions cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Disruptions could not be loaded.',
      )
    })
  })

  it('renders impact classes from the disruption payload', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/disruptions/summary')) {
          return jsonResponse({
            active: 1,
            scheduled: 0,
            open: 1,
            in_review: 0,
            room_active: 1,
            lecturer_active: 0,
            classes_affected: 1,
            students_affected: 45,
            published: true,
          })
        }
        if (url.match(/\/api\/disruptions\/\d+/)) {
          return jsonResponse({ ...sampleDisruption, impact: sampleImpact })
        }
        if (url.includes('/api/disruptions')) {
          return jsonResponse([sampleDisruption])
        }
        if (url.includes('/api/rooms') || url.includes('/api/lecturers')) {
          return jsonResponse([])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Electrical fault')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Analyze Impact' }))
    await waitFor(() => {
      expect(screen.getByText(/SWE 401/)).toBeInTheDocument()
    })
    expect(screen.getByText(/SWE 400/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Repair Timetable' })).toHaveAttribute(
      'href',
      '/admin/repair-timetable?disruptionId=1',
    )
  })
})
