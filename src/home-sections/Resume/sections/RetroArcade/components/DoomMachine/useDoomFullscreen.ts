import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import { lockDoomScreen } from '@/home-sections/Resume/sections/RetroArcade/helpers/lockDoomScreen'

export const useDoomFullscreen = (
  screenRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  toggleRef: RefObject<HTMLButtonElement | null>,
  playRef: RefObject<HTMLButtonElement | null>,
) => {
  const [mode, setMode] = useState<'inline' | 'viewport' | 'native'>('inline')
  const wantsFullscreen = useRef(false)
  const isFullscreen = mode !== 'inline'

  const restoreFocus = useCallback(() => {
    // Stop replaces the HUD with Play, so resolve the destination after React updates the DOM.
    const target = toggleRef.current ?? playRef.current
    target?.focus({ preventScroll: true })
  }, [toggleRef, playRef])

  const exitNative = useCallback(() => {
    if (document.fullscreenElement === screenRef.current) {
      // A browser can refuse exit too; retain the native state until fullscreenchange confirms it.
      void document.exitFullscreen().catch(() => {})
    }
  }, [screenRef])

  const exitFullscreen = useCallback(() => {
    wantsFullscreen.current = false
    if (document.fullscreenElement === screenRef.current) {
      exitNative()
    } else {
      setMode('inline')
    }
  }, [exitNative, screenRef])

  const toggleFullscreen = () => {
    const screen = screenRef.current
    if (!screen) return
    if (wantsFullscreen.current || document.fullscreenElement === screen) {
      exitFullscreen()
      return
    }

    wantsFullscreen.current = true
    setMode('viewport')
    if (typeof screen.requestFullscreen !== 'function') return

    try {
      void screen.requestFullscreen().then(
        () => {
          if (!wantsFullscreen.current) {
            if (document.fullscreenElement === screen) exitNative()
          } else {
            // The promise can settle before fullscreenchange (notably in WebKit).
            setMode(document.fullscreenElement === screen ? 'native' : 'inline')
          }
        },
        () => {
          // The viewport mode already covers missing permission and unsupported devices.
        },
      )
    } catch {
      // Some implementations throw synchronously instead of returning a rejected promise.
    }
  }

  useEffect(() => {
    const screen = screenRef.current
    const handleChange = () => {
      if (screen && document.fullscreenElement === screen) {
        if (wantsFullscreen.current) setMode('native')
        else exitNative()
      } else {
        setMode((current) => (current === 'native' ? 'inline' : current))
      }
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => {
      wantsFullscreen.current = false
      document.removeEventListener('fullscreenchange', handleChange)
      // Use the captured element: React clears refs before effect cleanup on unmount.
      if (screen && document.fullscreenElement === screen) {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [exitNative, screenRef])

  useEffect(() => {
    const screen = screenRef.current
    if (!isFullscreen || !screen) {
      wantsFullscreen.current = false
      return
    }
    const unlock = lockDoomScreen(screen)
    canvasRef.current?.focus({ preventScroll: true })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        exitFullscreen()
      } else if (event.key === 'Tab') {
        const controls = Array.from(
          screen.querySelectorAll<HTMLElement>('canvas[tabindex="0"], button:not(:disabled)'),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    screen.addEventListener('keydown', handleKeyDown, true)
    return () => {
      screen.removeEventListener('keydown', handleKeyDown, true)
      unlock()
      restoreFocus()
    }
  }, [isFullscreen, screenRef, canvasRef, exitFullscreen, restoreFocus])

  return { isFullscreen, isViewport: mode === 'viewport', toggleFullscreen, exitFullscreen }
}
