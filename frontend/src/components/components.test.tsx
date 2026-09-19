import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { Select } from '../components/Select'
import { StatusBadge } from '../components/StatusBadge'
import { TimetableGrid } from '../components/TimetableGrid'
import { galleryTimetableEntries } from '../fixtures/adminDashboard'

function FilterExample() {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  return (
    <FilterBar
      filters={[
        {
          id: 'search',
          type: 'search',
          label: 'Search courses',
          value: query,
          onChange: setQuery,
        },
        {
          id: 'department',
          type: 'select',
          label: 'Department',
          value: department,
          options: [
            { value: 'all', label: 'All departments' },
            { value: 'swe', label: 'Software Engineering' },
          ],
          onChange: setDepartment,
        },
      ]}
      onReset={() => {
        setQuery('')
        setDepartment('all')
      }}
    />
  )
}

describe('shared controls', () => {
  it('invokes a button action and ignores disabled clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <>
        <Button onClick={onClick}>Save</Button>
        <Button disabled onClick={onClick}>
          Locked
        </Button>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Locked' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('associates input labels', () => {
    render(<Input label="Course code" />)
    expect(screen.getByLabelText('Course code')).toBeInTheDocument()
  })

  it('supports keyboard selection', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [value, setValue] = useState('all')
      return (
        <Select
          label="Department"
          value={value}
          onValueChange={setValue}
          options={[
            { value: 'all', label: 'All departments' },
            { value: 'swe', label: 'Software Engineering' },
          ]}
        />
      )
    }
    render(<Harness />)
    await user.tab()
    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByLabelText('Department')).toHaveTextContent('Software Engineering')
  })

  it('filters and resets from the filter bar', async () => {
    const user = userEvent.setup()
    render(<FilterExample />)
    await user.type(screen.getByLabelText('Search courses'), 'SWE')
    expect(screen.getByLabelText('Search courses')).toHaveValue('SWE')
    await user.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(screen.getByLabelText('Search courses')).toHaveValue('')
  })
})

describe('dialogs', () => {
  it('moves focus into a modal and restores it on escape', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Course details"
          description="Preview dialog"
          trigger={<Button>Open details modal</Button>}
        >
          <p>Fixture course</p>
        </Modal>
      )
    }
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open details modal' })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('cancels a confirmation without running confirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Apply sample repair?"
          description="Preview only"
          onConfirm={onConfirm}
          trigger={<Button>Open confirmation</Button>}
        />
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open confirmation' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('data components', () => {
  const columns = [
    { id: 'name', header: 'Name', accessor: (row: { name: string }) => row.name },
  ]

  it('renders loading, empty, error and populated states', () => {
    const { rerender } = render(
      <DataTable
        caption="Courses"
        columns={columns}
        data={[]}
        getRowId={(row) => row.name}
        state="loading"
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading records')
    rerender(
      <DataTable
        caption="Courses"
        columns={columns}
        data={[]}
        getRowId={(row) => row.name}
        state="empty"
      />,
    )
    expect(screen.getByText('No records to show.')).toBeInTheDocument()
    rerender(
      <DataTable
        caption="Courses"
        columns={columns}
        data={[]}
        getRowId={(row) => row.name}
        state="error"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded')
    rerender(
      <DataTable
        caption="Courses"
        columns={columns}
        data={[{ name: 'SWE 401' }]}
        getRowId={(row) => row.name}
        state="populated"
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByText('SWE 401')).toBeInTheDocument()
  })

  it('exposes readable status text', () => {
    render(<StatusBadge variant="danger">Open</StatusBadge>)
    expect(screen.getByText('Open')).toBeVisible()
  })

  it('lists overlapping timetable entries accessibly', () => {
    render(<TimetableGrid entries={galleryTimetableEntries} />)
    expect(screen.getByText(/Accessible timetable list/)).toBeInTheDocument()
    expect(screen.getAllByText(/Overlap/).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/SWE 401 · Software Architecture \(overlap\)/),
    ).toBeInTheDocument()
  })
})
