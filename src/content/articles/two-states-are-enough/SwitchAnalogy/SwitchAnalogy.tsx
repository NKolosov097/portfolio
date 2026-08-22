'use client'

import styles from './SwitchAnalogy.module.css'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/** The five labelled dial positions shown in the "read every label" panel. */
const DIAL_PERCENTAGES: number[] = [10, 30, 50, 70, 100]

/** Which dial position starts pressed — purely decorative, moved by clicking any dial button. */
const DEFAULT_DIAL_PERCENTAGE = 50

/** The slider's starting position (0-100) — purely decorative, moved by dragging the range input. */
const DEFAULT_SLIDER_VALUE = 70

export const SwitchAnalogy = () => {
  const { t } = useTranslation()
  const [activeDialPercentage, setActiveDialPercentage] = useState(DEFAULT_DIAL_PERCENTAGE)
  const [sliderValue, setSliderValue] = useState(DEFAULT_SLIDER_VALUE)

  const panelALabel = t('articleContent.twoStatesAreEnough.switchAnalogyPanelALabel')

  return (
    <div className={styles.card} data-testid="switch-analogy">
      <p className={styles.eyebrow}>
        {t('articleContent.twoStatesAreEnough.switchAnalogyEyebrow')}
      </p>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <p className={styles.panelLabel}>{panelALabel}</p>
          <div className={styles.dialRow} role="group" aria-label={panelALabel}>
            {DIAL_PERCENTAGES.map((percentage) => (
              <button
                key={percentage}
                type="button"
                className={styles.dialButton}
                data-active={percentage === activeDialPercentage}
                aria-pressed={percentage === activeDialPercentage}
                onClick={() => setActiveDialPercentage(percentage)}
              >
                {percentage}%
              </button>
            ))}
          </div>
          <div
            className={styles.swatch}
            aria-hidden="true"
            style={{ backgroundColor: `hsl(0 0% ${activeDialPercentage}%)` }}
          />
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelACaption')}
          </p>
        </div>

        <div className={styles.panel}>
          <p className={styles.panelLabel}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBLabel')}
          </p>
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={(event) => setSliderValue(Number(event.target.value))}
            className={styles.slider}
            aria-label={t('articleContent.twoStatesAreEnough.switchAnalogySliderLabel')}
          />
          <div
            className={styles.swatch}
            aria-hidden="true"
            style={{ backgroundColor: `hsl(0 0% ${sliderValue}%)` }}
          />
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBCaption')}
          </p>
        </div>
      </div>

      <p className={styles.takeaway}>
        {t('articleContent.twoStatesAreEnough.switchAnalogyTakeaway')}
      </p>
    </div>
  )
}

export default SwitchAnalogy
