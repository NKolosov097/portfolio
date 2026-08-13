'use client'

import styles from './Writing.module.css'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Tag } from '@/components/Tag/Tag'
import { Article } from './components/Article/Article'

import { ETabID } from '@/constants/header.constants'
import { writingArticles } from '@/constants/writing.constants'

export const Writing = () => {
  const { t } = useTranslation()

  // A cross-page link (e.g. from /articles) arrives here as a plain `/#writing` URL.
  // Both the browser's native fragment jump and Next's own Link-triggered scroll can
  // fire before this section's final layout settles, landing short of its top edge.
  // Re-run the scroll ourselves once mounted — `scrollIntoView` honors the
  // `scroll-margin-top` set on `.section` in Writing.module.css.
  useEffect(() => {
    if (window.location.hash.slice(1) !== ETabID.writing) {
      return
    }

    document.getElementById(ETabID.writing)?.scrollIntoView()
  }, [])

  if (writingArticles.length === 0) {
    return null
  }

  return (
    <section id={ETabID.writing} className={styles.section}>
      <Tag title={t('headerTabs.writing')} />

      <h2 className="section-header">{t('writing.header')}</h2>

      <ul className={styles.articlesList}>
        {writingArticles.map((article) => (
          <Article key={article.id} {...article} />
        ))}
      </ul>
    </section>
  )
}

export default Writing
