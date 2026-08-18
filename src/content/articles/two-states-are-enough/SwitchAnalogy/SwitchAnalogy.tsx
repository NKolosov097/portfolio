'use client'

import styles from './SwitchAnalogy.module.css'

import { useTranslation } from 'react-i18next'

/** The five labelled dial positions shown in the "read every label" panel. */
const DIAL_PERCENTAGES: number[] = [10, 30, 50, 70, 100]

/** Which dial position renders as pressed — purely decorative, not driven by any interaction. */
const ACTIVE_DIAL_PERCENTAGE = 50

export const SwitchAnalogy = () => {
  const { t } = useTranslation()

  return (
    <div className={styles.card} data-testid="switch-analogy">
      <p className={styles.eyebrow}>
        {t('articleContent.twoStatesAreEnough.switchAnalogyEyebrow')}
      </p>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <p className={styles.panelLabel}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelALabel')}
          </p>
          <div className={styles.dialRow}>
            {DIAL_PERCENTAGES.map((percentage) => (
              <span
                key={percentage}
                className={styles.dialButton}
                data-active={percentage === ACTIVE_DIAL_PERCENTAGE}
              >
                {percentage}%
              </span>
            ))}
          </div>
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelACaption')}
          </p>
        </div>

        <div className={styles.panel}>
          <p className={styles.panelLabel}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBLabel')}
          </p>
          <div className={styles.sliderTrack}>
            <span className={styles.sliderKnob} />
          </div>
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
