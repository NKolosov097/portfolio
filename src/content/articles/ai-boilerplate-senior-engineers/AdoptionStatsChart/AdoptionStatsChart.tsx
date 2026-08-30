'use client'

import styles from './AdoptionStatsChart.module.css'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** A single labeled bar in the seniority comparison chart. */
interface IStatBar {
  /** Stable identifier, used as the React key and hover/focus state key. */
  id: string
  /** Locale key for the bar's category label (e.g. "Junior developers"). */
  labelKey: string
  /** Locale key for the full tooltip sentence tail that follows "{value}% ". */
  tooltipKey: string
  /** Share of that category, as a whole number percentage. */
  value: number
  /** Categorical color for this bar's fill (fixed slot from the palette, not cycled). */
  color: string
}

const BARS: IStatBar[] = [
  {
    id: 'junior',
    labelKey: 'articleContent.aiBoilerplateSeniorEngineers.chartJuniorLabel',
    tooltipKey: 'articleContent.aiBoilerplateSeniorEngineers.chartJuniorTooltip',
    value: 53,
    color: '#d95926',
  },
  {
    id: 'senior',
    labelKey: 'articleContent.aiBoilerplateSeniorEngineers.chartSeniorLabel',
    tooltipKey: 'articleContent.aiBoilerplateSeniorEngineers.chartSeniorTooltip',
    value: 29,
    color: '#3987e5',
  },
]

export const AdoptionStatsChart = () => {
  const { t } = useTranslation()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const barsRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (hoveredId === null) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !barsRef.current?.contains(event.target)) {
        setHoveredId(null)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [hoveredId])

  return (
    <div className={styles.card} data-testid="adoption-stats-chart">
      <p className={styles.eyebrow}>
        {t('articleContent.aiBoilerplateSeniorEngineers.chartEyebrow')}
      </p>

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

      <ul className={styles.bars} ref={barsRef}>
        {BARS.map((bar) => {
          const label = t(bar.labelKey)
          const tooltipTail = t(bar.tooltipKey)
          const isHovered = hoveredId === bar.id

          return (
            <li key={bar.id} className={styles.barRow}>
              <span className={styles.track}>
                <span className={styles.valueLabel} style={{ bottom: `calc(${bar.value}% + 4px)` }}>
                  {bar.value}%
                </span>

                <span
                  className={styles.fill}
                  style={{ height: `${bar.value}%`, backgroundColor: bar.color }}
                />

                <button
                  type="button"
                  className={styles.hitArea}
                  aria-label={`${label}: ${bar.value}% ${tooltipTail}`}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch') setHoveredId(bar.id)
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'touch') setHoveredId(null)
                  }}
                  onPointerUp={(event) => {
                    if (event.pointerType === 'touch') {
                      setHoveredId((prev) => (prev === bar.id ? null : bar.id))
                    }
                  }}
                  onFocus={() => setHoveredId(bar.id)}
                  onBlur={() => setHoveredId(null)}
                />

                {isHovered && (
                  <span
                    className={styles.tooltip}
                    role="tooltip"
                    style={{ bottom: `calc(${bar.value}% + 46px)` }}
                  >
                    <span className={styles.tooltipValue}>{bar.value}%</span> {tooltipTail}
                  </span>
                )}
              </span>

              <span className={styles.barLabel}>{label}</span>
            </li>
          )
        })}
      </ul>

      <p className={styles.source}>
        {t('articleContent.aiBoilerplateSeniorEngineers.chartSource')}
      </p>
    </div>
  )
}

export default AdoptionStatsChart
