import { Skeleton } from '@gravity-ui/uikit'

import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton'
import listStyles from '@/components/ArticlesListContent/ArticlesListContent.module.css'
import styles from './ArticlesListSkeleton.module.css'

/** A short preview of the list, independent of the number of published articles. */
const SKELETON_ARTICLE_COUNT = 3

export const ArticlesListSkeleton = () => (
  <LoadingSkeleton testId="articles-list-skeleton">
    <div className={`${listStyles.section} ${styles.section}`}>
      <Skeleton className={styles.backLink} />
      <Skeleton className={styles.title} />
      <Skeleton className={styles.description} />
      <div className={listStyles.list}>
        {Array.from({ length: SKELETON_ARTICLE_COUNT }, (_, index) => (
          <div className={styles.card} key={index}>
            <Skeleton className={styles.meta} />
            <Skeleton className={styles.cardTitle} />
            <Skeleton className={styles.line} />
            <Skeleton className={styles.shortLine} />
          </div>
        ))}
      </div>
    </div>
  </LoadingSkeleton>
)
