'use client'

import styles from './LightDarkDemo.module.css'

import { useState } from 'react'
import { Icon } from '@gravity-ui/uikit'
import { Moon, Sun } from '@gravity-ui/icons'
import { useTranslation } from 'react-i18next'

/** Verbatim CSS — code samples aren't localized elsewhere in this project either. */
const LIGHT_DARK_CSS = `:root {
  color-scheme: light dark;
}

body {
  background: light-dark(#fff, #111);
  color: light-dark(#111, #fff);
}`

/** Either branch light-dark() can resolve to in the demo below — always exactly one of these two. */
type TNativeScheme = 'light' | 'dark'

/** The three macOS traffic-light colors, in their fixed left-to-right order — never themed, just decoration. */
const TRAFFIC_LIGHTS: string[] = ['red', 'yellow', 'green']

/** Kept inline, not the CSS module: Lightning CSS rewrites light-dark() there into a
 * prefers-color-scheme fallback that ignores color-scheme; the module keeps light-branch fallbacks. */
const TITLEBAR_STYLE = { background: 'light-dark(#e4e4e2, #2c2c2e)' }
const PAGE_STYLE = { background: 'light-dark(#fff, #1e1e1e)' }
const PAGE_LINE_STYLE = { background: 'light-dark(rgb(0 0 0 / 15%), rgb(255 255 255 / 20%))' }

export const LightDarkDemo = () => {
  const { t } = useTranslation()
  const [simulatedNative, setSimulatedNative] = useState<TNativeScheme>('light')

  const handleToggle = () =>
    setSimulatedNative((previous) => (previous === 'dark' ? 'light' : 'dark'))

  const cycleLabel =
    simulatedNative === 'dark'
      ? t('articleContent.twoStatesAreEnough.demoToggleToLight')
      : t('articleContent.twoStatesAreEnough.demoToggleToDark')

  return (
    <div className={styles.card} data-testid="light-dark-demo">
      <p className={styles.eyebrow}>{t('articleContent.twoStatesAreEnough.lightDarkEyebrow')}</p>

      <pre className={styles.pre}>
        <code>{LIGHT_DARK_CSS}</code>
      </pre>
      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.lightDarkCaption')}</p>

      <p className={styles.mechanism}>
        {t('articleContent.twoStatesAreEnough.lightDarkMechanism')}
      </p>

      <div className={styles.demo}>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={handleToggle}
          aria-label={cycleLabel}
          title={cycleLabel}
        >
          <Icon data={simulatedNative === 'dark' ? Sun : Moon} size={20} />
        </button>

        <div className={styles.windowStack}>
          <code className={styles.liveProperty}>{`color-scheme: ${simulatedNative};`}</code>

          {/* This is the only line doing any work: color-scheme here forces every light-dark()
              value below to resolve for this branch, regardless of the real OS preference. */}
          <div className={styles.window} style={{ colorScheme: simulatedNative }}>
            <span className={styles.titlebar} style={TITLEBAR_STYLE}>
              {TRAFFIC_LIGHTS.map((color) => (
                <span key={color} className={styles.trafficLight} data-color={color} />
              ))}
            </span>
            <span className={styles.page} style={PAGE_STYLE}>
              <span className={styles.pageLine} style={PAGE_LINE_STYLE} />
              <span className={styles.pageLineShort} style={PAGE_LINE_STYLE} />
            </span>
          </div>
        </div>
      </div>

      <p className={styles.demoCaption}>
        {t('articleContent.twoStatesAreEnough.lightDarkDemoCaption')}
      </p>
    </div>
  )
}

export default LightDarkDemo
