import type { ReactNode } from 'react'
import { Card } from '../../components/Card'
import { FilterBar, type FilterField } from '../../components/FilterBar'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import type { DashboardMetric } from '../../fixtures/adminDashboard'

type AdminCrudShellProps = {
  title: string
  description: string
  actions?: ReactNode
  metrics?: DashboardMetric[]
  extras?: ReactNode
  filters?: FilterField[]
  onResetFilters?: () => void
  children: ReactNode
}

export function AdminCrudShell({
  title,
  description,
  actions,
  metrics,
  extras,
  filters,
  onResetFilters,
  children,
}: AdminCrudShellProps) {
  return (
    <RoleShell>
      <PageHeader title={title} description={description} actions={actions} />
      {metrics && metrics.length > 0 ? (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      ) : null}
      {extras}
      {filters ? (
        <div className="mb-4">
          <FilterBar filters={filters} onReset={onResetFilters} />
        </div>
      ) : null}
      <Card>{children}</Card>
    </RoleShell>
  )
}
