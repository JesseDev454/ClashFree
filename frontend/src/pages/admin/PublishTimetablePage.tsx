import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../../api/client'
import {
  fetchDraft,
  fetchPreflight,
  fetchPublished,
  publishTimetable,
  type DraftTimetable,
  type Preflight,
  type TimetableVersion,
} from '../../api/timetables'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'

function checklistItem(
  ok: boolean,
  label: string,
  detail: string,
  warning = false,
): { ok: boolean; warning: boolean; label: string; detail: string } {
  return { ok, warning, label, detail }
}

export function PublishTimetablePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<DraftTimetable | null>(null)
  const [published, setPublished] = useState<TimetableVersion | null>(null)
  const [preflight, setPreflight] = useState<Preflight | null>(null)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const [nextDraft, nextPublished, nextPreflight] = await Promise.all([
        fetchDraft(),
        fetchPublished(),
        fetchPreflight(),
      ])
      setDraft(nextDraft)
      setPublished(nextPublished)
      setPreflight(nextPreflight)
      setState(nextDraft ? 'ready' : 'empty')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const nextVersion = (published?.version_number ?? 0) + 1
  const hardOk = (draft?.solution.hard_violations ?? 1) === 0
  const sessionOk = Boolean(preflight?.session_label)
  const alreadyPublished = Boolean(
    draft && published && published.solution_id === draft.solution.id,
  )
  const confirmDisabled =
    state === 'loading' ||
    state === 'empty' ||
    !draft ||
    !hardOk ||
    !sessionOk ||
    alreadyPublished ||
    publishing

  const items = [
    checklistItem(
      Boolean(draft),
      'Selected draft',
      draft
        ? `${draft.slots.length} classes in the selected solution`
        : 'Generate a timetable before publishing',
    ),
    checklistItem(
      hardOk,
      'Hard violations',
      draft
        ? `${draft.solution.hard_violations} hard violations`
        : 'No draft to validate',
    ),
    checklistItem(
      sessionOk,
      'Active session',
      preflight?.session_label
        ? `${preflight.session_label}${preflight.semester ? ` · ${preflight.semester}` : ''}`
        : 'Activate an academic session first',
    ),
    checklistItem(
      true,
      'Incomplete assignments',
      preflight && preflight.incomplete_assignments > 0
        ? `${preflight.incomplete_codes.join(', ')} stay unscheduled`
        : 'All catalogue assignments have lecturers',
      Boolean(preflight && preflight.incomplete_assignments > 0),
    ),
  ]

  async function onPublish() {
    if (confirmDisabled) {
      return
    }
    setPublishing(true)
    setError(null)
    try {
      await publishTimetable(notes.trim() || undefined)
      void navigate('/admin/timetable-versions')
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.detail
          : 'The timetable could not be published',
      )
      setPublishing(false)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Publish Timetable"
        description="Freeze the selected draft as an immutable published version for the active session."
        actions={
          <>
            <Button disabled={confirmDisabled} onClick={() => setConfirmOpen(true)}>
              {publishing ? 'Publishing…' : 'Confirm publish'}
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title={`Publish v${nextVersion}?`}
              description="This copies the selected draft into version history. Regenerating later will not rewrite this snapshot."
              confirmLabel="Publish"
              onConfirm={() => void onPublish()}
            />
          </>
        }
      />
      {error ? (
        <p
          className="mb-4 rounded-md bg-tint-rose px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="rounded-md bg-tint-rose px-3 py-2 text-sm text-danger" role="alert">
          Publish checklist could not be loaded.
        </p>
      ) : null}
      {state === 'empty' ? (
        <p className="text-sm text-muted-foreground">
          No draft timetable is selected.{' '}
          <Link className="font-medium text-primary" to="/admin/generate-timetable">
            Generate a timetable
          </Link>{' '}
          first.
        </p>
      ) : null}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Next version"
          value={`v${nextVersion}`}
          hint={published ? `Current is v${published.version_number}` : 'First publish'}
          tint="blue"
        />
        <MetricCard
          label="Draft classes"
          value={draft ? String(draft.slots.length) : '—'}
          hint={draft ? `Soft penalty ${draft.solution.soft_penalty}` : 'No draft'}
          tint="green"
        />
        <MetricCard
          label="Hard violations"
          value={draft ? String(draft.solution.hard_violations) : '—'}
          hint="Must be 0 to publish"
          tint="rose"
        />
        <MetricCard
          label="Session"
          value={preflight?.session_label ?? '—'}
          hint={preflight?.semester ?? 'Active academic session'}
          tint="lavender"
        />
      </div>
      {state === 'ready' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-7">
            <h2 className="mb-4 text-[0.95rem] font-semibold">Publication checklist</h2>
            <ul className="grid gap-3">
              {items.map((item) => (
                <li key={item.label} className="flex gap-3">
                  <StatusBadge
                    variant={item.warning ? 'warning' : item.ok ? 'success' : 'danger'}
                  >
                    {item.warning ? 'Warning' : item.ok ? 'Ready' : 'Blocked'}
                  </StatusBadge>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            {alreadyPublished ? (
              <p className="mt-4 text-sm text-muted-foreground">
                This draft is already published as v{published?.version_number}. Generate
                a new draft to publish again.
              </p>
            ) : null}
          </Card>
          <Card className="xl:col-span-5">
            <div className="grid gap-1.5">
              <label
                htmlFor="publish-notes"
                className="text-xs font-medium text-muted-foreground"
              >
                Publication note
              </label>
              <textarea
                id="publish-notes"
                maxLength={500}
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Optional note for this version (max 500 characters)"
              />
              <p className="text-xs text-muted-foreground">{notes.length}/500</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Review diffs on{' '}
              <Link className="font-medium text-primary" to="/admin/change-review">
                Change Review
              </Link>{' '}
              before confirming.
            </p>
          </Card>
        </div>
      ) : null}
    </RoleShell>
  )
}
