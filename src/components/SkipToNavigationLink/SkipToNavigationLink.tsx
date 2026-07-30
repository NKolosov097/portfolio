'use client'

import { useTranslation } from 'react-i18next'

import styles from './SkipToNavigationLink.module.css'

export const SkipToNavigationLink = () => {
  const { t } = useTranslation()

  return (
    <a id="skip-to-navigation" href="#page-header" className={styles.link}>
      {t('skipToNavigationLink')}
    </a>
  )
}
