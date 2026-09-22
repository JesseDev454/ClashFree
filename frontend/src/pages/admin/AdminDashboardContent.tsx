import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ChartCard } from '../../components/ChartCard'
import { DataTable } from '../../components/DataTable'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import {
  classesPerDay,
  dashboardMetrics,
  disruptionRows,
  lecturerWorkload,
  timetableStatusItems,
  type DisruptionRow,
} from '../../fixtures/adminDashboard'
import type { TableColumn } from '../../types/table'

const disruptionColumns: TableColumn<DisruptionRow>[] = [
  { id: 'type', header: 'Type', accessor: (row) => row.type },
  { id: 'details', header: 'Details', accessor: (row) => row.details },
  { id: 'affected', header: 'Affected', accessor: (row) => row.affected },
  { id: 'reportedBy', header: 'Reported by', accessor: (row) => row.reportedBy },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => (
      <StatusBadge variant={row.statusVariant}>{row.status}</StatusBadge>
    ),
  },
]

const solverUnavailableId = 'solver-unavailable-help'

type AdminDashboardContentProps = {
  reportsHref: string
  generateHref?: string
  publishHref?: string
  repairHref?: string
  welcomeName?: string
  helperText: string
  metrics?: typeof dashboardMetrics
  classChart?: typeof classesPerDay
  disruptionRows?: DisruptionRow[]
}

export function AdminDashboardContent({
  reportsHref,
  generateHref,
  publishHref,
  repairHref,
  welcomeName = 'Timetable Administrator',
  helperText,
  metrics = dashboardMetrics,
  classChart = classesPerDay,
  disruptionRows: recentDisruptions = disruptionRows,
}: AdminDashboardContentProps) {
  const generateButton = generateHref ? (
    <Button asChild>
      <Link to={generateHref}>Generate Timetable</Link>
    </Button>
  ) : (
    <Button disabled aria-describedby={solverUnavailableId}>
      Generate Timetable
    </Button>
  )
  const generateQuickAction = generateHref ? (
    <Button asChild>
      <Link to={generateHref}>Generate Timetable</Link>
    </Button>
  ) : (
    <Button disabled aria-describedby={solverUnavailableId}>
      Generate Timetable
    </Button>
  )

  return (
    <>
      <PageHeader
        title={`Welcome back, ${welcomeName}`}
        description="Manage academic resources, generate clash-free timetables, and keep the university on schedule."
        actions={generateButton}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            tint={metric.tint}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <ChartCard
            kind="bar"
            title="Classes per Day"
            data={classChart.map((item) => ({ label: item.day, value: item.classes }))}
          />
        </div>
        <div className="xl:col-span-4">
          <ChartCard
            kind="donut"
            title="Lecturer Workload"
            data={lecturerWorkload}
            centerValue="94"
          />
        </div>
        <Card className="xl:col-span-3">
          <h2 className="mb-4 text-[0.95rem] font-semibold">Quick Actions</h2>
          <div className="grid gap-2">
            {generateQuickAction}
            {repairHref ? (
              <Button variant="outline" asChild>
                <Link to={repairHref}>Repair Timetable</Link>
              </Button>
            ) : (
              <Button variant="outline" disabled aria-describedby={solverUnavailableId}>
                Repair Timetable
              </Button>
            )}
            {publishHref ? (
              <Button variant="outline" asChild>
                <Link to={publishHref}>Publish Timetable</Link>
              </Button>
            ) : (
              <Button variant="outline" disabled aria-describedby={solverUnavailableId}>
                Publish Timetable
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={reportsHref}>View Reports</Link>
            </Button>
          </div>
          <p id={solverUnavailableId} className="mt-3 text-xs text-muted-foreground">
            {helperText}
          </p>
        </Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <h2 className="mb-4 text-[0.95rem] font-semibold">Recent Disruptions</h2>
          <DataTable
            caption="Recent timetable disruptions"
            columns={disruptionColumns}
            data={recentDisruptions}
            getRowId={(row) => row.id}
          />
        </Card>
        <Card className="xl:col-span-5">
          <h2 className="mb-4 text-[0.95rem] font-semibold">Timetable Status</h2>
          <ol className="grid gap-4">
            {timetableStatusItems.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  )
}
