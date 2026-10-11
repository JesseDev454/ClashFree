import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoStoreForTests } from '../../../demo/store'
import { renderWithProviders } from '../../../test/providers'
import { DemoMasterTimetablePage } from './DemoMasterTimetablePage'
import { DemoRepairStudioPage } from './DemoRepairStudioPage'

beforeEach(() => {
  resetDemoStoreForTests()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('design-lab master timetable', () => {
  it('resolves the seeded room clash with a validated move that stays in the draft', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DemoMasterTimetablePage />)

    expect(screen.getByText(/1 conflict needs/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^INS 405\. .*Tuesday 14:00/ }))

    const panel = await screen.findByRole('dialog', { name: 'Class details' })
    expect(within(panel).getByText('Room A08 double-booked')).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: /Move to another time/ }))

    expect(screen.getByText(/Choose a new time for INS 405/)).toBeInTheDocument()
    const blocked = screen.getByRole('button', { name: /^Monday 10:00 — / })
    expect(blocked).toHaveAttribute('aria-disabled', 'true')
    expect(blocked).toHaveAccessibleName(/INS 400L already has INS 401/)

    await user.click(screen.getByRole('button', { name: /^Wednesday 12:00 — Available/ }))
    const proposal = await screen.findByRole('dialog', {
      name: 'Propose moving INS 405?',
    })
    expect(within(proposal).getByText('Wed 12:00–14:00 · Room A08')).toBeInTheDocument()
    await user.click(within(proposal).getByRole('button', { name: 'Add to draft' }))

    expect(await screen.findByText('1 unpublished change')).toBeInTheDocument()
    expect(screen.queryByText(/conflict needs/)).not.toBeInTheDocument()
    expect(screen.getByText('Draft · 1 unpublished')).toBeInTheDocument()
  })
})

describe('design-lab repair studio', () => {
  it('walks from a room closure to a published repair', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DemoRepairStudioPage />)

    expect(screen.getByText('No open disruptions')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Simulate B12 maintenance/ }))
    expect(screen.getByText('5 scheduled classes are affected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Find repair options' }))
    const recommended = await screen.findByRole(
      'radio',
      { name: /Same times, new rooms/ },
      { timeout: 4000 },
    )
    expect(recommended).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Proposed')).toBeInTheDocument()
    expect(screen.getByText(/Nothing has changed for students/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Approve option' }))
    expect(await screen.findByText('Approved · awaiting publication')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Publish v4…' }))
    const confirm = await screen.findByRole('dialog', {
      name: 'Publish timetable version 4?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Publish' }))

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Version 4 published' }),
      ).toBeInTheDocument(),
    )
  }, 15_000)
})
