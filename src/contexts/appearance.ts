import { createContext } from 'react'

import { EAppearance } from '@/constants/theme.constants'

export interface IAppearanceContext {
  /** The visitor's currently active appearance. */
  appearance: EAppearance
  /** Switches appearance and persists the choice; see {@link import('@/providers/Theme.provider').ThemeProvider}. */
  setAppearance: (appearance: EAppearance) => void
}

export const AppearanceContext = createContext<IAppearanceContext>({
  appearance: EAppearance.halloween,
  // No-op fallback for consumers rendered outside ThemeProvider; keeps setAppearance safe to call.
  setAppearance: () => {},
})
