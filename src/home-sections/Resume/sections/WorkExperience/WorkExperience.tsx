'use client'

import styles from '@/home-sections/Resume/Resume.module.css'

import { useTranslation } from 'react-i18next'

export const WorkExperience = () => {
  const { t } = useTranslation()

  return (
    <section className={styles.subSection}>
      <h3 className={styles.subSectionHeader}>{t('resume.workExperienceHeader')}</h3>
    </section>
  )
}

export default WorkExperience
