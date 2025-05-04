'use client'

import styles from './Portfolio.module.css'

import { useTranslation } from 'react-i18next'
import { Tag } from '@/components/Tag/Tag'
import { Project } from './components/Project/Project'

import { ETabID } from '@/constants/header.constants'
import { projects } from '@/constants/portfolio.constants'

export const Portfolio = () => {
  const { t } = useTranslation()

  return (
    <section id={ETabID.portfolio} className={styles.section}>
      <Tag title={t('headerTabs.portfolio')} />

      <h2 className="section-header">{t('portfolio.header')}</h2>

      <ul className={styles.projectsList}>
        {projects.map((project) => (
          <Project key={project.id} {...project} />
        ))}
      </ul>
    </section>
  )
}

export default Portfolio
