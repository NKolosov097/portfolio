'use client'

import styles from './AdoptionStatsChart.module.css'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/** A single labeled bar in the seniority comparison chart. */
interface IStatBar {
  /** Stable identifier, used as the React key and hover/focus state key. */
  id: string
  /** Locale key for the bar's category label (e.g. "Junior developers"). */
  labelKey: string
  /** Share of that category, as a whole number percentage. */
  value: number
  /** Categorical color for this bar's fill (fixed slot from the palette, not cycled). */
  color: string
}

const BARS: IStatBar[] = [
  {
    id: 'junior',
    labelKey: 'articleContent.aiBoilerplateSeniorEngineers.chartJuniorLabel',
    value: 61,
    color: '#d95926',
  },
  {
    id: 'senior',
    labelKey: 'articleContent.aiBoilerplateSeniorEngineers.chartSeniorLabel',
    value: 34,
    color: '#3987e5',
  },
]

export const AdoptionStatsChart = () => {
  const { t } = useTranslation()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className={styles.card} data-testid="adoption-stats-chart">
      <p className={styles.eyebrow}>{t('articleContent.aiBoilerplateSeniorEngineers.chartEyebrow')}</p>

      <div className={styles.hero}>
        <span className={styles.heroValue}>
          {t('articleContent.aiBoilerplateSeniorEngineers.chartHeroValue')}
        </span>
        <span className={styles.heroCaption}>
          {t('articleContent.aiBoilerplateSeniorEngineers.chartHeroCaption')}
        </span>
      </div>

      <p className={styles.heroSource}>
        {t('articleContent.aiBoilerplateSeniorEngineers.chartHeroSource')}
      </p>

      <hr className={styles.divider} />

      <h3 className={styles.chartTitle}>
        {t('articleContent.aiBoilerplateSeniorEngineers.chartTitle')}
      </h3>

      <ul className={styles.bars}>
        {BARS.map((bar) => {
          const label = t(bar.labelKey)
          const isHovered = hoveredId === bar.id

          return (
            <li key={bar.id} className={styles.barRow}>
              <span className={styles.track}>
                <span
                  className={styles.valueLabel}
                  style={{ bottom: `calc(${bar.value}% + 4px)` }}
                >
                  {bar.value}%
                </span>

                <span
                  className={styles.fill}
                  style={{ height: `${bar.value}%`, backgroundColor: bar.color }}
                />

                <button
                  type="button"
                  className={styles.hitArea}
                  aria-label={`${label}: ${bar.value}%. ${t('articleContent.aiBoilerplateSeniorEngineers.chartTooltipSuffix')}`}
                  onPointerEnter={() => setHoveredId(bar.id)}
                  onPointerLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(bar.id)}
                  onBlur={() => setHoveredId(null)}
                />

                {isHovered && (
                  <span className={styles.tooltip} role="tooltip">
                    <span className={styles.tooltipValue}>{bar.value}%</span> {label.toLowerCase()}{' '}
                    {t('articleContent.aiBoilerplateSeniorEngineers.chartTooltipSuffix')}
                  </span>
                )}
              </span>

              <span className={styles.barLabel}>{label}</span>
            </li>
          )
        })}
      </ul>

      <p className={styles.source}>{t('articleContent.aiBoilerplateSeniorEngineers.chartSource')}</p>
    </div>
  )
}

export default AdoptionStatsChart
