'use client'

import resumeStyles from '@/home-sections/Resume/Resume.module.css'
import styles from './RetroArcade.module.css'

import { useTranslation } from 'react-i18next'

import { DoomMachine } from '@/home-sections/Resume/sections/RetroArcade/components/DoomMachine/DoomMachine'

export const RetroArcade = () => {
  const { t } = useTranslation()

  return (
    <section className={resumeStyles.subSection}>
      <h3 className={resumeStyles.subSectionHeader}>{t('resume.retroArcadeHeader')}</h3>
      <p className={styles.description}>{t('resume.retroArcadeDescription')}</p>

      <DoomMachine />
    </section>
  )
}

export default RetroArcade
