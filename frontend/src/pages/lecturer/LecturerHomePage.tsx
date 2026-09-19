import { ThinDashboardPage } from '../role/ThinDashboardPage'

export function LecturerHomePage() {
  return (
    <ThinDashboardPage
      title="Teaching workspace"
      description="Review your timetable, availability and unavailability reports. You cannot run the solver."
      metrics={[
        {
          id: 'classes',
          label: 'Classes this week',
          value: '8',
          hint: 'Sample fixture',
          tint: 'blue',
        },
        {
          id: 'hours',
          label: 'Contact hours',
          value: '14',
          hint: 'Two pending labs',
          tint: 'green',
        },
        {
          id: 'changes',
          label: 'Recent changes',
          value: '1',
          hint: 'Room moved',
          tint: 'amber',
        },
        {
          id: 'availability',
          label: 'Availability',
          value: 'Submitted',
          hint: 'This semester',
          tint: 'purple',
        },
      ]}
    />
  )
}
