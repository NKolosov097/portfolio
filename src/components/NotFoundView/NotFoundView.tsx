'use client'

import styles from './NotFoundView.module.css'

import { useContext } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import { EAppearance } from '@/constants/theme.constants'
import { AppearanceContext } from '@/contexts/appearance'
import { ESparkleFieldPreset } from '@/home-sections/Home/types/home.type'

/** Decorative only, so it stays out of the server payload exactly as it does on the hero. */
const SparkleField = dynamic(
  () =>
    import('@/home-sections/Home/components/SparkleField/SparkleField').then(
      (module) => module.SparkleField,
    ),
  { ssr: false },
)

interface INotFoundViewProps {
  /** Heading shown at the top of the not-found message. */
  heading: string
  /** Body copy explaining what wasn't found and reassuring the reader. */
  description: string
  /** Destination the recovery link navigates to. */
  linkHref: string
  /** Label shown on the recovery link. */
  linkLabel: string
  /** Stable selector for QA, e.g. `not-found-link`. */
  testId: string
}

export const NotFoundView = ({
  heading,
  description,
  linkHref,
  linkLabel,
  testId,
}: INotFoundViewProps) => {
  const { appearance } = useContext(AppearanceContext)

  return (
    <section className={styles.section}>
      <SparkleField
        preset={
          appearance === EAppearance.winter
            ? ESparkleFieldPreset.snow
            : ESparkleFieldPreset.sparkles
        }
      />

      <h2 className={styles.header}>{heading}</h2>

      <p className={styles.description}>{description}</p>

      <Link
        href={linkHref}
        data-testid={testId}
        className={`g-link g-link_view_normal ${styles.link}`}
      >
        {linkLabel}
      </Link>
    </section>
  )
}

export default NotFoundView
