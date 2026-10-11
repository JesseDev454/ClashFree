import { ArrowDown, CheckCircle2, Info, XCircle } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { formatPlacement, type MoveProposal } from '../../../demo/engine'
import { cn } from '../../../lib/utils'

type MoveProposalDialogProps = {
  proposal: MoveProposal | null
  onCancel: () => void
  onConfirm: () => void
}

const CHANGE_LABEL = {
  room: 'Room change',
  time: 'Time change',
  'room-and-time': 'Room and time change',
} as const

export function MoveProposalDialog({
  proposal,
  onCancel,
  onConfirm,
}: MoveProposalDialogProps) {
  const passed = proposal?.checks.every((check) => check.passed) ?? false
  return (
    <Modal
      open={proposal !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCancel()
        }
      }}
      title={
        proposal ? `Propose moving ${proposal.session.courseCode}?` : 'Propose change'
      }
      description="Validated against every hard constraint. Nothing is published until you publish the draft."
    >
      {proposal ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (passed) {
              onConfirm()
            }
          }}
        >
          <div className="rounded-[var(--radius-sm)] border border-border">
            <div className="px-3.5 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">Now</p>
              <p className="text-sm text-foreground">
                {formatPlacement(proposal.from, proposal.session.duration)}
              </p>
            </div>
            <div className="relative border-t border-border bg-primary-subtle/50 px-3.5 py-2.5">
              <span className="absolute -top-3 left-3 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </span>
              <p className="flex items-center justify-between text-xs font-medium text-primary-text">
                Proposed{' '}
                <span className="text-muted-foreground">
                  {CHANGE_LABEL[proposal.change]}
                </span>
              </p>
              <p className="text-sm font-medium text-foreground">
                {formatPlacement(proposal.to, proposal.session.duration)}
              </p>
            </div>
          </div>

          <h3 className="mt-5 text-[13px] font-semibold text-foreground">
            Hard constraints
          </h3>
          <ul className="mt-2 grid gap-1.5">
            {proposal.checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 text-[13px]">
                {check.passed ? (
                  <CheckCircle2
                    className="mt-px size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    className="mt-px size-4 shrink-0 text-danger"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(check.passed ? 'text-foreground' : 'text-danger-text')}
                >
                  {check.label}
                  <span className="sr-only">
                    {check.passed ? ': passed' : `: failed — ${check.detail}`}
                  </span>
                  {!check.passed ? (
                    <span className="block text-xs" aria-hidden="true">
                      {check.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          {proposal.notes.length > 0 ? (
            <>
              <h3 className="mt-5 text-[13px] font-semibold text-foreground">
                Good to know
              </h3>
              <ul className="mt-2 grid gap-1.5">
                {proposal.notes.map((note) => (
                  <li
                    key={note}
                    className="flex items-start gap-2 text-[13px] text-muted-foreground"
                  >
                    <Info className="mt-px size-4 shrink-0" aria-hidden="true" />
                    {note}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!passed} autoFocus>
              Add to draft
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
