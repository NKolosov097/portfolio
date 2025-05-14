'use client'

import styles from './Home.module.css'

import { useTranslation } from 'react-i18next'

import { ETabID } from '@/constants/header.constants'
import { Tag } from '@/components/Tag/Tag'

export const Home = () => {
  const { t } = useTranslation()

  console.log('TESTING CONSOLE.LOG')

  return (
    <section id={ETabID.home} className={styles.section}>
      <Tag title={t('headerTabs.home')} />

      <h2 className={styles.header}>
        {t('Im')} {t('firstName')} {t('lastName')}
      </h2>
      <h3 className={styles.profession}>Front-end Developer</h3>
    </section>
  )
}

export default Home
