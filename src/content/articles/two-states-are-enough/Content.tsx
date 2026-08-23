'use client'

import styles from './Content.module.css'

import { useTranslation } from 'react-i18next'

import type { IArticleHeadingEntry } from '@/content/articles/registry'

import { CombinationGrid } from './CombinationGrid/CombinationGrid'
import { LightDarkDemo } from './LightDarkDemo/LightDarkDemo'
import { PatternGallery } from './PatternGallery/PatternGallery'
import { PatternsInTheWild } from './PatternsInTheWild/PatternsInTheWild'

/** This article's section headings, in document order, for the reading-progress rail. */
export const HEADINGS: IArticleHeadingEntry[] = [
  {
    id: 'the-tri-state-toggle-is-implementation-driven-ui',
    labelKey: 'articleContent.twoStatesAreEnough.implementationDrivenHeading',
  },
  {
    id: 'where-two-state-actually-gets-hard',
    labelKey: 'articleContent.twoStatesAreEnough.hardPartsHeading',
  },
  {
    id: 'when-three-states-still-earn-their-keep',
    labelKey: 'articleContent.twoStatesAreEnough.whenThreeEarnHeading',
  },
]

export const TwoStatesAreEnoughContent = () => {
  const { t } = useTranslation()

  return (
    <>
      <p>
        {t('articleContent.twoStatesAreEnough.intro1Before')}
        <a
          href="https://lea.verou.me/blog/2026/dark-mode-toggles/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sourceLink}
        >
          {t('articleContent.twoStatesAreEnough.intro1LinkText')}
        </a>
        {t('articleContent.twoStatesAreEnough.intro1After')}
      </p>
      <p>{t('articleContent.twoStatesAreEnough.intro2')}</p>

      <CombinationGrid />

      <PatternsInTheWild />

      <h2 id="the-tri-state-toggle-is-implementation-driven-ui">
        {t('articleContent.twoStatesAreEnough.implementationDrivenHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.implementationDriven')}</p>

      <p>{t('articleContent.twoStatesAreEnough.lightDarkIntro')}</p>

      <LightDarkDemo />

      <PatternGallery />

      <h2 id="where-two-state-actually-gets-hard">
        {t('articleContent.twoStatesAreEnough.hardPartsHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.hardPartsLead')}</p>
      <ul>
        <li>{t('articleContent.twoStatesAreEnough.hardPartsBullet1')}</li>
        <li>{t('articleContent.twoStatesAreEnough.hardPartsBullet2')}</li>
        <li>{t('articleContent.twoStatesAreEnough.hardPartsBullet3')}</li>
        <li>{t('articleContent.twoStatesAreEnough.hardPartsBullet4')}</li>
      </ul>

      <h2 id="when-three-states-still-earn-their-keep">
        {t('articleContent.twoStatesAreEnough.whenThreeEarnHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.whenThreeEarn')}</p>

      <p>{t('articleContent.twoStatesAreEnough.closing')}</p>
    </>
  )
}

export default TwoStatesAreEnoughContent
