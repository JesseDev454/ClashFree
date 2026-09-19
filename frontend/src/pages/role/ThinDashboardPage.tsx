import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { useAuth } from '../../auth/useAuth'
import type { DashboardMetric } from '../../fixtures/adminDashboard'

type ThinDashboardPageProps = {
  title: string
  description: string
  metrics: DashboardMetric[]
}

export function ThinDashboardPage({
  title,
  description,
  metrics,
}: ThinDashboardPageProps) {
  const { user } = useAuth()
  return (
    <RoleShell>
      <PageHeader
        title={`${title}${user ? `, ${user.full_name}` : ''}`}
        description={description}
      />
      <p className="mb-4 text-sm text-muted-foreground">
        This landing is Phase 2 only. Remaining screens for this role belong to later
        phases.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
    </RoleShell>
  )
}
