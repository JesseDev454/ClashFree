import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ChartCard } from '../../components/ChartCard'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import { FilterBar } from '../../components/FilterBar'
import { Input } from '../../components/Input'
import { MetricCard } from '../../components/MetricCard'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import { TimetableGrid } from '../../components/TimetableGrid'
import { galleryCourses, galleryTimetableEntries } from '../../fixtures/adminDashboard'
import type { DataViewState, TableColumn } from '../../types/table'

type CourseRow = (typeof galleryCourses)[number]

const columns: TableColumn<CourseRow>[] = [
  { id: 'code', header: 'Code', accessor: (row) => row.code },
  { id: 'title', header: 'Title', accessor: (row) => row.title },
  { id: 'department', header: 'Department', accessor: (row) => row.department },
]

const departmentOptions = [
  { value: 'all', label: 'All departments' },
  { value: 'Software Engineering', label: 'Software Engineering' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Electrical Engineering', label: 'Electrical Engineering' },
]

export function ComponentGalleryPage() {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [tableState, setTableState] = useState<DataViewState>('populated')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [disabledDemo, setDisabledDemo] = useState(false)
  const modalTriggerRef = useRef<HTMLButtonElement>(null)
  const confirmationTriggerRef = useRef<HTMLButtonElement>(null)

  const filtered = useMemo(() => {
    return galleryCourses.filter((course) => {
      const matchesQuery = `${course.code} ${course.title}`
        .toLowerCase()
        .includes(query.toLowerCase())
      const matchesDepartment = department === 'all' || course.department === department
      return matchesQuery && matchesDepartment
    })
  }, [department, query])

  function resetExamples() {
    setQuery('')
    setDepartment('all')
    setTableState('populated')
    setModalOpen(false)
    setConfirmOpen(false)
    setConfirmed(false)
    setDisabledDemo(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <p className="text-lg font-bold">ClashFree component gallery</p>
        <p className="text-sm text-muted-foreground">
          Shared primitives for later phases.{' '}
          <Link className="text-primary underline" to="/preview/admin/dashboard">
            Back to administrator dashboard
          </Link>
        </p>
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 p-6">
        <PageHeader
          title="Reusable components"
          description="Interactive examples are local and resettable. No API requests are made."
          actions={
            <Button variant="outline" onClick={resetExamples}>
              Reset examples
            </Button>
          }
        />

        <Card>
          <h2 className="mb-4 text-[0.95rem] font-semibold">
            Buttons, inputs and select
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <Button onClick={() => setDisabledDemo(false)}>Primary action</Button>
            <Button variant="outline">Outline</Button>
            <Button disabled={disabledDemo} onClick={() => setDisabledDemo(true)}>
              {disabledDemo ? 'Now disabled' : 'Disable this button'}
            </Button>
            <Button disabled>Unavailable action</Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Course code"
              placeholder="SWE 401"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              hint="Used by the filter example below."
            />
            <Select
              label="Department"
              value={department}
              onValueChange={setDepartment}
              options={departmentOptions}
            />
          </div>
        </Card>

        <FilterBar
          filters={[
            {
              id: 'course-search',
              type: 'search',
              label: 'Search courses',
              value: query,
              placeholder: 'Code or title',
              onChange: setQuery,
            },
            {
              id: 'department-filter',
              type: 'select',
              label: 'Department',
              value: department,
              options: departmentOptions,
              onChange: setDepartment,
            },
          ]}
          onReset={resetExamples}
        />

        <Card>
          <h2 className="mb-4 text-[0.95rem] font-semibold">Data table states</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTableState('populated')}
            >
              Populated
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTableState('loading')}>
              Loading
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTableState('empty')}>
              Empty
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTableState('error')}>
              Error
            </Button>
          </div>
          <DataTable
            caption="Filtered courses"
            columns={columns}
            data={filtered}
            getRowId={(row) => row.id}
            state={
              tableState === 'populated' && filtered.length === 0 ? 'empty' : tableState
            }
            emptyMessage="No courses match the current filters."
          />
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            label="Sample metric"
            value="327"
            hint="Fixture value"
            tint="blue"
          />
          <Card>
            <h2 className="mb-3 text-[0.95rem] font-semibold">Status badges</h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant="danger">Open</StatusBadge>
              <StatusBadge variant="warning">In review</StatusBadge>
              <StatusBadge variant="info">Scheduled</StatusBadge>
              <StatusBadge variant="success">Published</StatusBadge>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            kind="bar"
            title="Classes per day"
            data={[
              { label: 'Mon', value: 54 },
              { label: 'Tue', value: 62 },
              { label: 'Wed', value: 58 },
            ]}
          />
          <ChartCard kind="bar" title="Empty chart" state="empty" data={[]} />
        </div>
        <ChartCard kind="bar" title="Loading chart" state="loading" data={[]} />
        <ChartCard kind="bar" title="Error chart" state="error" data={[]} />

        <Card>
          <h2 className="mb-4 text-[0.95rem] font-semibold">Timetable grid</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Monday 08:00 contains two classes so the overlap is visible in the grid and
            listed below.
          </p>
          <TimetableGrid entries={galleryTimetableEntries} />
        </Card>

        <Card>
          <h2 className="mb-4 text-[0.95rem] font-semibold">Modal and confirmation</h2>
          <div className="flex flex-wrap gap-2">
            <Button ref={modalTriggerRef} onClick={() => setModalOpen(true)}>
              Open details modal
            </Button>
            <Button
              ref={confirmationTriggerRef}
              variant="outline"
              onClick={() => setConfirmOpen(true)}
            >
              Open confirmation
            </Button>
          </div>
          {confirmed ? (
            <p className="mt-3 text-sm text-success">
              Confirmation accepted in this preview only.
            </p>
          ) : null}
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Course details"
            description="Local preview dialog. Escape or Close returns focus to the trigger."
            restoreFocusRef={modalTriggerRef}
          >
            <p className="text-sm">
              SWE 401 stays in this browser session until you reset examples.
            </p>
          </Modal>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Apply sample repair?"
            description="This preview will not change a published timetable or call an API."
            onConfirm={() => setConfirmed(true)}
            restoreFocusRef={confirmationTriggerRef}
          />
        </Card>
      </main>
    </div>
  )
}
