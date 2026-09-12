import { Skeleton } from '@gravity-ui/uikit'

import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton'
import listStyles from '@/components/ArticlesListContent/ArticlesListContent.module.css'
import styles from './ArticlesListSkeleton.module.css'

/** A short preview of the list, independent of the number of published articles. */
const ARTICLE_SKELETON_KEYS = ['first', 'second', 'third']

export const ArticlesListSkeleton = () => (
  <LoadingSkeleton testId="articles-list-skeleton">
    <div className={`${listStyles.section} ${styles.section}`}>
      <Skeleton className={styles.backLink} />
      <Skeleton className={styles.title} />
      <Skeleton className={styles.description} />
      <div className={listStyles.list}>
        {ARTICLE_SKELETON_KEYS.map((key) => (
          <div className={styles.card} key={key}>
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
