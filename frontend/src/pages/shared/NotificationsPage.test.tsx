import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNotifications } from '../../api/activity'
import { AuthContext } from '../../auth/useAuth'
import { NotificationsPage } from './NotificationsPage'

vi.mock('../../api/activity', () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchNotifications).mockReset()
  })

  it('shows the empty state when there are no notifications', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([])
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
          <NotificationsPage
            title="Notifications"
            description="Alerts for timetable changes."
          />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('No notifications yet.')).toBeInTheDocument()
    })
  })
})
