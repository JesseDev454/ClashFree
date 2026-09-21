import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/providers'
import { AdminDashboardPage } from './AdminDashboardPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('administrator dashboard preview', () => {
  it('labels sample data and does not activate solver actions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const user = userEvent.setup()
    renderWithProviders(<AdminDashboardPage />)
    expect(screen.getByRole('status')).toHaveTextContent(/sample fixtures/i)
    const generateButtons = screen.getAllByRole('button', { name: 'Generate Timetable' })
    for (const button of generateButtons) {
      expect(button).toBeDisabled()
      await user.click(button)
    }
    expect(
      screen.queryByText(/timetable generated successfully/i),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/workflows are unavailable/i)).toBeInTheDocument()
    const publishButton = screen.getByRole('button', { name: 'Publish Timetable' })
    expect(publishButton).toBeDisabled()
    expect(publishButton.tagName).toBe('BUTTON')
    await waitFor(() => {
      expect(screen.getByTestId('backend-status')).toHaveTextContent('API unreachable')
    })
  })
})
