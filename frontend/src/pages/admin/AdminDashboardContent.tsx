import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDot,
  Info,
  Play,
  Wrench,
} from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { Card, CardHeader } from '../../components/Card'
import { DataTable } from '../../components/DataTable'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { WeekGrid } from '../../components/timetable/WeekGrid'
import type { DashboardMetric, DisruptionRow } from '../../fixtures/adminDashboard'
import { listItemVariants, listVariants } from '../../lib/motion'
import { cn } from '../../lib/utils'
import type { TableColumn } from '../../types/table'
import type {
  ActivityItem,
  AttentionItem,
  PublicationSummary,
  WeekPreview,
} from './dashboardModel'

const disruptionColumns: TableColumn<DisruptionRow>[] = [
  { id: 'type', header: 'Type', accessor: (row) => row.type },
  { id: 'details', header: 'Details', accessor: (row) => row.details },
  { id: 'affected', header: 'Affected', accessor: (row) => row.affected },
  { id: 'reportedBy', header: 'Reported by', accessor: (row) => row.reportedBy },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => (
      <StatusBadge variant={row.statusVariant} dot>
        {row.status}
      </StatusBadge>
    ),
  },
]

const helperId = 'dashboard-actions-help'

type AdminDashboardContentProps = {
  welcomeName?: string
  sessionLabel?: string
  helperText: string
  metrics: DashboardMetric[]
  publication: PublicationSummary
  attention: AttentionItem[]
  activity: ActivityItem[]
  week: WeekPreview | null
  disruptionRows: DisruptionRow[]
  timetableHref: string
  conflictsHref: string
  reportsHref: string
  generateHref?: string
  repairHref?: string
  publishHref?: string
  loading?: boolean
}

function firstName(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 && !/^(dr|prof|mr|mrs|ms)\.?$/i.test(parts[0]) ? parts[0] : name
}

function formatWhen(iso?: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ActionLink({
  href,
  children,
  variant = 'outline',
  icon,
}: {
  href?: string
  children: string
  variant?: 'primary' | 'outline'
  icon?: ReactNode
}) {
  if (!href) {
    return (
      <Button variant={variant} disabled aria-describedby={helperId}>
        {icon}
        {children}
      </Button>
    )
  }
  return (
    <Button variant={variant} asChild>
      <Link to={href}>
        {icon}
        {children}
      </Link>
    </Button>
  )
}

export function AdminDashboardContent({
  welcomeName = 'Timetable Administrator',
  sessionLabel,
  helperText,
  metrics,
  publication,
  attention,
  activity,
  week,
  disruptionRows,
  timetableHref,
  conflictsHref,
  reportsHref,
  generateHref,
  repairHref,
  publishHref,
  loading = false,
}: AdminDashboardContentProps) {
  return (
    <>
      <PageHeader
        eyebrow={
          sessionLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              {sessionLabel}
            </span>
          ) : undefined
        }
        title={`Welcome back, ${firstName(welcomeName)}`}
        description="Here’s the state of this semester’s timetable and what needs you today."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={timetableHref}>
                <CalendarDays aria-hidden="true" />
                Open Timetable
              </Link>
            </Button>
            <ActionLink
              href={generateHref}
              variant="primary"
              icon={<Play aria-hidden="true" />}
            >
              Generate Timetable
            </ActionLink>
          </>
        }
      />

      <motion.div
        variants={listVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
        aria-busy={loading || undefined}
      >
        {metrics.map((metric) => (
          <motion.div key={metric.id} variants={listItemVariants} className="h-full">
            <MetricCard
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
              tint={metric.tint}
              href={metric.href}
              emphasis={
                metric.id === 'conflicts' && metric.value !== '0' && metric.value !== '—'
              }
            />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <PublicationCard
          publication={publication}
          timetableHref={timetableHref}
          repairHref={repairHref}
          publishHref={publishHref}
          reportsHref={reportsHref}
          helperText={helperText}
        />
        <Card className="xl:col-span-4">
          <CardHeader
            title="Needs attention"
            description={
              attention.length === 0
                ? 'Nothing is blocking the timetable.'
                : `${attention.length} ${attention.length === 1 ? 'item' : 'items'} to review`
            }
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to={conflictsHref}>Review Conflicts</Link>
              </Button>
            }
          />
          {attention.length === 0 ? (
            <p className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-success-subtle px-3 py-3 text-[13px] font-medium text-success-text">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              All clear — no conflicts or open disruptions.
            </p>
          ) : (
            <ul className="grid gap-2">
              {attention.map((item) => (
                <li key={item.id}>
                  <AttentionRow item={item} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="min-w-0 xl:col-span-8">
          <CardHeader
            title="This week"
            description={week?.caption ?? 'No timetable has been generated yet.'}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to={timetableHref}>
                  Open Timetable
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          {week && week.events.length > 0 ? (
            <WeekGrid
              caption="This week’s timetable preview"
              days={week.days}
              events={week.events}
              density="compact"
              layoutPrefix="dashboard"
              minColumnWidth={96}
            />
          ) : (
            <div className="flex flex-col items-center rounded-[var(--radius-sm)] border border-dashed border-border px-6 py-10 text-center">
              <CalendarDays className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-foreground">No timetable yet</p>
              <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
                Generate a draft to see the week here.
              </p>
            </div>
          )}
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="Recent activity" />
          {activity.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ol className="relative grid gap-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
              {activity.slice(0, 6).map((item) => (
                <li key={item.id} className="relative flex gap-3 pl-0">
                  <span
                    className={cn(
                      'relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-card',
                      item.tone === 'danger' && 'bg-danger',
                      item.tone === 'warning' && 'bg-warning',
                      item.tone === 'success' && 'bg-success',
                      item.tone === 'info' && 'bg-primary',
                      (!item.tone || item.tone === 'neutral') && 'bg-subtle-foreground',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 text-[13px] leading-relaxed">
                    <p className="text-foreground">
                      <span className="font-medium">{item.actor}</span>{' '}
                      {item.href ? (
                        <Link to={item.href} className="text-foreground hover:underline">
                          {item.text}
                        </Link>
                      ) : (
                        item.text
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatWhen(item.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent Disruptions"
          description="Room and lecturer incidents reported this semester."
        />
        <DataTable
          caption="Recent timetable disruptions"
          columns={disruptionColumns}
          data={disruptionRows}
          getRowId={(row) => row.id}
          state={disruptionRows.length === 0 ? 'empty' : 'populated'}
          emptyMessage="No disruptions reported."
        />
      </Card>
    </>
  )
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = item.tone === 'info' ? Info : AlertTriangle
  const body = (
    <>
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md',
          item.tone === 'danger' && 'bg-danger-subtle text-danger',
          item.tone === 'warning' && 'bg-warning-subtle text-warning',
          item.tone === 'info' && 'bg-primary-subtle text-primary',
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-foreground">
          {item.title}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground">
          {item.detail}
        </span>
      </span>
      {item.href ? (
        <span className="mt-0.5 shrink-0 text-xs font-medium text-primary-text">
          {item.actionLabel ?? 'Review'}
        </span>
      ) : null}
    </>
  )
  const className =
    'flex items-start gap-3 rounded-[var(--radius-sm)] border border-border p-3 transition-colors duration-[var(--duration-hover)]'
  return item.href ? (
    <Link
      to={item.href}
      className={cn(className, 'hover:border-border-strong hover:bg-muted/50')}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

const LIFECYCLE = [
  { id: 'data', label: 'Data ready' },
  { id: 'generated', label: 'Generated' },
  { id: 'validated', label: 'Validated' },
  { id: 'published', label: 'Published' },
]

function PublicationCard({
  publication,
  timetableHref,
  repairHref,
  publishHref,
  reportsHref,
  helperText,
}: {
  publication: PublicationSummary
  timetableHref: string
  repairHref?: string
  publishHref?: string
  reportsHref: string
  helperText: string
}) {
  const hasDraft = (publication.draftChanges ?? 0) > 0 || publication.stage === 'draft'
  const conflicts = publication.hardConflicts ?? 0
  const reached =
    publication.stage === 'none' ? 1 : hasDraft ? (conflicts > 0 ? 2 : 3) : 4
  const headline =
    publication.stage === 'none'
      ? 'No timetable published yet'
      : hasDraft && publication.draftChanges
        ? `Draft with ${publication.draftChanges} unpublished ${publication.draftChanges === 1 ? 'change' : 'changes'}`
        : publication.stage === 'draft'
          ? 'Draft timetable awaiting publication'
          : `Version ${publication.publishedVersion} is live`

  return (
    <Card className="relative overflow-hidden xl:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <CalendarCheck2 className="size-4" aria-hidden="true" />
            Timetable publication
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-foreground">
            {headline}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {publication.publishedVersion
              ? `v${publication.publishedVersion} published ${formatWhen(publication.publishedAt)}${publication.publishedBy ? ` by ${publication.publishedBy}` : ''}`
              : 'Generate and validate a draft, then publish it to students and staff.'}
            {publication.scheduledClasses
              ? ` · ${publication.scheduledClasses} classes scheduled`
              : ''}
          </p>
        </div>
        {publication.stage === 'published' && !hasDraft ? (
          <StatusBadge variant="success" dot>
            {`Published v${publication.publishedVersion}`}
          </StatusBadge>
        ) : publication.stage === 'none' ? (
          <StatusBadge variant="neutral" dot>
            Not published
          </StatusBadge>
        ) : (
          <StatusBadge variant="info" dot>
            Draft in progress
          </StatusBadge>
        )}
      </div>

      <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Publication lifecycle">
        {LIFECYCLE.map((step, index) => {
          const done = index < reached
          const current = index === reached
          return (
            <li key={step.id} className="min-w-0">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    done ? 'bg-primary' : 'bg-transparent',
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </div>
              <p
                className={cn(
                  'mt-2 flex items-start gap-1 text-[11px] leading-tight font-medium sm:items-center sm:gap-1.5 sm:text-xs',
                  done
                    ? 'text-foreground'
                    : current
                      ? 'text-primary-text'
                      : 'text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <CircleDot className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                {step.label}
                <span className="sr-only">
                  {done ? ' (complete)' : current ? ' (next)' : ''}
                </span>
              </p>
            </li>
          )
        })}
      </ol>

      {conflicts > 0 ? (
        <p className="mt-5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-danger-border bg-danger-subtle px-3 py-2 text-[13px] text-danger-text">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {conflicts} hard {conflicts === 1 ? 'conflict needs' : 'conflicts need'}{' '}
          resolving before the next publication.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <ActionLink href={repairHref} icon={<Wrench aria-hidden="true" />}>
          Repair Timetable
        </ActionLink>
        {publishHref ? (
          <ActionLink href={publishHref}>Publish Timetable</ActionLink>
        ) : null}
        <Button variant="ghost" asChild>
          <Link to={reportsHref}>View Reports</Link>
        </Button>
        <Button variant="ghost" asChild className="ml-auto">
          <Link to={timetableHref}>
            Review draft
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <p id={helperId} className="mt-3 text-xs text-muted-foreground">
        {helperText}
      </p>
    </Card>
  )
}
