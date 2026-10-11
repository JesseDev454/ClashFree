import * as Dialog from '@radix-ui/react-dialog'
import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '../lib/utils'
import type { NavGroup } from '../types/navigation'
import { Kbd } from './Kbd'
import { commandItemsFromNav, type CommandItem } from './commandItems'

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: NavGroup[]
  actions?: CommandItem[]
}

export function CommandPalette({
  open,
  onOpenChange,
  groups,
  actions = [],
}: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const listRef = useRef<HTMLUListElement>(null)

  const items = useMemo(
    () => [...actions, ...commandItemsFromNav(groups)],
    [actions, groups],
  )
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return items
    }
    return items.filter((item) =>
      `${item.label} ${item.group} ${item.keywords ?? ''}`.toLowerCase().includes(needle),
    )
  }, [items, query])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function close() {
    onOpenChange(false)
    setQuery('')
    setActive(0)
  }

  function run(item: CommandItem | undefined) {
    if (!item) {
      return
    }
    close()
    if (item.onSelect) {
      item.onSelect()
    } else if (item.href) {
      void navigate(item.href)
    }
  }

  let lastGroup = ''

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="cf-overlay fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px]" />
        <Dialog.Content
          className="cf-dialog fixed top-[14vh] left-1/2 z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-overlay"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Search and jump to</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                results[active] ? `${listId}-${results[active].id}` : undefined
              }
              aria-label="Search screens and actions"
              placeholder="Search screens and actions…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActive((current) => Math.min(current + 1, results.length - 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActive((current) => Math.max(current - 1, 0))
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  run(results[active])
                }
              }}
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle-foreground"
            />
            <Kbd>Esc</Kbd>
          </div>
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label="Results"
            className="cf-scroll max-h-[min(24rem,55vh)] overflow-y-auto p-2"
          >
            {results.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nothing matches “{query}”.
              </li>
            ) : null}
            {results.map((item, index) => {
              const showGroup = item.group !== lastGroup
              lastGroup = item.group
              return (
                <li key={item.id} role="presentation">
                  {showGroup ? (
                    <p
                      className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                      aria-hidden="true"
                    >
                      {item.group}
                    </p>
                  ) : null}
                  <div
                    id={`${listId}-${item.id}`}
                    role="option"
                    aria-selected={index === active}
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => run(item)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-foreground',
                      index === active ? 'bg-muted' : '',
                    )}
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {index === active ? (
                      <CornerDownLeft
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center gap-4 border-t border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> to move
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> to open
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
