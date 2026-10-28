'use client'

import styles from './Home.module.css'

import { useContext, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'

import { ETabID } from '@/constants/header.constants'
import { EAppearance } from '@/constants/theme.constants'
import { AppearanceContext } from '@/contexts/appearance'
import { Tag } from '@/components/Tag/Tag'
import { HalloweenArt } from '@/home-sections/Home/components/HalloweenArt/HalloweenArt'
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

/** Hero section rendering the intro heading plus either Halloween art or the decorative sparkle field. */
export const Home = () => {
  const { t } = useTranslation()
  const { appearance } = useContext(AppearanceContext)

  const [isFieldEnabled, setIsFieldEnabled] = useState(false)

  const isHalloween = appearance === EAppearance.halloween

  const lastName = t('lastName')
  const lastNameChars = Array.from(lastName)
  const lastGlyph = lastNameChars.at(-1) ?? ''
  const lastNameHead = lastNameChars.slice(0, -1).join('')

  /** Defers mounting the decorative sparkle field until the browser is idle, keeping it off the hero's critical path. */
  useEffect(() => {
    const handle = requestIdle(() => setIsFieldEnabled(true))

    return () => cancelIdle(handle)
  }, [])

  const artClassName = isHalloween
    ? styles.halloweenArt
    : `${styles.halloweenArt} ${styles.artHidden}`

  return (
    <section id={ETabID.home} className={styles.section}>
      <div className={artClassName} data-testid={isHalloween ? 'home-halloween-art' : undefined}>
        {isHalloween && <HalloweenArt />}
      </div>

      {!isHalloween && isFieldEnabled && <SparkleField />}

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
