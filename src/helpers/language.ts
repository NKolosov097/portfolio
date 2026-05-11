import { ELanguage } from '@/constants/header.constants'

/** Cookie key used to persist the user's manually selected language across sessions. */
const LANG_COOKIE_KEY = 'app-lang'

/**
 * Supported language codes for membership checks.
 * Explicit list required because ELanguage is a const enum — Object.values is unavailable at runtime.
 */
const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set<string>([ELanguage.en, ELanguage.ru])

/**
 * Normalises a raw locale string (e.g. 'en-US', 'ru-RU') to the first two characters and
 * returns the matching {@link ELanguage}, or null when the locale is not supported.
 */
function normalizeLanguage(raw: string | null | undefined): ELanguage | null {
  /** Two-char language code derived from the raw locale. */
  const code = raw?.slice(0, 2).toLowerCase() ?? ''
  return SUPPORTED_LANGUAGES.has(code) ? (code as ELanguage) : null
}

/**
 * Returns the user's preferred language by checking, in priority order:
 * 1. A persisted cookie from a previous manual selection.
 * 2. The browser's `navigator.language` locale.
 * Falls back to English when no supported language is detected.
 *
 * Must be called client-side only (accesses `document.cookie` and `navigator`).
 */
export function getStoredLanguage(): ELanguage {
  /** Cookie match array from the raw `document.cookie` string. */
  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE_KEY}=([^;]+)`))

  /** Raw language value extracted from the cookie, or null when absent. */
  const cookieLang = cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]) : null

  return normalizeLanguage(cookieLang) ?? normalizeLanguage(navigator.language) ?? ELanguage.en
}

/**
 * Persists the selected language to a long-lived first-party cookie so the choice
 * survives page refreshes and new sessions.
 */
export function storeLanguage(lang: ELanguage): void {
  document.cookie = `${LANG_COOKIE_KEY}=${lang};path=/;max-age=31536000;samesite=lax`
}
