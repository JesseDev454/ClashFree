import { Link } from 'react-router'
import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-sidebar px-6 py-4">
        <div>
          <p className="text-lg font-bold text-white">ClashFree</p>
          <p className="text-xs text-sidebar-muted">
            Smarter Timetables. Smoother Campuses.
          </p>
        </div>
        <Link className="text-sm font-medium text-white/80 underline" to="/auth/login">
          Sign in
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
