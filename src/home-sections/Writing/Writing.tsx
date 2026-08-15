'use client'

import styles from './Writing.module.css'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Tag } from '@/components/Tag/Tag'
import { Article } from './components/Article/Article'

import { ETabID } from '@/constants/header.constants'
import { WRITING_ARTICLES } from '@/constants/writing.constants'
import { scrollToLocationHash } from '@/helpers/scrollTo'

export const Writing = () => {
  const { t } = useTranslation()

  // Re-run the #writing scroll after mount; the built-in fragment jump lands short.
  useEffect(() => {
    scrollToLocationHash(ETabID.writing)
  }, [])

  if (WRITING_ARTICLES.length === 0) {
    return null
  }

  return (
    <section id={ETabID.writing} className={styles.section}>
      <Tag title={t('headerTabs.writing')} />

      <h2 className="section-header">{t('writing.header')}</h2>

      <ul className={styles.articlesList}>
        {WRITING_ARTICLES.map((article) => (
          <Article key={article.id} {...article} />
        ))}
      </ul>
    </section>
  )
}

export default Writing
