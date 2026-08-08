'use client'

import styles from './Home.module.css'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'

import { ETabID } from '@/constants/header.constants'
import { Tag } from '@/components/Tag/Tag'
import { Sparkle } from '@/home-sections/Home/components/Sparkle/Sparkle'
import { cancelIdle, requestIdle } from '@/helpers/idleCallback'

/**
 * Decorative only, so it is kept out of the server payload and off the hero's
 * LCP path entirely; it is requested once the browser reports itself idle.
 */
const SparkleField = dynamic(
  () =>
    import('@/home-sections/Home/components/SparkleField/SparkleField').then(
      (module) => module.SparkleField,
    ),
  { ssr: false },
)

export const Home = () => {
  const { t } = useTranslation()

  const [isFieldEnabled, setIsFieldEnabled] = useState(false)

  const lastName = t('lastName')
  const lastNameChars = Array.from(lastName)
  const lastGlyph = lastNameChars.at(-1) ?? ''
  const lastNameHead = lastNameChars.slice(0, -1).join('')

  useEffect(() => {
    const handle = requestIdle(() => setIsFieldEnabled(true))

    return () => cancelIdle(handle)
  }, [])

  return (
    <section id={ETabID.home} className={styles.section}>
      {isFieldEnabled && <SparkleField />}

      <Tag title={t('headerTabs.home')} />

      <h2 className={styles.header}>
        {t('Im')} {t('firstName')}{' '}
        <span className={styles.lastName}>
          {lastNameHead}
          {lastGlyph && (
            <span className={styles.lastGlyph}>
              {lastGlyph}
              <span className={styles.sparkle}>
                <Sparkle />
              </span>
            </span>
          )}
        </span>
      </h2>

      <h3 className={styles.profession}>Software Engineer</h3>
    </section>
  )
}

export default Home
