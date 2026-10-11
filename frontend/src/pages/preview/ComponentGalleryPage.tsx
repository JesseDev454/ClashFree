import { CalendarDays, Columns3, Inbox, Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { Card, CardHeader } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Kbd } from '../../components/Kbd'
import { Logo, LogoMark } from '../../components/Logo'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Skeleton } from '../../components/Skeleton'
import { Stepper } from '../../components/Stepper'
import { Toaster } from '../../components/Toaster'
import { Tooltip, TooltipProvider } from '../../components/Tooltip'
import { WeekGrid } from '../../components/timetable/WeekGrid'
import type { GridEvent } from '../../components/timetable/types'
import { toast } from '../../lib/toast'
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
import { galleryCourses } from '../../fixtures/adminDashboard'
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
  const [segment, setSegment] = useState<'week' | 'day'>('week')
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
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <Toaster />
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <Logo showTagline />
            <p className="text-sm text-muted-foreground">
              Precision Motion design system ·{' '}
              <Link
                className="font-medium text-primary-text underline underline-offset-2"
                to="/preview/admin/dashboard"
              >
                Back to administrator dashboard
              </Link>
            </p>
          </div>
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

          <DesignFoundations />

          <Card>
            <h2 className="mb-4 text-[0.95rem] font-semibold">
              Buttons, inputs and select
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <Button onClick={() => setDisabledDemo(false)}>Primary action</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">
                <Trash2 aria-hidden="true" />
                Danger
              </Button>
              <Button size="sm">
                <Plus aria-hidden="true" />
                Small
              </Button>
              <Tooltip content="Icon buttons always carry a tooltip and an accessible name">
                <Button variant="outline" size="icon" aria-label="Open calendar">
                  <CalendarDays aria-hidden="true" />
                </Button>
              </Tooltip>
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTableState('loading')}
              >
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
            <CardHeader
              title="Timetable event cards"
              description="Department hue on the left edge; conflicts add a red outline, hatching and an alert icon so colour is never the only cue; unpublished changes get a blue inset outline."
            />
            <WeekGrid
              caption="Sample timetable"
              days={[
                { key: 'mon', label: 'Monday', short: 'Mon', note: '3 classes' },
                { key: 'tue', label: 'Tuesday', short: 'Tue', note: '1 class' },
              ]}
              events={galleryEvents}
              startHour={8}
              endHour={13}
              layoutPrefix="gallery"
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Segmented control, stepper and keys" />
              <div className="grid gap-4">
                <SegmentedControl
                  className="justify-self-start"
                  label="Timetable view"
                  value={segment}
                  onChange={setSegment}
                  options={[
                    {
                      value: 'week',
                      label: 'Week',
                      icon: <Columns3 aria-hidden="true" />,
                    },
                    {
                      value: 'day',
                      label: 'Day',
                      icon: <CalendarDays aria-hidden="true" />,
                    },
                  ]}
                />
                <Stepper
                  label="Example workflow"
                  current={2}
                  steps={[
                    { id: 'a', label: 'Select' },
                    { id: 'b', label: 'Validate' },
                    { id: 'c', label: 'Generate' },
                    { id: 'd', label: 'Review' },
                  ]}
                />
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  Search anywhere with <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd> · close dialogs with <Kbd>Esc</Kbd>
                </p>
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Feedback"
                description="Toasts confirm completed actions without blocking work."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: 'Timetable published',
                      description: 'Version 4 is live.',
                    })
                  }
                >
                  Success toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: 'Room B12 closed',
                      description: '5 classes affected.',
                      tone: 'warning',
                    })
                  }
                >
                  Warning toast
                </Button>
              </div>
              <div className="mt-5 grid gap-2" aria-hidden="true">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            </Card>
          </div>

          <Card className="p-0">
            <EmptyState
              icon={<Inbox />}
              title="No change requests"
              description="When lecturers or coordinators request an adjustment it appears here with its validation result."
              actions={<Button variant="outline">Learn about requests</Button>}
            />
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
    </TooltipProvider>
  )
}

const galleryEvents: GridEvent[] = [
  {
    id: 'g1',
    day: 'mon',
    start: 480,
    duration: 120,
    title: 'SEN 401',
    subtitle: 'Software Architecture',
    meta: 'Room A12 · SEN 400L',
    hue: 'blue',
    details: [{ label: 'Room', value: 'Room A12' }],
  },
  {
    id: 'g2',
    day: 'mon',
    start: 600,
    duration: 120,
    title: 'CSC 401',
    subtitle: 'Artificial Intelligence',
    meta: 'Room A08 · CSC 400L',
    hue: 'sky',
    conflict: true,
    conflictText: 'Room A08 double-booked',
    details: [{ label: 'Room', value: 'Room A08' }],
  },
  {
    id: 'g3',
    day: 'mon',
    start: 600,
    duration: 120,
    title: 'INS 405',
    subtitle: 'IS Audit & Governance',
    meta: 'Room A08 · INS 400L',
    hue: 'indigo',
    conflict: true,
    conflictText: 'Room A08 double-booked',
    details: [{ label: 'Room', value: 'Room A08' }],
  },
  {
    id: 'g4',
    day: 'tue',
    start: 540,
    duration: 120,
    title: 'INS 401',
    subtitle: 'Enterprise Systems',
    meta: 'Room B04 · INS 400L',
    hue: 'indigo',
    state: 'proposed',
    badge: 'Draft',
    details: [{ label: 'Room', value: 'Room B04' }],
  },
]

const swatchGroups = [
  {
    title: 'Brand',
    swatches: [
      ['Midnight Navy', '--brand-midnight', '#0B1220'],
      ['Deep Navy', '--brand-deep-navy', '#172554'],
      ['Electric Blue', '--brand-electric', '#2563EB'],
      ['Bright Blue', '--brand-bright', '#3B82F6'],
      ['Sky Accent', '--brand-sky', '#38BDF8'],
    ],
  },
  {
    title: 'Neutral',
    swatches: [
      ['Background', '--background', '#F8FAFC'],
      ['Surface', '--card', '#FFFFFF'],
      ['Secondary surface', '--muted', '#F1F5F9'],
      ['Border', '--border', '#E2E8F0'],
      ['Primary text', '--foreground', '#0F172A'],
      ['Secondary text', '--muted-foreground', '#5B6B80'],
      ['Muted text', '--subtle-foreground', '#94A3B8'],
    ],
  },
  {
    title: 'Semantic',
    swatches: [
      ['Success', '--success', '#059669'],
      ['Warning', '--warning', '#D97706'],
      ['Error', '--danger', '#DC2626'],
      ['Information', '--info', '#0284C7'],
    ],
  },
] as const

const typeScale = [
  ['Page title', 'text-[1.875rem] font-semibold tracking-[-0.025em]', '30px / 600'],
  ['Section heading', 'text-xl font-semibold tracking-[-0.02em]', '20px / 600'],
  ['Card heading', 'text-[15px] font-semibold', '15px / 600'],
  ['Body', 'text-[15px]', '15px / 400'],
  ['Secondary', 'text-[13px] text-muted-foreground', '13px / 400'],
  [
    'Numbers',
    'text-[1.75rem] font-semibold tracking-[-0.03em] tabular-nums',
    '28px tabular',
  ],
] as const

const motionTokens = [
  ['Button press', '100 ms'],
  ['Hover', '140 ms'],
  ['Menu / dropdown', '180 ms'],
  ['Modal', '220 ms'],
  ['Page', '220 ms'],
  ['Side panel', '260 ms'],
  ['Timetable move', '≈360 ms spring'],
  ['Success', '320 ms'],
] as const

function DesignFoundations() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader
          title="Brand"
          description="Three time blocks sharing lanes without overlapping — the ClashFree promise."
        />
        <div className="flex flex-wrap items-center gap-6">
          <Logo showTagline />
          <span className="rounded-[var(--radius-sm)] bg-sidebar px-4 py-3">
            <Logo tone="light" />
          </span>
          <LogoMark className="size-10" />
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Colour tokens"
          description="Light values shown; every token has a dark-mode counterpart."
        />
        <div className="grid gap-5">
          {swatchGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.title}
              </h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {group.swatches.map(([name, token, hex]) => (
                  <li key={token}>
                    <span
                      className="block h-12 rounded-[var(--radius-sm)] border border-border"
                      style={{ background: `var(${token})` }}
                      aria-hidden="true"
                    />
                    <span className="mt-1.5 block text-xs font-medium text-foreground">
                      {name}
                    </span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {hex}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Typography"
            description="Geist, with Inter as fallback. Tabular numbers for data."
          />
          <ul className="grid gap-3">
            {typeScale.map(([name, className, spec]) => (
              <li
                key={name}
                className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0"
              >
                <span className={className}>{name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{spec}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title="Motion"
            description="Animation only communicates state, direction or change. Reduced-motion preferences disable transforms."
          />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {motionTokens.map(([name, value]) => (
              <div key={name} className="contents">
                <dt className="text-muted-foreground">{name}</dt>
                <dd className="text-right font-medium text-foreground tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  )
}
