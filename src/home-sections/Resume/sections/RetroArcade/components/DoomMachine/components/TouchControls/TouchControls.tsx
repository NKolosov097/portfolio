'use client'

import styles from './TouchControls.module.css'

import { type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '@gravity-ui/uikit'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Skull, Hand } from '@gravity-ui/icons'

import {
  DOOM_KEY_UP_ARROW,
  DOOM_KEY_DOWN_ARROW,
  DOOM_KEY_LEFT_ARROW,
  DOOM_KEY_RIGHT_ARROW,
  DOOM_KEY_FIRE,
  DOOM_KEY_USE,
} from '@/home-sections/Resume/sections/RetroArcade/doom/doomConstants'

export interface ITouchControlsProps {
  /** Forwards a DOOM key code transition straight to the running engine, bypassing browser key mapping. */
  onKey: (keyCode: number, isKeyDown: boolean) => void
}

export const TouchControls = ({ onKey }: ITouchControlsProps) => {
  const { t } = useTranslation()

  /** Presses and releases only fire while the same pointer stays on the button — no drag-off double fire. */
  const bindKey = (keyCode: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      onKey(keyCode, true)
    },
    onPointerUp: () => onKey(keyCode, false),
    onPointerCancel: () => onKey(keyCode, false),
  })

  return (
    <div className={styles.touchControls} data-testid="doom-touch-controls">
      <div className={styles.dPad}>
        <button
          type="button"
          aria-label={t('resume.retroArcadeMoveUp')}
          className={styles.dPadUp}
          {...bindKey(DOOM_KEY_UP_ARROW)}
        >
          <Icon data={ArrowUp} size={20} />
        </button>
        <button
          type="button"
          aria-label={t('resume.retroArcadeMoveLeft')}
          className={styles.dPadLeft}
          {...bindKey(DOOM_KEY_LEFT_ARROW)}
        >
          <Icon data={ArrowLeft} size={20} />
        </button>
        <button
          type="button"
          aria-label={t('resume.retroArcadeMoveRight')}
          className={styles.dPadRight}
          {...bindKey(DOOM_KEY_RIGHT_ARROW)}
        >
          <Icon data={ArrowRight} size={20} />
        </button>
        <button
          type="button"
          aria-label={t('resume.retroArcadeMoveDown')}
          className={styles.dPadDown}
          {...bindKey(DOOM_KEY_DOWN_ARROW)}
        >
          <Icon data={ArrowDown} size={20} />
        </button>
      </div>

      <div className={styles.actionButtons}>
        <button
          type="button"
          aria-label={t('resume.retroArcadeUse')}
          className={styles.actionButton}
          {...bindKey(DOOM_KEY_USE)}
        >
          <Icon data={Hand} size={22} />
        </button>
        <button
          type="button"
          aria-label={t('resume.retroArcadeFire')}
          className={styles.actionButtonFire}
          {...bindKey(DOOM_KEY_FIRE)}
        >
          <Icon data={Skull} size={22} />
        </button>
      </div>
    </div>
  )
}

export default TouchControls
