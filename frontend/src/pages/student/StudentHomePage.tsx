import { ThinDashboardPage } from '../role/ThinDashboardPage'

export function StudentHomePage() {
  return (
    <ThinDashboardPage
      title="Your schedule"
      description="See where to be and what changed. Students are read-only."
      metrics={[
        {
          id: 'today',
          label: "Today's classes",
          value: '3',
          hint: 'Next at 10:00',
          tint: 'blue',
        },
        {
          id: 'free',
          label: 'Free periods',
          value: '2',
          hint: 'After lunch',
          tint: 'green',
        },
        {
          id: 'changes',
          label: 'Timetable changes',
          value: '1',
          hint: 'SWE 401 moved',
          tint: 'amber',
        },
        {
          id: 'courses',
          label: 'Registered courses',
          value: '6',
          hint: 'This semester',
          tint: 'purple',
        },
      ]}
    />
  )
}
