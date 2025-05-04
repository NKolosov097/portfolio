'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'

import styles from './SkipToNavigationLink.module.css'
import { Button } from '@gravity-ui/uikit'

export const SkipToNavigationLink = () => {
  const { t } = useTranslation()

  return (
    <Button className={styles.button}>
      <Link href="#page-header">{t('skipToNavigationLink')}</Link>
    </Button>
  )
}
