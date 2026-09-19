import { useEffect } from 'react'

export function useReload(reload: () => Promise<void>, deps: readonly unknown[]) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
    // reload is recreated when these deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
