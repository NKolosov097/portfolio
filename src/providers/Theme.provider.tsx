'use client'

import { PropsWithChildren } from 'react'
import { ThemeContext } from '@gravity-ui/uikit'
import { themeProvider } from '@/constants/theme.constants'

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return <ThemeContext.Provider value={themeProvider}>{children}</ThemeContext.Provider>
}
