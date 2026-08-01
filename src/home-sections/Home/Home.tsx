'use client'

import styles from './Home.module.css'

import { useTranslation } from 'react-i18next'

import { ETabID } from '@/constants/header.constants'
import { Tag } from '@/components/Tag/Tag'
import { Sparkle } from '@/home-sections/Home/components/Sparkle/Sparkle'

export const Home = () => {
  const { t } = useTranslation()

  const lastName = t('lastName')
  const lastNameChars = Array.from(lastName)
  const lastGlyph = lastNameChars.at(-1) ?? ''
  const lastNameHead = lastNameChars.slice(0, -1).join('')

  return (
    <section id={ETabID.home} className={styles.section}>
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

      <h3 className={styles.profession}>Fullstack Developer</h3>
    </section>
  )
}

export default Home
