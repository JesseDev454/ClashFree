import { FlaskConical, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import { BackendStatus } from './BackendStatus'

type PreviewBannerProps = {
  onReset?: () => void
}

export function PreviewBanner({ onReset }: PreviewBannerProps) {
  return (
    <div className="cf-no-print mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-sm)] border border-dashed border-primary-border bg-primary-subtle/60 px-3.5 py-2.5 text-[13px] text-foreground">
      <p role="status" className="flex min-w-0 flex-1 items-start gap-2">
        <FlaskConical
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span>
          <span className="font-semibold">Design lab · demo data.</span> Values are sample
          fixtures computed in your browser, not live solver results.{' '}
          <Link
            className="font-medium text-primary-text underline underline-offset-2"
            to="/preview/components"
          >
            Open component gallery
          </Link>
          <span className="text-muted-foreground"> · </span>
          <span className="text-muted-foreground">
            <BackendStatus />
          </span>
        </span>
      </p>
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-primary-text hover:bg-primary-subtle"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset demo
        </button>
      ) : null}
    </div>
  )
}
