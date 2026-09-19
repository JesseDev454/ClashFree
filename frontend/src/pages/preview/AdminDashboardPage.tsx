import { AppShell } from '../../components/AppShell'
import { PreviewBanner } from '../../components/PreviewBanner'
import { AdminDashboardContent } from '../admin/AdminDashboardContent'

export function AdminDashboardPage() {
  return (
    <AppShell>
      <PreviewBanner />
      <AdminDashboardContent
        reportsHref="/preview/unavailable/admin-reports-analytics"
        helperText="Generation, repair and publishing workflows are unavailable in this design preview. They do not run the solver or send API requests."
      />
    </AppShell>
  )
}
