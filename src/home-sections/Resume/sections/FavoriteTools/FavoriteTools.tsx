'use client'

import styles from '@/home-sections/Resume/Resume.module.css'

import { useTranslation } from 'react-i18next'

import { FavoriteTool } from '@/home-sections/Resume/sections/FavoriteTools/components/FavoriteTool/FavoriteTool'

import { favoriteTools } from '@/constants/resume.constants'

export const FavoriteTools = () => {
  const { t } = useTranslation()

  return (
    <section className={styles.subSection}>
      <h3 className={styles.subSectionHeader}>{t('resume.favoriteToolsHeader')}</h3>

      <ul className={styles.favoriteToolsList}>
        {favoriteTools.map(({ id, icon, title }) => (
          <FavoriteTool key={id} id={id} icon={icon} title={title} />
        ))}
      </ul>
    </section>
  )
}

export default FavoriteTools
