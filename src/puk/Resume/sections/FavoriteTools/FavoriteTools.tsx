'use client'

import styles from '@/puk/Resume/Resume.module.css'

import { useTranslation } from 'react-i18next'

import { favoriteTools } from '@/constants/resume.constants'

export const FavoriteTools = () => {
  const { t } = useTranslation()

  return (
    <section className={styles.subSection}>
      <h3 className={styles.subSectionHeader}>{t('resume.favoriteToolsHeader')}</h3>

      <ul className={styles.favoriteToolsList}>
        {favoriteTools.map(({ icon, title }) => (
          <li key={title} className={styles.favoriteToolItem}>
            {icon}

            <h4 className={styles.favoriteToolTitle}>{title}</h4>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FavoriteTools
