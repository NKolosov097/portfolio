'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  clampSwipeTranslateX,
  resolveSwipeAxis,
  shouldCloseOnSwipeEnd,
  type TSwipeAxis,
} from '@/layout/Aside/hooks/swipeGesture'

/** Inline transition applied to the panel only while snapping back to rest. */
const SNAP_BACK_TRANSITION = 'transform 0.2s ease'

/** Inline transition applied to the veil only while it snaps back to fully opaque. */
const VEIL_SNAP_BACK_TRANSITION = 'opacity 0.2s ease'

/** Media query used to skip snap-back animations for visitors who prefer reduced motion. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Gravity UI Drawer's own backdrop element — an ancestor of the panel, not something this hook
 * renders. Its background only reacts to the `open` prop, so without dimming it ourselves it
 * stays fully opaque while the panel is dragged away, hiding the page that should be peeking
 * through. Reaching into this internal class matches the existing pattern in
 * `e2e/aside-ghost.spec.ts`, which already asserts against Gravity UI's `.g-dropdown-menu` /
 * `.g-menu` internals.
 */
const DRAWER_VEIL_SELECTOR = '.g-drawer'

export interface IUseSwipeToCloseParams {
  /** Called once a swipe crosses the close threshold. */
  onClose: () => void
  /** Gates the listeners; attach only while the panel is actually open. */
  isEnabled: boolean
}

/**
 * Wires touch-driven swipe-to-close onto the node passed to the returned ref callback: drags it
 * (and fades the Drawer's veil) under the finger while a horizontal swipe is in progress, closes
 * past a distance/velocity threshold, otherwise snaps both back to rest.
 *
 * Takes a ref callback rather than a `RefObject` on purpose: an animated `Drawer` mounts its
 * content on a later render than the one that flips `isEnabled` (after its own open-transition
 * state settles), and that later mount doesn't re-render this hook's owner. A `RefObject` would
 * leave `useEffect`'s dependency array with nothing to react to, so listeners would never attach.
 * The ref callback fires exactly when the node mounts, regardless of what triggered it.
 */
export const useSwipeToClose = ({
  onClose,
  isEnabled,
}: IUseSwipeToCloseParams): ((node: HTMLElement | null) => void) => {
  /** Holds the mounted node itself; a plain ref so the gesture handlers can mutate its style. */
  const elementRef = useRef<HTMLElement | null>(null)
  /** Bumped by the ref callback so the effect below re-runs once the node actually mounts. */
  const [mountTick, setMountTick] = useState(0)

  const setRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node
    setMountTick((tick) => tick + 1)
  }, [])

  useEffect(() => {
    const element = elementRef.current

    if (!isEnabled || !element) {
      return
    }

    const veilElement = element.closest<HTMLElement>(DRAWER_VEIL_SELECTOR)

    // Clears any leftover drag offset from a previous open/close cycle before this one starts.
    element.style.transform = ''
    element.style.transition = ''

    if (veilElement) {
      veilElement.style.opacity = ''
      veilElement.style.transition = ''
    }

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

      if (veilElement) {
        veilElement.style.transition = ''
      }
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

        const clampedDx = clampSwipeTranslateX(dx)

        element.style.transform = `translateX(${clampedDx}px)`

        if (veilElement) {
          const dragProgress = Math.min(1, Math.abs(clampedDx) / element.offsetWidth)

          veilElement.style.opacity = String(1 - dragProgress)
        }
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

        if (veilElement) {
          veilElement.style.transition = VEIL_SNAP_BACK_TRANSITION
        }
      }

      element.style.transform = ''

      if (veilElement) {
        veilElement.style.opacity = ''
      }
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
  }, [mountTick, onClose, isEnabled])

  return setRef
}
