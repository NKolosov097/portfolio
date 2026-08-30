import { ELanguage } from '@/constants/header.constants'

/** Cookie key used to persist the user's manually selected language across sessions. */
export const LANG_COOKIE_KEY = 'app-lang'

/**
 * Supported language codes for membership checks.
 * Explicit list required because ELanguage is a const enum - Object.values is unavailable at runtime.
 */
const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set<string>([ELanguage.en, ELanguage.ru])

/**
 * Normalises a raw locale string (e.g. 'en-US', 'ru-RU') to the first two characters and
 * returns the matching {@link ELanguage}, or null when the locale is not supported.
 */
export function normalizeLanguage(raw: string | null | undefined): ELanguage | null {
  /** Two-char language code derived from the raw locale. */
  const code = raw?.slice(0, 2).toLowerCase() ?? ''
  return SUPPORTED_LANGUAGES.has(code) ? (code as ELanguage) : null
}

/** Resolves the visitor's language server-side: persisted cookie, then `Accept-Language`, then English. */
export function resolveRequestLanguage(
  cookieLang: string | null | undefined,
  acceptLanguageHeader: string | null | undefined,
): ELanguage {
  /** The header's highest-priority tag, e.g. `"ru-RU"` from `"ru-RU,ru;q=0.9,en;q=0.8"`. */
  const preferredHeaderTag = acceptLanguageHeader?.split(',')[0]?.trim()

  return normalizeLanguage(cookieLang) ?? normalizeLanguage(preferredHeaderTag) ?? ELanguage.en
}

/**
 * Persists the selected language to a long-lived first-party cookie so the choice
 * survives page refreshes and new sessions.
 */
export function storeLanguage(lang: ELanguage): void {
  document.cookie = `${LANG_COOKIE_KEY}=${lang};path=/;max-age=31536000;samesite=lax`
}
