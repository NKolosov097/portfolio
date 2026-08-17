'use client'

import styles from './ThemeToggleDemo.module.css'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** This demo's own localStorage key — scoped to the demo only, unrelated to the site's own (dark-only) theme. */
const STORAGE_KEY = 'demo-theme-override'

/** The user's explicit choice, or `null` when following the OS preference. */
type TThemeOverride = 'light' | 'dark' | null

/** What's actually rendered — always exactly one of these two. */
type TResolvedTheme = 'light' | 'dark'

const isThemeOverride = (value: string | null): value is Exclude<TThemeOverride, null> =>
  value === 'light' || value === 'dark'

export const ThemeToggleDemo = () => {
  const { t } = useTranslation()
  const [osPrefersDark, setOsPrefersDark] = useState<boolean | null>(null)
  const [override, setOverride] = useState<TThemeOverride>(null)

  // matchMedia and localStorage don't exist during SSR; reading them only after mount
  // keeps the first client render identical to the server-rendered placeholder.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setOsPrefersDark(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => setOsPrefersDark(event.matches)
    mediaQuery.addEventListener('change', handleChange)

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isThemeOverride(stored)) {
      setOverride(stored)
    }

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  /** Stays neutral for one frame instead of guessing, until the client-only read above resolves. */
  const isMounted = osPrefersDark !== null
  const resolvedTheme: TResolvedTheme = override ?? (osPrefersDark ? 'dark' : 'light')

  const handleToggle = () => {
    if (override === null) {
      // First press: override to the opposite of what's currently shown.
      const next: TResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
      setOverride(next)
      window.localStorage.setItem(STORAGE_KEY, next)
    } else {
      // Second press: drop the override and fall back to the system preference.
      setOverride(null)
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const lightLabel = t('articleContent.twoStatesAreEnough.demoLight')
  const darkLabel = t('articleContent.twoStatesAreEnough.demoDark')
  const osLabel = osPrefersDark ? darkLabel : lightLabel
  const resolvedLabel = resolvedTheme === 'dark' ? darkLabel : lightLabel
  const overrideLabel =
    override === null
      ? t('articleContent.twoStatesAreEnough.demoOverrideNone')
      : override === 'dark'
        ? darkLabel
        : lightLabel

  return (
    <div className={styles.card} data-testid="theme-toggle-demo">
      <p className={styles.eyebrow}>{t('articleContent.twoStatesAreEnough.demoEyebrow')}</p>

      <div className={styles.preview} data-theme={isMounted ? resolvedTheme : undefined}>
        <p className={styles.previewHeading}>
          {t('articleContent.twoStatesAreEnough.demoPreviewHeading')}
        </p>
        <p className={styles.previewBody}>
          {t('articleContent.twoStatesAreEnough.demoPreviewBody')}
        </p>
      </div>

      <button type="button" className={styles.toggle} onClick={handleToggle} disabled={!isMounted}>
        {resolvedTheme === 'dark'
          ? t('articleContent.twoStatesAreEnough.demoToggleToLight')
          : t('articleContent.twoStatesAreEnough.demoToggleToDark')}
      </button>

      <dl className={styles.state}>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOsPreferenceLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? osLabel : '—'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOverrideLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? overrideLabel : '—'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoResolvedLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? resolvedLabel : '—'}</dd>
        </div>
      </dl>

      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.demoCaption')}</p>
    </div>
  )
}

export default ThemeToggleDemo
