'use client'

import { useTranslation } from 'react-i18next'

import { AdoptionStatsChart } from './AdoptionStatsChart/AdoptionStatsChart'

/** This article's section headings, in document order, for the reading-progress rail. */
export const HEADINGS = [
  {
    id: 'what-ai-actually-closes-well',
    labelKey: 'articleContent.aiBoilerplateSeniorEngineers.closesWellHeading',
  },
  {
    id: 'three-decisions-ai-wont-make-for-you',
    labelKey: 'articleContent.aiBoilerplateSeniorEngineers.decisionsHeading',
  },
  {
    id: 'the-real-skill-gap-is-direction-not-typing',
    labelKey: 'articleContent.aiBoilerplateSeniorEngineers.skillGapHeading',
  },
]

export const AiBoilerplateSeniorEngineersContent = () => {
  const { t } = useTranslation()

  return (
    <>
      <p>{t('articleContent.aiBoilerplateSeniorEngineers.intro1')}</p>
      <p>{t('articleContent.aiBoilerplateSeniorEngineers.intro2')}</p>
      <p>{t('articleContent.aiBoilerplateSeniorEngineers.intro3')}</p>

      <AdoptionStatsChart />

      <h2 id="what-ai-actually-closes-well">
        {t('articleContent.aiBoilerplateSeniorEngineers.closesWellHeading')}
      </h2>

      <p>{t('articleContent.aiBoilerplateSeniorEngineers.closesWell1')}</p>
      <p>{t('articleContent.aiBoilerplateSeniorEngineers.closesWell2')}</p>

      <h2 id="three-decisions-ai-wont-make-for-you">
        {t('articleContent.aiBoilerplateSeniorEngineers.decisionsHeading')}
      </h2>

      <p>
        <strong>{t('articleContent.aiBoilerplateSeniorEngineers.decision1Lead')}</strong>{' '}
        {t('articleContent.aiBoilerplateSeniorEngineers.decision1Before')}
        <em>{t('articleContent.aiBoilerplateSeniorEngineers.decision1Em')}</em>
        {t('articleContent.aiBoilerplateSeniorEngineers.decision1After')}
      </p>

      <p>
        <strong>{t('articleContent.aiBoilerplateSeniorEngineers.decision2Lead')}</strong>{' '}
        {t('articleContent.aiBoilerplateSeniorEngineers.decision2Body')}
      </p>

      <p>
        <strong>{t('articleContent.aiBoilerplateSeniorEngineers.decision3Lead')}</strong>{' '}
        {t('articleContent.aiBoilerplateSeniorEngineers.decision3Body')}
      </p>

      <h2 id="the-real-skill-gap-is-direction-not-typing">
        {t('articleContent.aiBoilerplateSeniorEngineers.skillGapHeading')}
      </h2>

      <p>{t('articleContent.aiBoilerplateSeniorEngineers.skillGap1')}</p>
      <p>{t('articleContent.aiBoilerplateSeniorEngineers.skillGap2')}</p>
      <p>{t('articleContent.aiBoilerplateSeniorEngineers.skillGap3')}</p>

      <p>{t('articleContent.aiBoilerplateSeniorEngineers.closing')}</p>
    </>
  )
}

export default AiBoilerplateSeniorEngineersContent
