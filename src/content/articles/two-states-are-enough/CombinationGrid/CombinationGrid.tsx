'use client'

import styles from './CombinationGrid.module.css'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Either half of a combination — always exactly one of these two. */
type TShade = 'light' | 'dark'

/** One tile's meaning: what the reader's OS is pretending to be, and what the site shows for it. */
interface ICombination {
  native: TShade
  site: TShade
}

const SHADES: TShade[] = ['light', 'dark']

export const CombinationGrid = () => {
  const { t } = useTranslation()
  /** Real matchMedia, read-only — used only to badge the one tile that matches the reader's actual OS setting. */
  const [actualOsPrefersDark, setActualOsPrefersDark] = useState<boolean | null>(null)
  /** Purely local UI state for this illustration — no localStorage, decoupled from PatternGallery's real toggle. */
  const [selected, setSelected] = useState<ICombination | null>(null)

  // matchMedia doesn't exist during SSR; reading it only after mount keeps the first
  // client render identical to the server-rendered placeholder.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const initialShade: TShade = mediaQuery.matches ? 'dark' : 'light'
    setActualOsPrefersDark(mediaQuery.matches)
    setSelected({ native: initialShade, site: initialShade })

    const handleChange = (event: MediaQueryListEvent) => setActualOsPrefersDark(event.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const isMounted = selected !== null
  const actualShade: TShade | null =
    actualOsPrefersDark === null ? null : actualOsPrefersDark ? 'dark' : 'light'

  const shadeLabel = (shade: TShade) =>
    shade === 'dark'
      ? t('articleContent.twoStatesAreEnough.demoDark')
      : t('articleContent.twoStatesAreEnough.demoLight')

  return (
    <div className={styles.card} data-testid="combination-grid">
      <p className={styles.eyebrow}>{t('articleContent.twoStatesAreEnough.gridEyebrow')}</p>

      <div className={styles.grid}>
        {SHADES.map((native) =>
          SHADES.map((site) => {
            const isSelected =
              selected !== null && selected.native === native && selected.site === site
            const isYou = actualShade === native && actualShade === site

            return (
              <button
                key={`${native}-${site}`}
                type="button"
                className={styles.tile}
                data-selected={isSelected}
                disabled={!isMounted}
                onClick={() => setSelected({ native, site })}
              >
                {isYou && (
                  <span className={styles.badge}>
                    {t('articleContent.twoStatesAreEnough.gridYouBadge')}
                  </span>
                )}

                <span className={styles.tileLabel}>
                  <span className={styles.nativeDot} data-theme={native} aria-hidden="true" />
                  {t('articleContent.twoStatesAreEnough.gridNativeLabel')}: {shadeLabel(native)}
                </span>

                <span className={styles.swatch} data-theme={site}>
                  <span className={styles.swatchLabel}>
                    {t('articleContent.twoStatesAreEnough.gridSiteLabel')}: {shadeLabel(site)}
                  </span>
                </span>
              </button>
            )
          }),
        )}
      </div>

      {selected !== null && (
        <p className={styles.explanation}>
          {selected.native === selected.site
            ? t('articleContent.twoStatesAreEnough.gridExplanationMatches', {
                shade: shadeLabel(selected.site),
              })
            : t('articleContent.twoStatesAreEnough.gridExplanationOverride', {
                native: shadeLabel(selected.native),
                site: shadeLabel(selected.site),
              })}
        </p>
      )}

      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.gridCaption')}</p>
    </div>
  )
}

export default CombinationGrid
