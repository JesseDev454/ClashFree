import { Link } from 'react-router'
import { BackendStatus } from './BackendStatus'

export function PreviewBanner() {
  return (
    <p
      role="status"
      className="mb-4 rounded-full border border-primary/20 bg-tint-blue px-4 py-2 text-sm text-foreground"
    >
      Design preview · values are sample fixtures, not live solver results.{' '}
      <Link className="font-medium text-primary underline" to="/preview/components">
        Open component gallery
      </Link>
      {' · '}
      <BackendStatus />
    </p>
  )
}
