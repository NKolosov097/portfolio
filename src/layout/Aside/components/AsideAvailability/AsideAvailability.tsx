'use client'

import { useTranslation } from 'react-i18next'

import styles from './AsideAvailability.module.css'

import { Icon } from '@gravity-ui/uikit'
import { FileArrowDown } from '@gravity-ui/icons'

import { CV_FILE_NAME, CV_PATH } from '@/constants/constants'
import { IS_OPEN_TO_WORK } from '@/constants/aside.constants'

export const AsideAvailability = () => {
  const { t } = useTranslation()

  return (
    <div className={styles.container} data-testid="aside-availability">
      <span className={styles.divider} aria-hidden="true">
        <span className={styles.glint} />
      </span>

      {IS_OPEN_TO_WORK && (
        <p className={styles.status} data-testid="aside-availability-status">
          <span className={styles.dot} aria-hidden="true" />
          {t('aside.openToWork')}
        </p>
      )}

      <a
        href={CV_PATH}
        download={CV_FILE_NAME}
        className={styles.cv}
        data-testid="aside-download-cv"
      >
        <Icon data={FileArrowDown} size={16} />
        <span>{t('resume.downloadCv')}</span>
      </a>
    </div>
  )
}
