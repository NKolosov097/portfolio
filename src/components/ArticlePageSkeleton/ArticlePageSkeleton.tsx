import { Skeleton } from '@gravity-ui/uikit'

import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton'
import articleStyles from '@/components/ArticlePageContent/ArticlePageContent.module.css'
import contentStyles from '@/components/ArticleContent/ArticleContent.module.css'
import styles from './ArticlePageSkeleton.module.css'

/** Enough paragraphs to explain the reading layout without building a fake full-length article. */
const SKELETON_PARAGRAPH_COUNT = 3

export const ArticlePageSkeleton = () => (
  <LoadingSkeleton testId="article-page-skeleton">
    <div className={`${articleStyles.article} ${styles.article}`}>
      <Skeleton className={styles.breadcrumb} />
      <div className={`${articleStyles.title} ${styles.title}`}>
        <Skeleton className={styles.titleLine} />
        <Skeleton className={styles.shortTitleLine} />
      </div>
      <Skeleton className={styles.meta} />
      <div className={articleStyles.body}>
        <div className={contentStyles.content}>
          {Array.from({ length: SKELETON_PARAGRAPH_COUNT }, (_, index) => (
            <div className={styles.paragraph} key={index}>
              <Skeleton className={styles.line} />
              <Skeleton className={styles.line} />
              <Skeleton className={styles.shortLine} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </LoadingSkeleton>
)
