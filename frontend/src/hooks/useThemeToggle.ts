import { useState } from 'react'
import { applyTheme, currentTheme, type Theme } from '../lib/theme'

export function useThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => currentTheme())
  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }
  return { theme, toggle }
}
