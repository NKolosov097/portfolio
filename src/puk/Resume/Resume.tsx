'use client'

import styles from './Resume.module.css'

import { useTranslation } from 'react-i18next'

import { ETabID } from '@/constants/header.constants'
import { Tag } from '@/components/Tag/Tag'

import { Education } from './sections/Education/Education'
import { WorkExperience } from './sections/WorkExperience/WorkExperience'
import { FavoriteTools } from './sections/FavoriteTools/FavoriteTools'

export const Resume = () => {
  const { t } = useTranslation()

  return (
    <section id={ETabID.resume} className={styles.section}>
      <Tag title={t('headerTabs.resume')} />

      <h2 className="section-header">{t('resume.header')}</h2>

      <p className={styles.resumeDescription}>Description</p>

      <Education />
      <WorkExperience />
      <FavoriteTools />
    </section>
  )
}

export default Resume
