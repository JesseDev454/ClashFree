import { Link } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'

export function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <PageHeader
        title="You don’t have access to that page"
        description="ClashFree keeps each role inside its own workspace."
      />
      <Card>
        <p className="text-sm text-muted-foreground">
          If you need a different role, ask a timetable administrator.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/">Go to your dashboard</Link>
        </Button>
      </Card>
    </div>
  )
}
