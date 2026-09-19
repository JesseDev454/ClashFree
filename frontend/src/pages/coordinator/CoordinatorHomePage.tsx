import { ThinDashboardPage } from '../role/ThinDashboardPage'

export function CoordinatorHomePage() {
  return (
    <ThinDashboardPage
      title="Department workspace"
      description="Keep Software Engineering scheduling data accurate. You cannot generate or publish the university timetable."
      metrics={[
        {
          id: 'courses',
          label: 'Department courses',
          value: '42',
          hint: 'Sample fixture',
          tint: 'blue',
        },
        {
          id: 'requests',
          label: 'Open requests',
          value: '3',
          hint: 'Awaiting admin review',
          tint: 'amber',
        },
        {
          id: 'conflicts',
          label: 'Local conflicts',
          value: '1',
          hint: 'Cohort overlap',
          tint: 'rose',
        },
        {
          id: 'cohorts',
          label: 'Cohorts',
          value: '6',
          hint: '400L–500L',
          tint: 'purple',
        },
      ]}
    />
  )
}
