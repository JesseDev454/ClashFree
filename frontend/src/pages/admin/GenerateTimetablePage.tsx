import { useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchDepartments, fetchFaculties } from '../../api/academic'
import { fetchPreflight, generateTimetable } from '../../api/timetables'
import { ApiError } from '../../api/client'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { RoleShell } from '../../components/RoleShell'
import { Select } from '../../components/Select'
import { StatusBadge } from '../../components/StatusBadge'
import { useReload } from '../../hooks/useReload'

const STEPS = ['Constraints', 'Configure', 'Generate', 'Results']
const TIME_LIMITS = [
  { value: '10', label: '10 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '120', label: '2 minutes' },
]
const ALTERNATIVES = [
  { value: '1', label: '1 candidate' },
  { value: '2', label: '2 candidates' },
  { value: '3', label: '3 candidates' },
]
const ALL_OPTION = { value: 'all', label: 'All' }

export function GenerateTimetablePage() {
  const navigate = useNavigate()
  const [preflight, setPreflight] = useState<Awaited<
    ReturnType<typeof fetchPreflight>
  > | null>(null)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [timeLimit, setTimeLimit] = useState('30')
  const [alternatives, setAlternatives] = useState('1')
  const [faculty, setFaculty] = useState('all')
  const [department, setDepartment] = useState('all')
  const [faculties, setFaculties] = useState<Array<{ value: string; label: string }>>([
    ALL_OPTION,
  ])
  const [departments, setDepartments] = useState<Array<{ value: string; label: string }>>(
    [ALL_OPTION],
  )
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const [checks, facultyRows, departmentRows] = await Promise.all([
        fetchPreflight(),
        fetchFaculties(),
        fetchDepartments(),
      ])
      setPreflight(checks)
      setFaculties([
        ALL_OPTION,
        ...facultyRows.map((row) => ({ value: String(row.id), label: row.name })),
      ])
      setDepartments([
        ALL_OPTION,
        ...departmentRows.map((row) => ({ value: String(row.id), label: row.name })),
      ])
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useReload(load, [])

  const startDisabled = state === 'loading' || generating || !preflight?.can_generate

  async function onGenerate() {
    if (startDisabled) {
      return
    }
    setGenerating(true)
    setError(null)
    try {
      await generateTimetable({
        time_limit_seconds: Number(timeLimit),
        alternative_count: Number(alternatives),
        ...(faculty !== 'all' ? { faculty_id: Number(faculty) } : {}),
        ...(department !== 'all' ? { department_id: Number(department) } : {}),
      })
      void navigate('/admin/generation-results')
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Generation could not be started',
      )
      setGenerating(false)
    }
  }

  return (
    <RoleShell>
      <PageHeader
        title="Generate Timetable"
        description="Review solver readiness for the active session, then run CP-SAT against the current constraint weights."
        actions={
          <Button onClick={() => void onGenerate()} disabled={startDisabled}>
            {generating ? 'Generating…' : 'Start Generation'}
          </Button>
        }
      />
      <ol className="mb-4 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={
              index === 2
                ? 'rounded-full bg-tint-purple px-3 py-1 text-primary'
                : 'rounded-full bg-background px-3 py-1'
            }
          >
            {index + 1}. {step}
          </li>
        ))}
      </ol>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ready assignments"
          value={preflight ? String(preflight.ready_assignments) : '—'}
          hint={
            preflight
              ? `${preflight.incomplete_assignments} incomplete`
              : 'Loading checklist'
          }
          tint="blue"
        />
        <MetricCard
          label="Usable rooms"
          value={preflight ? String(preflight.rooms_usable) : '—'}
          hint={preflight ? `${preflight.rooms_excluded} excluded` : 'Catalogue rooms'}
          tint="green"
        />
        <MetricCard
          label="Lecturer grids"
          value={
            preflight
              ? `${preflight.lecturers_submitted}/${preflight.lecturers_total}`
              : '—'
          }
          hint="Weekly availability submitted"
          tint="lavender"
        />
        <MetricCard
          label="Weight profile"
          value={preflight?.profile_name ?? '—'}
          hint={preflight?.session_label ?? 'No active session'}
          tint="amber"
        />
      </div>
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
          Preflight checks could not be loaded.
        </p>
      ) : null}
      {state === 'ready' && preflight ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <h2 className="mb-3 text-base font-semibold">Preflight checklist</h2>
            <ul className="grid gap-3 text-sm">
              <li>
                <StatusBadge variant="success">Ready</StatusBadge>{' '}
                {preflight.ready_assignments} course assignments have lecturers and can be
                scheduled.
              </li>
              <li>
                <StatusBadge
                  variant={preflight.incomplete_assignments ? 'warning' : 'success'}
                >
                  {preflight.incomplete_assignments ? 'Warning' : 'Clear'}
                </StatusBadge>{' '}
                {preflight.incomplete_assignments
                  ? `${preflight.incomplete_codes.join(', ')} skipped (no lecturer).`
                  : 'No incomplete assignments.'}
              </li>
              <li>
                <StatusBadge variant="info">Rooms</StatusBadge> {preflight.rooms_usable}{' '}
                usable, {preflight.rooms_excluded} excluded (unavailable or maintenance).
              </li>
              <li>
                <StatusBadge variant="info">Rules</StatusBadge>{' '}
                {preflight.hard_constraints} hard constraints always enforced ·{' '}
                {preflight.soft_enabled}/{preflight.soft_constraints} soft enabled.
              </li>
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 text-base font-semibold">Solver configuration</h2>
            <div className="grid gap-3">
              <Select
                label="Faculty"
                value={faculty}
                options={faculties}
                onValueChange={(value) => {
                  setFaculty(value)
                  if (value !== 'all') {
                    setDepartment('all')
                  }
                }}
              />
              <Select
                label="Department"
                value={department}
                options={departments}
                onValueChange={(value) => {
                  setDepartment(value)
                  if (value !== 'all') {
                    setFaculty('all')
                  }
                }}
              />
              <p className="text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  Weight profile
                </span>
                <br />
                {preflight.profile_name ?? 'None'}
              </p>
              <Select
                label="Time limit"
                value={timeLimit}
                options={TIME_LIMITS}
                onValueChange={setTimeLimit}
              />
              <Select
                label="Alternative solutions"
                value={alternatives}
                options={ALTERNATIVES}
                onValueChange={setAlternatives}
              />
            </div>
          </Card>
        </div>
      ) : null}
    </RoleShell>
  )
}
