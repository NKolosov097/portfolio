'use client'

import styles from './PatternGallery.module.css'

import { useEffect, useState } from 'react'
import { Icon, Switch } from '@gravity-ui/uikit'
import { Moon, Sun } from '@gravity-ui/icons'
import { useTranslation } from 'react-i18next'

/** This demo's own localStorage key - scoped to the demo only, unrelated to the site's own (dark-only) theme. */
const STORAGE_KEY = 'demo-theme-override'

/** The base shade value - always exactly one of these two. */
type TShade = 'light' | 'dark'

/** What's actually rendered. */
type TResolvedTheme = TShade

/** An explicit shade choice, or `null` when following the underlying default - the user's site
 * override, or the simulated native/OS shade, depending on where it's used. */
type TShadeOverride = TShade | null

/** The segmented control's own value space - an explicit shade, or the literal `'system'` option. */
type TSegmentValue = TShade | 'system'

/** The three segments, in display order - same trio `PatternsInTheWild` illustrates as a static mockup. */
const SEGMENT_OPTIONS: TSegmentValue[] = ['light', 'dark', 'system']

/** The three macOS traffic-light colors, in their fixed left-to-right order - never themed, just decoration. */
const TRAFFIC_LIGHTS: string[] = ['red', 'yellow', 'green']

const isThemeOverride = (value: string | null): value is TShade =>
  value === 'light' || value === 'dark'

export const PatternGallery = () => {
  const { t } = useTranslation()
  const [osPrefersDark, setOsPrefersDark] = useState<boolean | null>(null)
  const [override, setOverride] = useState<TShadeOverride>(null)
  const [simulatedNative, setSimulatedNative] = useState<TShadeOverride>(null)

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
  const effectiveOsTheme: TResolvedTheme = simulatedNative ?? (osPrefersDark ? 'dark' : 'light')
  const resolvedTheme: TResolvedTheme = override ?? effectiveOsTheme

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

  /** A real switch has only two positions, so - unlike Button - it always sets an explicit override; it can't hand you back to "system". Checked (on) means light, mirroring a physical light switch. */
  const handleSwitchChange = (checked: boolean) => {
    const next: TResolvedTheme = checked ? 'light' : 'dark'
    setOverride(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  /** The segmented pattern sets state directly instead of cycling - that's the whole tradeoff it's here to show. */
  const handleSegmentChange = (value: TSegmentValue) => {
    if (value === 'system') {
      setOverride(null)
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      setOverride(value)
      window.localStorage.setItem(STORAGE_KEY, value)
    }
  }

  /** Simulates the native/OS theme independently of the site's own override - press 1 flips the chrome to the opposite of what it currently shows, press 2 clears back to following the real OS preference. Never touches osPrefersDark, override, or localStorage. */
  const handleSimulateNativeCycle = () => {
    if (simulatedNative === null) {
      setSimulatedNative(effectiveOsTheme === 'dark' ? 'light' : 'dark')
    } else {
      setSimulatedNative(null)
    }
  }

  const lightLabel = t('articleContent.twoStatesAreEnough.demoLight')
  const darkLabel = t('articleContent.twoStatesAreEnough.demoDark')
  const systemLabel = t('articleContent.twoStatesAreEnough.demoSystem')
  const osLabel = effectiveOsTheme === 'dark' ? darkLabel : lightLabel
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
  const simulateCycleLabel =
    effectiveOsTheme === 'dark'
      ? t('articleContent.twoStatesAreEnough.demoSimulateToggleToLight')
      : t('articleContent.twoStatesAreEnough.demoSimulateToggleToDark')
  const segmentedLabel = t('articleContent.twoStatesAreEnough.demoTabSegmentedLabel')
  const activeSegment: TSegmentValue = isMounted ? (override ?? 'system') : 'system'

  const segmentLabel = (option: TSegmentValue): string =>
    option === 'light' ? lightLabel : option === 'dark' ? darkLabel : systemLabel

  return (
    <div className={styles.card} data-testid="pattern-gallery">
      <p className={styles.eyebrow}>{t('articleContent.twoStatesAreEnough.demoEyebrow')}</p>

      <div className={styles.controls}>
        <div className={styles.controlTile}>
          <p className={styles.controlLabel}>
            {t('articleContent.twoStatesAreEnough.demoTabButtonLabel')}
          </p>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={handleCycle}
            disabled={!isMounted}
            aria-label={cycleLabel}
            title={cycleLabel}
          >
            <Icon data={resolvedTheme === 'dark' ? Sun : Moon} size={20} />
          </button>
        </div>

        <div className={styles.controlTile}>
          <p className={styles.controlLabel}>{segmentedLabel}</p>
          <div className={styles.segmented} role="group" aria-label={segmentedLabel}>
            {SEGMENT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.segment}
                data-active={option === activeSegment}
                aria-pressed={option === activeSegment}
                disabled={!isMounted}
                onClick={() => handleSegmentChange(option)}
              >
                {segmentLabel(option)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlTile}>
          <p className={styles.controlLabel}>
            {t('articleContent.twoStatesAreEnough.demoTabSwitchLabel')}
          </p>
          <Switch
            checked={isMounted && resolvedTheme === 'light'}
            onUpdate={handleSwitchChange}
            disabled={!isMounted}
            content={isMounted ? resolvedLabel : undefined}
          />
        </div>

        <div className={`${styles.controlTile} ${styles.simulateTile}`}>
          <div className={styles.simulateControls}>
            <p className={styles.controlLabel}>
              {t('articleContent.twoStatesAreEnough.demoSimulateOsLabel')}
            </p>
            <button
              type="button"
              className={styles.toggleButton}
              onClick={handleSimulateNativeCycle}
              disabled={!isMounted}
              aria-label={simulateCycleLabel}
              title={simulateCycleLabel}
            >
              <Icon data={effectiveOsTheme === 'dark' ? Sun : Moon} size={20} />
            </button>
          </div>
          <p className={styles.controlCaption}>
            {t('articleContent.twoStatesAreEnough.demoSimulateOsCaption')}
          </p>
        </div>
      </div>

      <div className={styles.preview} data-theme={isMounted ? resolvedTheme : undefined}>
        <div
          className={styles.previewTitlebar}
          data-native-theme={isMounted ? effectiveOsTheme : undefined}
        >
          <span className={styles.previewTrafficLights}>
            {TRAFFIC_LIGHTS.map((color) => (
              <span key={color} className={styles.previewTrafficLight} data-color={color} />
            ))}
          </span>
          <span className={styles.previewUrlBar}>yoursite.dev</span>
        </div>
        <div className={styles.previewPage}>
          <p className={styles.previewHeading}>
            {t('articleContent.twoStatesAreEnough.demoPreviewHeading')}
          </p>
          <p className={styles.previewBody}>
            {t('articleContent.twoStatesAreEnough.demoPreviewBody')}
          </p>
        </div>
      </div>

      <dl className={styles.state}>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOsPreferenceLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? osLabel : '-'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOverrideLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? overrideLabel : '-'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoResolvedLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? resolvedLabel : '-'}</dd>
        </div>
      </dl>

      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.demoCaption')}</p>
    </div>
  )
}

export default PatternGallery
