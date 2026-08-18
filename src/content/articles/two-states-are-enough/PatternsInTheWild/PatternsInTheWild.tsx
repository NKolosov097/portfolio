'use client'

import styles from './PatternsInTheWild.module.css'

import { Icon } from '@gravity-ui/uikit'
import { Sun } from '@gravity-ui/icons'
import { useTranslation } from 'react-i18next'

/** The three generic segment labels for the "segmented control" tile, in display order — reuses the existing Light/Dark/System copy instead of adding new keys for the same three words. */
const SEGMENT_LABEL_KEYS: string[] = [
  'articleContent.twoStatesAreEnough.demoLight',
  'articleContent.twoStatesAreEnough.demoDark',
  'articleContent.twoStatesAreEnough.demoSystem',
]

/** Which segment renders as pressed — purely decorative, matches the middle "Dark" option. */
const ACTIVE_SEGMENT_INDEX = 1

export const PatternsInTheWild = () => {
  const { t } = useTranslation()

  return (
    <div className={styles.card} data-testid="patterns-in-the-wild">
      <p className={styles.eyebrow}>
        {t('articleContent.twoStatesAreEnough.patternsInTheWildEyebrow')}
      </p>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <div className={styles.segmented}>
            {SEGMENT_LABEL_KEYS.map((labelKey, index) => (
              <span
                key={labelKey}
                className={styles.segment}
                data-active={index === ACTIVE_SEGMENT_INDEX}
              >
                {t(labelKey)}
              </span>
            ))}
          </div>
          <p className={styles.tileCaption}>
            {t('articleContent.twoStatesAreEnough.patternsInTheWildTile1Caption')}
          </p>
        </div>

        <div className={styles.tile}>
          <span className={styles.iconButton}>
            <Icon data={Sun} size={18} />
          </span>
          <p className={styles.tileCaption}>
            {t('articleContent.twoStatesAreEnough.patternsInTheWildTile2Caption')}
          </p>
        </div>

        <div className={styles.tile}>
          <span className={styles.settingsHeading}>
            {t('articleContent.twoStatesAreEnough.patternsInTheWildSettingsLabel')}
          </span>
          <div className={styles.settingsList}>
            {SEGMENT_LABEL_KEYS.map((labelKey, index) => (
              <span
                key={labelKey}
                className={styles.settingsRow}
                data-active={index === ACTIVE_SEGMENT_INDEX}
              >
                <span className={styles.settingsDot} />
                {t(labelKey)}
              </span>
            ))}
          </div>
          <p className={styles.tileCaption}>
            {t('articleContent.twoStatesAreEnough.patternsInTheWildTile3Caption')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PatternsInTheWild
