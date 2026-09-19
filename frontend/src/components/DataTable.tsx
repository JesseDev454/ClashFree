import type { ReactNode } from 'react'
import type { DataViewState, TableColumn } from '../types/table'

type DataTableProps<T> = {
  caption: string
  columns: TableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string
  state?: DataViewState
  emptyMessage?: string
  errorMessage?: string
  loadingMessage?: string
}

export function DataTable<T>({
  caption,
  columns,
  data,
  getRowId,
  state = 'populated',
  emptyMessage = 'No records to show.',
  errorMessage = 'The table could not be loaded.',
  loadingMessage = 'Loading records…',
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
      {state === 'loading' ? <p role="status">{loadingMessage}</p> : null}
      {state === 'empty' ? <p>{emptyMessage}</p> : null}
      {state === 'error' ? <p role="alert">{errorMessage}</p> : null}
      {state === 'populated' ? (
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border bg-card text-xs font-medium text-muted-foreground">
              {columns.map((column) => (
                <th key={column.id} scope="col" className="px-3 py-3">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={getRowId(row)}
                className="h-11 border-b border-border last:border-0"
              >
                {columns.map((column) => (
                  <td key={column.id} className="px-3 py-2 text-foreground">
                    {column.accessor(row) as ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}
