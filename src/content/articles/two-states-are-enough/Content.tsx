'use client'

import { useTranslation } from 'react-i18next'

import type { IArticleHeadingEntry } from '@/content/articles/registry'

import { ThemeToggleDemo } from './ThemeToggleDemo/ThemeToggleDemo'

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
      <p>{t('articleContent.twoStatesAreEnough.intro1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.intro2')}</p>
      <p>{t('articleContent.twoStatesAreEnough.intro3')}</p>

      <ThemeToggleDemo />

      <h2 id="the-tri-state-toggle-is-implementation-driven-ui">
        {t('articleContent.twoStatesAreEnough.implementationDrivenHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.implementationDriven1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.implementationDriven2')}</p>

      <h2 id="where-two-state-actually-gets-hard">
        {t('articleContent.twoStatesAreEnough.hardPartsHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.hardParts1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.hardParts2')}</p>
      <p>{t('articleContent.twoStatesAreEnough.hardParts3')}</p>

      <h2 id="when-three-states-still-earn-their-keep">
        {t('articleContent.twoStatesAreEnough.whenThreeEarnHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.whenThreeEarn1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.whenThreeEarn2')}</p>

      <p>{t('articleContent.twoStatesAreEnough.closing')}</p>
    </>
  )
}

export default TwoStatesAreEnoughContent
