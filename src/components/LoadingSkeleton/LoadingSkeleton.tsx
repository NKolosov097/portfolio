'use client'

import { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'

import styles from './LoadingSkeleton.module.css'

interface ILoadingSkeletonProps extends PropsWithChildren {
  /** Stable selector identifying the route's loading state. */
  testId: string
}

/** Keeps decorative shapes out of the accessibility tree and announces one loading status. */
export const LoadingSkeleton = ({ children, testId }: ILoadingSkeletonProps) => {
  const { t } = useTranslation()

  return (
    <div className={styles.root} data-testid={testId}>
      <span className={styles.status} role="status">
        {t('loading.content')}
      </span>
      <div aria-hidden="true" className={styles.shapes}>
        {children}
      </div>
    </div>
  )
}
