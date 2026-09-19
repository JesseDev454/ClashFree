import type { ReactNode } from 'react'

export type TableColumn<T> = {
  id: string
  header: string
  accessor: (row: T) => ReactNode
}

export type DataViewState = 'loading' | 'empty' | 'error' | 'populated'
