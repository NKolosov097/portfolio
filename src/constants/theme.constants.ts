// eslint-disable-next-line import/named
import { ThemeContextProps } from '@gravity-ui/uikit'

export const themeProvider: ThemeContextProps = {
  direction: 'ltr',
  theme: 'dark',
  themeValue: 'dark',
}

/** Visitor-facing appearance, independent from Gravity UI's own (always dark) theme. */
export const enum EAppearance {
  original = 'original',
  halloween = 'halloween',
}

/** Cookie key used to persist the visitor's manually selected appearance across sessions. */
export const APPEARANCE_COOKIE_KEY = 'portfolio-appearance'

/** Retired appearance cookies are ignored so every request starts in the original appearance. */
export function resolveRequestAppearance(
  _cookieAppearance: string | null | undefined,
): EAppearance {
  return EAppearance.original
}
