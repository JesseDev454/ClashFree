import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { AdminHomePage } from './AdminHomePage'

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
        user: {
          id: 1,
          email: 'admin@clashfree.test',
          full_name: 'Timetable Administrator',
          role: 'timetable_administrator',
          department_id: null,
          department_name: null,
          capabilities: ['view', 'edit', 'generate', 'publish', 'reportDisruption'],
          home_path: '/admin/dashboard',
        },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter>
        <AdminHomePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AdminHomePage', () => {
  it('loads recent disruptions from the API instead of preview fixtures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/academic/summary')) {
          return jsonResponse({
            courses: 8,
            lecturers: 5,
            cohorts: 4,
            rooms: 7,
            faculties: 1,
            departments: 1,
            active_session_label: '2026/2027',
            active_semester: 'first',
          })
        }
        if (url.includes('/api/timetables/draft')) {
          return new Response('', { status: 404 })
        }
        if (url.includes('/api/disruptions/summary')) {
          return jsonResponse({
            active: 3,
            scheduled: 1,
            open: 1,
            in_review: 1,
            room_active: 2,
            lecturer_active: 1,
            classes_affected: 0,
            students_affected: 0,
            published: false,
          })
        }
        if (url.includes('/api/disruptions')) {
          return jsonResponse([
            {
              id: 99,
              code: 'D-099',
              session_id: 1,
              kind: 'room',
              room_id: 1,
              lecturer_id: null,
              resource_label: 'LT1',
              reason: 'API-sourced outage',
              description: null,
              severity: 'medium',
              starts_on: '2026-09-21',
              ends_on: '2026-09-21',
              start_period: null,
              end_period: null,
              status: 'open',
              reported_by: 4,
              reporter_name: 'Facilities Manager',
              reporter_role: 'facilities_manager',
              block_id: null,
              classes_affected: 0,
              students_affected: 0,
              created_at: '2026-09-21T10:00:00+00:00',
              updated_at: '2026-09-21T10:00:00+00:00',
              impact: null,
            },
          ])
        }
        return jsonResponse({ detail: 'unexpected' }, 500)
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('LT1 — API-sourced outage')).toBeInTheDocument()
    })
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('Dr. A. Yusuf unavailable')).not.toBeInTheDocument()
    const repairLinks = screen.getAllByRole('link', { name: 'Repair Timetable' })
    expect(repairLinks.length).toBeGreaterThan(0)
    for (const link of repairLinks) {
      expect(link).toHaveAttribute('href', '/admin/repair-timetable')
    }
  })
})
