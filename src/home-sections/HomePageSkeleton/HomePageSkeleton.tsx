import { Skeleton } from '@gravity-ui/uikit'

import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton'
import homeStyles from '@/home-sections/Home/Home.module.css'
import styles from './HomePageSkeleton.module.css'

export const HomePageSkeleton = () => (
  <LoadingSkeleton testId="home-page-skeleton">
    <div className={`${homeStyles.section} ${styles.hero}`}>
      <Skeleton className={styles.tag} />
      <div className={`${homeStyles.header} ${styles.heading}`}>
        <Skeleton className={styles.name} />
        <Skeleton className={styles.surname} />
      </div>
      <div className={`${homeStyles.profession} ${styles.profession}`}>
        <Skeleton className={styles.software} />
        <Skeleton className={styles.engineer} />
      </div>
    </div>
  </LoadingSkeleton>
)
