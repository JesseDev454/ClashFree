import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        That address is not part of the Phase 0 preview. The dashboard and component
        gallery are available.
      </p>
      <p>
        <Link className="text-primary underline" to="/preview/admin/dashboard">
          Go to the administrator dashboard preview
        </Link>
      </p>
    </main>
  )
}
