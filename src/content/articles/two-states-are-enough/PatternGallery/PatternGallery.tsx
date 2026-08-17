'use client'

import styles from './PatternGallery.module.css'

import { useEffect, useState } from 'react'
import { Switch } from '@gravity-ui/uikit'
import { useTranslation } from 'react-i18next'

import { ThemeDropdown } from './ThemeDropdown/ThemeDropdown'
import type { TDropdownValue } from './ThemeDropdown/ThemeDropdown'

/** This demo's own localStorage key — scoped to the demo only, unrelated to the site's own (dark-only) theme. */
const STORAGE_KEY = 'demo-theme-override'

/** The user's explicit choice, or `null` when following the OS preference. */
type TThemeOverride = 'light' | 'dark' | null

/** What's actually rendered — always exactly one of these two. */
type TResolvedTheme = 'light' | 'dark'

/** Which input affordance the reader is currently trying — same underlying state, different UI. */
type TPattern = 'button' | 'switch' | 'dropdown'

const PATTERNS: TPattern[] = ['button', 'switch', 'dropdown']

/** Locale key for each tab's label, keyed by pattern so lookups stay typed instead of built from a string template. */
const TAB_LABEL_KEYS: Record<TPattern, string> = {
  button: 'articleContent.twoStatesAreEnough.demoTabButtonLabel',
  switch: 'articleContent.twoStatesAreEnough.demoTabSwitchLabel',
  dropdown: 'articleContent.twoStatesAreEnough.demoTabDropdownLabel',
}

const isThemeOverride = (value: string | null): value is Exclude<TThemeOverride, null> =>
  value === 'light' || value === 'dark'

export const PatternGallery = () => {
  const { t } = useTranslation()
  const [osPrefersDark, setOsPrefersDark] = useState<boolean | null>(null)
  const [override, setOverride] = useState<TThemeOverride>(null)
  const [activePattern, setActivePattern] = useState<TPattern>('button')

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

  /** The Button pattern's 2-press cycle: press 1 overrides to the opposite shade, press 2 clears back to system. */
  const handleCycle = () => {
    if (override === null) {
      const next: TResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
      setOverride(next)
      window.localStorage.setItem(STORAGE_KEY, next)
    } else {
      setOverride(null)
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  /** A real switch has only two positions, so — unlike Button — it always sets an explicit override; it can't hand you back to "system". */
  const handleSwitchChange = (checked: boolean) => {
    const next: TResolvedTheme = checked ? 'dark' : 'light'
    setOverride(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  /** The Dropdown pattern sets state directly instead of cycling — that's the whole tradeoff it's here to show. */
  const handleSelectChange = (value: TDropdownValue) => {
    if (value === 'system') {
      setOverride(null)
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      setOverride(value)
      window.localStorage.setItem(STORAGE_KEY, value)
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
  const cycleLabel =
    resolvedTheme === 'dark'
      ? t('articleContent.twoStatesAreEnough.demoToggleToLight')
      : t('articleContent.twoStatesAreEnough.demoToggleToDark')

  return (
    <div className={styles.card} data-testid="pattern-gallery">
      <p className={styles.eyebrow}>{t('articleContent.twoStatesAreEnough.demoEyebrow')}</p>

      <div className={styles.tabs} role="tablist" aria-label="Theme control pattern">
        {PATTERNS.map((pattern) => (
          <button
            key={pattern}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={activePattern === pattern}
            data-active={activePattern === pattern}
            onClick={() => setActivePattern(pattern)}
          >
            {t(TAB_LABEL_KEYS[pattern])}
          </button>
        ))}
      </div>

      <div className={styles.preview} data-theme={isMounted ? resolvedTheme : undefined}>
        <p className={styles.previewHeading}>
          {t('articleContent.twoStatesAreEnough.demoPreviewHeading')}
        </p>
        <p className={styles.previewBody}>
          {t('articleContent.twoStatesAreEnough.demoPreviewBody')}
        </p>
      </div>

      {activePattern === 'button' && (
        <button
          type="button"
          className={styles.toggleButton}
          onClick={handleCycle}
          disabled={!isMounted}
        >
          {cycleLabel}
        </button>
      )}

      {activePattern === 'switch' && (
        <Switch
          checked={isMounted && resolvedTheme === 'dark'}
          onUpdate={handleSwitchChange}
          disabled={!isMounted}
          content={isMounted ? resolvedLabel : undefined}
        />
      )}

      {activePattern === 'dropdown' && (
        <ThemeDropdown
          value={isMounted ? (override ?? 'system') : 'system'}
          onChange={handleSelectChange}
          disabled={!isMounted}
        />
      )}

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

export default PatternGallery
