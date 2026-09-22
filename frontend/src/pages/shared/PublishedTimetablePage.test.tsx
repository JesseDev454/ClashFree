import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { AuthContext } from '../../auth/useAuth'
import { PublishedTimetablePage } from './PublishedTimetablePage'

function unpublished(): Promise<never> {
  return Promise.reject(new ApiError(404, 'Not found'))
}

describe('PublishedTimetablePage', () => {
  it('shows the empty state when nothing is published', async () => {
    render(
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <PublishedTimetablePage
            title="Department Timetable"
            description="Published meetings for your department."
            load={unpublished}
            emptyLabel="No published meetings for this department."
          />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Department Timetable' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Nothing is published yet.')).toBeInTheDocument()
    })
  })
})
