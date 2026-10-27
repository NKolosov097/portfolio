'use client'

import { useContext, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import styles from './AppearanceToggle.module.css'

import { AppearanceContext } from '@/contexts/appearance'
import { EAppearance } from '@/constants/theme.constants'

const PUMPKIN_AVIF = '/assets/img/halloween/switch-pumpkin.avif'
const PUMPKIN_WEBP = '/assets/img/halloween/switch-pumpkin.webp'

/** Reuses the hero's photographic carving without stretching its natural proportions. */
const PumpkinIcon = () => {
  const shadowLiftId = useId()
  const [src, setSrc] = useState(PUMPKIN_AVIF)
  // Catches decode failures even when the SVG load error occurred before hydration.
  useEffect(() => {
    let isActive = true
    const image = new Image()
    image.src = PUMPKIN_AVIF
    image.decode().catch(() => {
      if (isActive) setSrc(PUMPKIN_WEBP)
    })
    return () => {
      isActive = false
    }
  }, [])
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={styles.pumpkin}
    >
      <defs>
        <filter
          id={shadowLiftId}
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feComponentTransfer>
            <feFuncR type="gamma" amplitude={1} exponent={0.65} offset={0} />
            <feFuncG type="gamma" amplitude={1} exponent={0.65} offset={0} />
            <feFuncB type="gamma" amplitude={1} exponent={0.65} offset={0} />
          </feComponentTransfer>
        </filter>
      </defs>
      <image
        href={src}
        x={0}
        y={-6}
        width={30}
        height={30}
        preserveAspectRatio="xMidYMid meet"
        data-testid="appearance-toggle-pumpkin-body"
        filter={`url(#${shadowLiftId})`}
      />
    </svg>
  )
}

/** Accessible switch that flips the visitor's stored appearance between Halloween and original. */
export const AppearanceToggle = () => {
  const { t } = useTranslation()
  const { appearance, setAppearance } = useContext(AppearanceContext)

  const isHalloween = appearance === EAppearance.halloween

  /** Toggles to the opposite appearance; the provider handles state, attribute and cookie together. */
  const handleClick = () => {
    setAppearance(isHalloween ? EAppearance.original : EAppearance.halloween)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isHalloween}
      aria-label={t('appearance.toggleLabel')}
      className={styles.switch}
      data-testid="appearance-toggle-switch"
      onClick={handleClick}
    >
      <span className={styles.track} data-testid="appearance-toggle-track">
        <span className={styles.thumb}>
          <PumpkinIcon />
        </span>
      </span>
    </button>
  )
}
