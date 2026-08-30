'use client'

import styles from './Resume.module.css'

import { Trans, useTranslation } from 'react-i18next'

import { ETabID } from '@/constants/header.constants'
import { Tag } from '@/components/Tag/Tag'

import { Education } from './sections/Education/Education'
import { WorkExperience } from './sections/WorkExperience/WorkExperience'
import { FavoriteTools } from './sections/FavoriteTools/FavoriteTools'
import { RetroArcade } from './sections/RetroArcade/RetroArcade'
import { DownloadCv } from './components/DownloadCv/DownloadCv'

export const Resume = () => {
  const { t } = useTranslation()

  return (
    <section id={ETabID.resume} className={styles.section}>
      <div className={styles.headerRow}>
        <Tag title={t('headerTabs.resume')} />
        <span className={styles.headerConnector} aria-hidden="true" />
        <DownloadCv />
      </div>

      <h2 className="section-header">{t('resume.header')}</h2>

      <p className={styles.resumeDescription}>
        <Trans
          i18nKey="resume.description"
          components={{ accent: <span className={styles.accent} /> }}
        />
      </p>

      <Education />
      <WorkExperience />
      <FavoriteTools />
      <RetroArcade />
    </section>
  )
}

export default Resume
