import { ThinDashboardPage } from '../role/ThinDashboardPage'

export function FacilitiesHomePage() {
  return (
    <ThinDashboardPage
      title="Facilities workspace"
      description="Manage rooms, maintenance and disruptions. You cannot generate or publish timetables."
      metrics={[
        {
          id: 'rooms',
          label: 'Rooms online',
          value: '36',
          hint: '2 closed',
          tint: 'green',
        },
        {
          id: 'maintenance',
          label: 'Maintenance windows',
          value: '4',
          hint: 'This week',
          tint: 'amber',
        },
        {
          id: 'disruptions',
          label: 'Active disruptions',
          value: '1',
          hint: 'Engineering LT2',
          tint: 'rose',
        },
        {
          id: 'affected',
          label: 'Affected classes',
          value: '4',
          hint: 'Awaiting repair',
          tint: 'blue',
        },
      ]}
    />
  )
}
