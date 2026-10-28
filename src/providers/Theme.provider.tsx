'use client'

import { PropsWithChildren, useCallback, useState } from 'react'
import { ThemeContext } from '@gravity-ui/uikit'

import { AppearanceContext } from '@/contexts/appearance'
import { APPEARANCE_COOKIE_KEY, EAppearance, themeProvider } from '@/constants/theme.constants'

interface IThemeProviderProps extends PropsWithChildren {
  /** Appearance resolved server-side; see {@link import('@/constants/theme.constants').resolveRequestAppearance}. */
  initialAppearance: EAppearance
}

/** Provides the Gravity UI theme and the appearance context, keeping appearance switches in sync. */
export const ThemeProvider = ({ initialAppearance, children }: IThemeProviderProps) => {
  const [appearance, setAppearanceState] = useState<EAppearance>(initialAppearance)

  /** Switches appearance everywhere at once: state, the `data-appearance` attribute CSS reads, and the persistence cookie. */
  const setAppearance = useCallback((next: EAppearance) => {
    setAppearanceState(next)
    document.documentElement.setAttribute('data-appearance', next)
    document.cookie = `${APPEARANCE_COOKIE_KEY}=${next};path=/;max-age=31536000;samesite=lax`
  }, [])

  return (
    <ThemeContext.Provider value={themeProvider}>
      <AppearanceContext.Provider value={{ appearance, setAppearance }}>
        {children}
      </AppearanceContext.Provider>
    </ThemeContext.Provider>
  )
}
