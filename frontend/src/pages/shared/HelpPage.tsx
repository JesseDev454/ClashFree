import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'

export function HelpPage({ title, points }: { title: string; points: string[] }) {
  return (
    <RoleShell>
      <PageHeader
        title="Help & Support"
        description="How this workspace fits the published timetable."
      />
      <Card>
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        <ul className="grid gap-2 text-sm">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          For account access, ask a timetable administrator. Email delivery of alerts is
          not active yet.
        </p>
      </Card>
    </RoleShell>
  )
}
