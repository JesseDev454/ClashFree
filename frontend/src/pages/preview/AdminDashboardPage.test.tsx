import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoStoreForTests } from '../../demo/store'
import { renderWithProviders } from '../../test/providers'
import { AdminDashboardPage } from './AdminDashboardPage'

beforeEach(() => {
  resetDemoStoreForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('administrator dashboard preview', () => {
  it('labels demo data, keeps generation inert and links to the design-lab screens', async () => {
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
    expect(screen.getByRole('link', { name: /Repair Timetable/ })).toHaveAttribute(
      'href',
      '/preview/admin/repair-studio',
    )
    expect(screen.getAllByRole('link', { name: /Open Timetable/ })[0]).toHaveAttribute(
      'href',
      '/preview/admin/master-timetable',
    )
    expect(screen.getByText('Room A08 double-booked')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('backend-status')).toHaveTextContent('API unreachable')
    })
  }, 10_000)
})
