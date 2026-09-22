import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { AffectedClassesPage } from './AffectedClassesPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderPage(initial = '/facilities/affected-classes') {
  return render(
    <AuthContext.Provider
      value={{
        user: null,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[initial]}>
        <AffectedClassesPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const sample = {
  id: 7,
  code: 'D-007',
  session_id: 1,
  kind: 'room',
  room_id: 2,
  lecturer_id: null,
  resource_label: 'LT2',
  reason: 'Electrical fault',
  description: null,
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
  impact: {
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
  },
}

describe('AffectedClassesPage', () => {
  it('shows an empty catalogue when no room disruptions exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse([])),
    )
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText('No room disruptions have been reported.'),
      ).toBeInTheDocument()
    })
  })

  it('shows an error when disruptions cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: 'boom' }, 500)),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Affected classes could not be loaded.',
      )
    })
  })

  it('renders affected classes from the disruption payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.match(/\/api\/disruptions\/\d+/)) {
          return jsonResponse(sample)
        }
        if (url.includes('/api/disruptions')) {
          return jsonResponse([{ ...sample, impact: null }])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('SWE 401')).toBeInTheDocument()
    })
    expect(screen.getByText('Software Architecture')).toBeInTheDocument()
    expect(screen.getByText('SWE 400')).toBeInTheDocument()
  })
})
