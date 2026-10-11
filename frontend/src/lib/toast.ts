import { useSyncExternalStore } from 'react'

export type ToastTone = 'success' | 'info' | 'warning' | 'danger'

export type ToastItem = {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export function dismissToast(id: number) {
  items = items.filter((item) => item.id !== id)
  emit()
}

export function toast(input: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone }) {
  const item: ToastItem = { tone: 'success', ...input, id: nextId++ }
  items = [...items.slice(-2), item]
  emit()
  window.setTimeout(() => dismissToast(item.id), 5200)
  return item.id
}

export function useToasts() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => items,
    () => items,
  )
}
