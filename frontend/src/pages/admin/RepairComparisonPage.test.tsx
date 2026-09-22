import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/useAuth'
import { RepairComparisonPage } from './RepairComparisonPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const run = {
  id: 9,
  session_id: 1,
  weight_profile_id: 1,
  status: 'feasible',
  time_limit_seconds: 10,
  alternative_count: 2,
  random_seed: 13,
  started_at: '2026-09-22T10:00:00+00:00',
  finished_at: '2026-09-22T10:00:02+00:00',
  solve_time_ms: 800,
  message: 'Feasible repair generated.',
  created_by: 1,
  purpose: 'repair',
  disruption_id: 4,
  profile_name: 'Balanced',
  session_label: '2026/2027',
  solutions: [
    {
      id: 21,
      run_id: 9,
      label: 'A',
      objective: 12,
      hard_violations: 0,
      soft_penalty: 12,
      room_utilization_percent: 70,
      student_gap_hours: 1,
      is_selected: false,
      moved_count: 1,
      preserved_count: 18,
    },
    {
      id: 22,
      run_id: 9,
      label: 'B',
      objective: 40,
      hard_violations: 2,
      soft_penalty: 30,
      room_utilization_percent: 55,
      student_gap_hours: 3,
      is_selected: false,
      moved_count: 6,
      preserved_count: 13,
    },
  ],
}

function renderPage(path = '/admin/repair-comparison') {
  return render(
    <AuthContext.Provider
      value={{ user: null, loading: false, login: vi.fn(), logout: vi.fn() }}
    >
      <MemoryRouter initialEntries={[path]}>
        <RepairComparisonPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RepairComparisonPage', () => {
  it('asks for a repair run when none is selected', async () => {
    renderPage()
    expect(await screen.findByText(/No repair run selected/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change Review' })).toHaveAttribute(
      'href',
      '/admin/change-review',
    )
    expect(screen.getByRole('link', { name: 'Publish' })).toHaveAttribute(
      'href',
      '/admin/publish-timetable',
    )
  })

  it('renders options and keeps Use this option off the infeasible row', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(run)),
    )
    renderPage('/admin/repair-comparison?runId=9')
    expect(await screen.findByText('Moved classes')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Use this option' })).toHaveLength(1)
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })
})
