import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './ThemeContext'
import { getAppearancePreferences } from '../services/accountStorage'

const THEME_STORAGE_KEY = 'nexora_theme'
const SYSTEM_THEME = 'system'
const VALID_THEMES = ['light', 'dark', SYSTEM_THEME]

function resolveSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (VALID_THEMES.includes(storedTheme)) {
    return storedTheme
  }

  return SYSTEM_THEME
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStoredTheme)
  const [appearancePreferences, setAppearancePreferences] = useState(getAppearancePreferences)

  const resolvedTheme = useMemo(
    () => (theme === SYSTEM_THEME ? resolveSystemTheme() : theme),
    [theme],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [resolvedTheme, theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function handleSystemThemeChange() {
      if (theme === SYSTEM_THEME) {
        document.documentElement.dataset.theme = resolveSystemTheme()
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.density = appearancePreferences.compactMode
      ? 'compact'
      : 'comfortable'
    document.documentElement.dataset.motion = appearancePreferences.reduceMotion
      ? 'reduced'
      : 'full'
  }, [appearancePreferences])

  function toggleTheme() {
    setTheme((currentTheme) => {
      const activeTheme = currentTheme === SYSTEM_THEME ? resolveSystemTheme() : currentTheme
      return activeTheme === 'dark' ? 'light' : 'dark'
    })
  }

  function updateAppearancePreferences(nextPreferences) {
    setAppearancePreferences((currentPreferences) => ({
      ...currentPreferences,
      ...nextPreferences,
    }))
  }

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode: resolvedTheme === 'dark',
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        appearancePreferences,
        setAppearancePreferences: updateAppearancePreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
