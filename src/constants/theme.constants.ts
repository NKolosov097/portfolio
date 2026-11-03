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
  winter = 'winter',
  /** Archived season: its scene and mascot props stay in the tree but nothing selects it any more. */
  halloween = 'halloween',
}

/** Cookie key used to persist the visitor's manually selected appearance across sessions. */
export const APPEARANCE_COOKIE_KEY = 'portfolio-appearance'

/**
 * Resolves the visitor's appearance server-side from the persistence cookie. Winter is this
 * release's default, so only an explicit `original` cookie value opts back out - a cookie left over
 * from the archived Halloween season resolves to winter like any other unrecognised value.
 */
export function resolveRequestAppearance(cookieAppearance: string | null | undefined): EAppearance {
  return cookieAppearance === EAppearance.original ? EAppearance.original : EAppearance.winter
}
