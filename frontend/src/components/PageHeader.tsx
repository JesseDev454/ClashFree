import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: ReactNode
}

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px] font-medium text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[1.625rem] leading-tight font-semibold tracking-[-0.025em] text-foreground sm:text-[1.875rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
