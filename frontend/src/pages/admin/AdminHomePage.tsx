import { useAuth } from '../../auth/useAuth'
import { RoleShell } from '../../components/RoleShell'
import { AdminDashboardContent } from './AdminDashboardContent'

export function AdminHomePage() {
  const { user } = useAuth()
  return (
    <RoleShell>
      <AdminDashboardContent
        welcomeName={user?.full_name ?? 'Timetable Administrator'}
        reportsHref="/unavailable/admin-reports-analytics"
        helperText="Generation, repair and publishing are reserved for the timetable administrator. The solver is not implemented until Phase 5. Metrics below are sample fixtures."
      />
    </RoleShell>
  )
}
