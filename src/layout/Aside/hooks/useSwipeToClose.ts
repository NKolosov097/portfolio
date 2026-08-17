'use client'

import { type RefObject, useEffect } from 'react'

import {
  clampSwipeTranslateX,
  resolveSwipeAxis,
  shouldCloseOnSwipeEnd,
  type TSwipeAxis,
} from '@/layout/Aside/hooks/swipeGesture'

/** Inline transition applied only while snapping back to rest; drag frames stay transition-free. */
const SNAP_BACK_TRANSITION = 'transform 0.2s ease'

/** Media query used to skip the snap-back animation for visitors who prefer reduced motion. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export interface IUseSwipeToCloseParams {
  /** Element the swipe is read from and dragged via inline `transform`. */
  ref: RefObject<HTMLElement | null>
  /** Called once a swipe crosses the close threshold. */
  onClose: () => void
  /** Gates the listeners; attach only while the panel is actually open. */
  isEnabled: boolean
}

/**
 * Wires touch-driven swipe-to-close onto `ref`: drags it under the finger while a horizontal
 * swipe is in progress, closes past a distance/velocity threshold, otherwise snaps back to rest.
 */
export const useSwipeToClose = ({ ref, onClose, isEnabled }: IUseSwipeToCloseParams): void => {
  useEffect(() => {
    const element = ref.current

    if (!isEnabled || !element) {
      return
    }

    // Clears any leftover drag offset from a previous open/close cycle before this one starts.
    element.style.transform = ''
    element.style.transition = ''

    /** Touch X at gesture start, in viewport px. */
    let startX = 0
    /** Touch Y at gesture start, in viewport px. */
    let startY = 0
    /** `event.timeStamp` at gesture start, used to derive release velocity. */
    let startTime = 0
    /** Axis this gesture has locked onto, or `null` before enough movement to decide. */
    let axis: TSwipeAxis | null = null

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        return
      }

      const [touch] = event.touches

      startX = touch.clientX
      startY = touch.clientY
      startTime = event.timeStamp
      axis = null
      // Stops any in-flight snap-back transition so a re-grab tracks the finger immediately.
      element.style.transition = ''
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        return
      }

      const [touch] = event.touches
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (axis === null) {
        axis = resolveSwipeAxis({ dx, dy })
      }

      if (axis === 'horizontal') {
        event.preventDefault()
        element.style.transform = `translateX(${clampSwipeTranslateX(dx)}px)`
      }
    }

    const endGesture = (event: TouchEvent) => {
      const isHorizontalSwipe = axis === 'horizontal'

      axis = null

      if (!isHorizontalSwipe) {
        return
      }

      const [touch] = event.changedTouches
      const dx = touch.clientX - startX
      const durationMs = event.timeStamp - startTime

      if (shouldCloseOnSwipeEnd({ dx, durationMs, panelWidthPx: element.offsetWidth })) {
        onClose()

        return
      }

      const isReducedMotionPreferred = window.matchMedia(REDUCED_MOTION_QUERY).matches

      if (!isReducedMotionPreferred) {
        element.style.transition = SNAP_BACK_TRANSITION
      }

      element.style.transform = ''
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', endGesture)
    element.addEventListener('touchcancel', endGesture)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', endGesture)
      element.removeEventListener('touchcancel', endGesture)
    }
  }, [ref, onClose, isEnabled])
}
