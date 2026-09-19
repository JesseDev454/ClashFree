import type { ReactNode } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card } from './Card'
import type { DataViewState } from '../types/table'

type BarDatum = {
  label: string
  value: number
}

type DonutDatum = {
  name: string
  value: number
  color: string
}

type ChartCardProps = {
  title: string
  state?: DataViewState
  emptyMessage?: string
  errorMessage?: string
  loadingMessage?: string
  children?: ReactNode
} & (
  | { kind: 'bar'; data: BarDatum[] }
  | { kind: 'donut'; data: DonutDatum[]; centerValue?: string }
  | { kind: 'custom' }
)

export function ChartCard(props: ChartCardProps) {
  const {
    title,
    state = 'populated',
    emptyMessage = 'No chart data yet.',
    errorMessage = 'The chart could not be loaded.',
    loadingMessage = 'Loading chart…',
  } = props

  return (
    <Card>
      <h2 className="mb-4 text-[0.95rem] font-semibold">{title}</h2>
      {state === 'loading' ? <p role="status">{loadingMessage}</p> : null}
      {state === 'empty' ? <p>{emptyMessage}</p> : null}
      {state === 'error' ? <p role="alert">{errorMessage}</p> : null}
      {state === 'populated' ? renderChart(props) : null}
    </Card>
  )
}

function renderChart(props: ChartCardProps) {
  if (props.kind === 'custom') {
    return props.children
  }

  if (props.kind === 'bar') {
    return (
      <div className="h-52" role="img" aria-label={`${props.title} bar chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={props.data} barSize={28}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <Bar
              dataKey="value"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        className="relative h-44 w-44 shrink-0"
        role="img"
        aria-label={`${props.title} donut chart`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={props.data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {props.data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {props.centerValue ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-bold">
            {props.centerValue}
          </p>
        ) : null}
      </div>
      <ul className="grid gap-2 text-sm">
        {props.data.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span>
              {entry.name} {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
