import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

export type SelectOption = {
  value: string
  label: string
}

type SelectProps = {
  id?: string
  label: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}

export function Select({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Select',
  disabled = false,
}: SelectProps) {
  const selectId = id ?? label.replace(/\s+/g, '-').toLowerCase()

  return (
    <div className="grid gap-1.5">
      <label htmlFor={selectId} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={selectId}
          className={cn(
            'inline-flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border border-border bg-card px-3 text-left text-sm text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[border-color] duration-[var(--duration-hover)] hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50 [&>span:first-child]:truncate',
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            className="cf-menu z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-sm)] border border-border bg-card shadow-overlay"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm outline-none data-highlighted:bg-muted"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-4 text-primary" aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  )
}
