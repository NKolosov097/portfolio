'use client'

import styles from './DoomMachine.module.css'

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '@gravity-ui/uikit'
import { Skull, Xmark, ArrowsExpand } from '@gravity-ui/icons'

import type { DoomEngine } from '@/home-sections/Resume/sections/RetroArcade/doom/doomEngine'
import {
  DOOM_SCREEN_WIDTH,
  DOOM_SCREEN_HEIGHT,
  DOOM_WASM_URL,
  mapBrowserKeyCodeToDoomKeyCode,
} from '@/home-sections/Resume/sections/RetroArcade/doom/doomConstants'
import {
  isCoarsePointerDevice,
  supportsFullscreen,
} from '@/home-sections/Resume/sections/RetroArcade/helpers/doomSupport'
import { TouchControls } from '@/home-sections/Resume/sections/RetroArcade/components/DoomMachine/components/TouchControls/TouchControls'
import type { DoomMachineStatus } from '@/home-sections/Resume/sections/RetroArcade/types/retroArcade.types'

/** Never changes over a session, so subscribing is a no-op — only the client/server snapshot differs. */
const subscribeToNothing = () => () => {}
const getServerCapabilitySnapshot = () => false

export const DoomMachine = () => {
  const { t } = useTranslation()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  /** Holds the running engine outside React state — it's an imperative handle, not render data. */
  const engineRef = useRef<DoomEngine | null>(null)

  const [status, setStatus] = useState<DoomMachineStatus>({ kind: 'idle' })
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Read once via useSyncExternalStore rather than an effect + setState: these browser
  // capabilities never change mid-session, and this avoids a hydration mismatch safely.
  const isTouchDevice = useSyncExternalStore(
    subscribeToNothing,
    isCoarsePointerDevice,
    getServerCapabilitySnapshot,
  )
  const canFullscreen = useSyncExternalStore(
    subscribeToNothing,
    supportsFullscreen,
    getServerCapabilitySnapshot,
  )

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Stops the render loop if the visitor navigates away mid-game — the engine has no other way to know.
  useEffect(() => () => engineRef.current?.stop(), [])

  const handlePlay = async () => {
    setStatus({ kind: 'loading' })

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      setStatus({ kind: 'error', message: t('resume.retroArcadeError') })
      return
    }

    canvas.width = DOOM_SCREEN_WIDTH
    canvas.height = DOOM_SCREEN_HEIGHT
    context.imageSmoothingEnabled = false

    try {
      const { DoomEngine: DoomEngineClass } =
        await import('@/home-sections/Resume/sections/RetroArcade/doom/doomEngine')

      const engine = new DoomEngineClass({
        wasmUrl: DOOM_WASM_URL,
        onFrame: (screen) => {
          // Copies into a plain-ArrayBuffer-backed array: `screen` is a view over WASM linear
          // memory, whose buffer type ImageData's constructor doesn't accept directly.
          const frame = new ImageData(
            new Uint8ClampedArray(screen),
            DOOM_SCREEN_WIDTH,
            DOOM_SCREEN_HEIGHT,
          )
          context.putImageData(frame, 0, 0)
        },
      })

      await engine.start()

      engineRef.current = engine
      setStatus({ kind: 'playing' })
      canvas.focus()
    } catch {
      setStatus({ kind: 'error', message: t('resume.retroArcadeError') })
    }
  }

  const handleStop = () => {
    engineRef.current?.stop()
    engineRef.current = null
    setStatus({ kind: 'idle' })

    if (document.fullscreenElement) {
      void document.exitFullscreen()
    }
  }

  const handleToggleFullscreen = () => {
    const screenElement = screenRef.current
    if (!screenElement) return

    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void screenElement.requestFullscreen()
    }
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    engineRef.current?.sendKey(mapBrowserKeyCodeToDoomKeyCode(event.keyCode), true)
  }

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    engineRef.current?.sendKey(mapBrowserKeyCodeToDoomKeyCode(event.keyCode), false)
  }

  const handleTouchKey = (keyCode: number, isKeyDown: boolean) => {
    engineRef.current?.sendKey(keyCode, isKeyDown)
  }

  return (
    <div
      ref={screenRef}
      className={`${styles.screen} ${isFullscreen ? styles.screenFullscreen : ''}`}
      data-testid="doom-screen"
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        data-testid="doom-canvas"
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      />

      <div className={styles.scanlines} aria-hidden="true" />

      {status.kind === 'idle' && (
        <div className={styles.overlay}>
          <button
            type="button"
            className={styles.playButton}
            onClick={handlePlay}
            data-testid="doom-play-button"
          >
            <Icon data={Skull} size={20} />
            <span>{t('resume.retroArcadePlay')}</span>
          </button>
          <p className={styles.hint}>{t('resume.retroArcadeControlsHint')}</p>
        </div>
      )}

      {status.kind === 'loading' && (
        <div className={styles.overlay}>
          <p className={styles.statusText}>{t('resume.retroArcadeLoading')}</p>
        </div>
      )}

      {status.kind === 'error' && (
        <div className={styles.overlay}>
          <p className={styles.statusText}>{status.message}</p>
          <button type="button" className={styles.retryButton} onClick={handlePlay}>
            {t('resume.retroArcadeRetry')}
          </button>
        </div>
      )}

      {status.kind === 'playing' && (
        <div className={styles.hud}>
          <button
            type="button"
            className={styles.hudButton}
            onClick={handleStop}
            aria-label={t('resume.retroArcadeStop')}
          >
            <Icon data={Xmark} size={16} />
          </button>
          {canFullscreen && (
            <button
              type="button"
              className={styles.hudButton}
              onClick={handleToggleFullscreen}
              aria-label={t('resume.retroArcadeFullscreen')}
            >
              <Icon data={ArrowsExpand} size={16} />
            </button>
          )}
        </div>
      )}

      {status.kind === 'playing' && isTouchDevice && <TouchControls onKey={handleTouchKey} />}
    </div>
  )
}

export default DoomMachine
