import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './ThemeContext'
import { AUTH_STORAGE_UPDATED_EVENT } from './AuthProvider'
import { getAppearancePreferences } from '../services/accountStorage'
import {
  canUseStorage,
  readScopedStorageJSON,
  writeScopedStorageJSON,
} from '../utils/storageScope'

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
  if (!canUseStorage()) {
    return 'light'
  }

  const storedTheme = readScopedStorageJSON(window.localStorage, THEME_STORAGE_KEY, 'light')

  if (VALID_THEMES.includes(storedTheme)) {
    return storedTheme
  }

  return 'light'
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
    if (canUseStorage()) {
      writeScopedStorageJSON(window.localStorage, THEME_STORAGE_KEY, theme)
    }
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
    function handleAuthScopeChange() {
      setTheme(getStoredTheme())
      setAppearancePreferences(getAppearancePreferences())
    }

    window.addEventListener(AUTH_STORAGE_UPDATED_EVENT, handleAuthScopeChange)

    return () => {
      window.removeEventListener(AUTH_STORAGE_UPDATED_EVENT, handleAuthScopeChange)
    }
  }, [])

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
