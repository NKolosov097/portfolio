import { prefersReducedMotion } from './prefersReducedMotion'

interface IAnimateScrollProps {
  /** Element to scroll to; re-measured on every frame so the animation self-corrects. */
  element: HTMLElement
  /** Scroll position, in pixels, at the moment the animation starts. */
  initialPosition: number
  /** Total animation length in milliseconds. */
  duration: number
  /** Extra offset, in pixels, kept above the target (e.g. for a sticky header). */
  paddingFromTop?: number
}

const pow = Math.pow

// The easing function that makes the scroll decelerate over time
function easeOutQuart(x: number) {
  return 1 - pow(1 - x, 4)
}

/** Absolute position of an element's top edge relative to the document. */
export const getElementPosition = (element: HTMLElement) => element.offsetTop

/** rAF handle of the in-flight scroll animation, if any - only one can own the scrollbar at a time. */
let activeAnimationFrame: number | null = null

export function animateScroll({
  element,
  initialPosition,
  duration,
  paddingFromTop = 0,
}: IAnimateScrollProps) {
  // A second scrollTo before the first finishes (fast tab switching) must not fight it for
  // the scrollbar - cancel whatever's still running before taking over.
  if (activeAnimationFrame !== null) {
    window.cancelAnimationFrame(activeAnimationFrame)
    activeAnimationFrame = null
  }

  // respect the user's reduced-motion preference: jump instead of animating
  if (prefersReducedMotion()) {
    window.scrollTo(0, getElementPosition(element) - paddingFromTop)
    return
  }

  let start: number

  function step(timestamp: number) {
    if (start === undefined) {
      start = timestamp
    }

    const elapsed = timestamp - start
    const easedProgress = easeOutQuart(Math.min(elapsed / duration, 1))

    // Re-measure the target and the scroll ceiling on every frame instead of once up front: a
    // font swap or late-loading image can shift the element's position mid-animation, and a
    // stale target would strand the scroll away from where the element actually ended up.
    const maxAvailableScroll =
      document.documentElement.scrollHeight - document.documentElement.clientHeight
    const targetPosition = Math.min(
      getElementPosition(element) - paddingFromTop,
      maxAvailableScroll,
    )

    window.scrollTo(0, initialPosition + (targetPosition - initialPosition) * easedProgress)

    activeAnimationFrame = elapsed < duration ? window.requestAnimationFrame(step) : null
  }

  activeAnimationFrame = window.requestAnimationFrame(step)
}
