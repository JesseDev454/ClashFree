import { Link, useParams } from 'react-router'
import { AppShell } from '../../components/AppShell'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { PreviewBanner } from '../../components/PreviewBanner'
import { RoleShell } from '../../components/RoleShell'
import { getPageById } from '../../config/pageInventory'
import { useAuth } from '../../auth/useAuth'
import { NotFoundPage } from '../NotFoundPage'

type UnavailableBodyProps = {
  preview: boolean
}

function UnavailableBody({ preview }: UnavailableBodyProps) {
  const { pageId } = useParams()
  const page = pageId ? getPageById(pageId) : undefined
  const { user } = useAuth()

  if (!page) {
    return <NotFoundPage />
  }

  const homeHref = preview ? '/preview/admin/dashboard' : (user?.home_path ?? '/')

  return (
    <>
      {preview ? <PreviewBanner /> : null}
      <PageHeader
        title={page.title}
        description="This production screen is documented for a later implementation phase."
      />
      <Card>
        <p className="text-sm">
          <strong>{page.title}</strong> belongs to Phase {page.phase}. {page.purpose}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Production route: <code>{page.route}</code>. Permitted roles:{' '}
          {page.roles.join(', ')}. Capabilities: {page.capabilities.join(', ')}.
        </p>
        <p className="mt-4 text-sm">
          <Link className="text-primary underline" to={homeHref}>
            {preview
              ? 'Return to the administrator dashboard preview'
              : 'Return to your dashboard'}
          </Link>
        </p>
      </Card>
    </>
  )
}

export function UnavailablePage() {
  return (
    <AppShell>
      <UnavailableBody preview />
    </AppShell>
  )
}

export function AppUnavailablePage() {
  return (
    <RoleShell>
      <UnavailableBody preview={false} />
    </RoleShell>
  )
}
