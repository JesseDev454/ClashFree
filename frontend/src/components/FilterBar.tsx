import { Button } from './Button'
import { Input } from './Input'
import { Select, type SelectOption } from './Select'

export type FilterField =
  | {
      id: string
      type: 'search'
      label: string
      value: string
      placeholder?: string
      onChange: (value: string) => void
    }
  | {
      id: string
      type: 'select'
      label: string
      value: string
      options: SelectOption[]
      placeholder?: string
      onChange: (value: string) => void
    }

type FilterBarProps = {
  filters: FilterField[]
  onReset?: () => void
  resetLabel?: string
}

export function FilterBar({
  filters,
  onReset,
  resetLabel = 'Reset filters',
}: FilterBarProps) {
  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
      role="search"
    >
      {filters.map((filter) =>
        filter.type === 'search' ? (
          <div key={filter.id} className="min-w-[12rem] flex-1">
            <Input
              id={filter.id}
              label={filter.label}
              value={filter.value}
              placeholder={filter.placeholder}
              onChange={(event) => filter.onChange(event.target.value)}
            />
          </div>
        ) : (
          <div key={filter.id} className="min-w-[12rem] flex-1">
            <Select
              id={filter.id}
              label={filter.label}
              value={filter.value}
              options={filter.options}
              placeholder={filter.placeholder}
              onValueChange={filter.onChange}
            />
          </div>
        ),
      )}
      {onReset ? (
        <Button variant="outline" onClick={onReset}>
          {resetLabel}
        </Button>
      ) : null}
    </div>
  )
}
